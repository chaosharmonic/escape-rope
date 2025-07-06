import { getDOMQueryResults, parseHTML } from '../../src/utils/scraping.js'

// TODO: handle typing for available outputs

const baseURL = 'https://builtin.com'

const DOMSelectors = {
  resultsPage: {
    nextPageLink: 'a[aria-label="Go to Next Page"]',
    result: '[data-id="job-card"]',
    title: 'h2 a',
    companyName: 'a span',
    icons: {
      date: 'clock',
      location: 'location-dot',
      remote: 'signal-stream',
      hybrid: 'house-building',
      employees: 'user-group',
      pay: 'sack-dollar',
      seniority: 'trophy',
    },
  },
  detailPage: {
    mainContents: '[x-data="jobPost"]',
    description: '.html-parsed-content',
    // pay,
    // companyProfile,
    applyLink: 'a[aria-label="Apply to job"]',
  },
}

export const getNextPageURL = (html) => {
  const doc = parseHTML(html)

  const { nextPageLink: selector } = DOMSelectors.resultsPage
  const endpoint = doc?.querySelector(selector)
    ?.getAttribute('href')?.replace('/', '')

  if (!endpoint) return null

  return `${baseURL}/${endpoint}`
}

export const parseJobResultsPage = (html) => {
  const { resultsPage: queries } = DOMSelectors

  const doc = parseHTML(html)

  const jobs = getDOMQueryResults(queries.result, doc)

  // get basic company details
  //  these can be assumed to exist, so we can just destructure them directly
  return jobs.map((j) => {
    const { innerText: title } = j
      ?.querySelector(queries.title)
    const { innerText: companyName } = j
      ?.querySelector(queries.companyName)

    const [retrievalLink, companyLink] = ['h2 a', 'a'].map((s) => {
      const endpoint = j?.querySelector(s)?.getAttribute('href')?.replace(
        '/',
        '',
      )

      return `${baseURL}/${endpoint}`
    })

    // TODO: handle remote/hybrid fields better
    const details = Object.entries(queries.icons)
      .map(([k, v]) => {
        const val = j?.querySelector(`.fa-${v}`)
          ?.parentElement
          ?.nextElementSibling
          ?.innerText

        return { [k]: val }
      })
      .filter((e) => Boolean(e))
      .reduce((a, b) => ({ ...a, ...b }))
    // TODO: replace with filterValues

    const [, industries, summary] = [
      ...j?.querySelector('.row')
        ?.nextElementSibling
        ?.firstElementChild
        ?.children,
    ].map(({ innerText: i }) => i)

    const company = {
      name: companyName.trim(),
      link: companyLink,
      industries: industries.split(' • '),
    }

    // TODO: this isn't quite structured right; details also
    //  includes some company info
    return {
      title,
      retrievalLinks: [retrievalLink],
      summary,
      company: company.name,
      ...details,
    }
  })
}

export const parseJobDetailsPage = (html) => {
  const doc = parseHTML(html)

  const {
    detailPage: queries,
  } = DOMSelectors

  const mainContents = doc?.querySelector(queries.mainContents)
    ?.firstElementChild?.lastElementChild?.firstElementChild

  const postBody = mainContents?.querySelector(queries.description)
  const description = postBody?.innerHTML

  // this would indicate some kind of response other than useful HTML
  if (!description) throw new Error('failed to get description')

  const redirectLink = doc?.querySelector(queries.applyLink)
    ?.getAttribute('href')

  const skillsContainer = [...mainContents?.querySelectorAll('div')]
    ?.find((div) => div.innerText == 'Top Skills')
    ?.nextElementSibling

  const topSkills = [...skillsContainer?.children]
    ?.map((n) => n.innerText)

  // const officeContainer = mainContents?.querySelector('.overview-offices-body')
  // const officeDetails = [...officeContainer?.querySelectorAll('p')]
  //   .map(p => p.innerText.trim()).join('\n\n')

  // const bioContainer = officeContainer?.parentElement.previousElementSibling.firstElementChild

  // const companyBio = [...bioContainer?.children]
  // ?.slice(0,4)
  // .map(n => `${n.tagName == 'H2' ? '## ' : ''}${n.innerText}`)
  // .join('\n\n')

  return {
    description,
    topSkills,
    redirectLink,
    // company: {
    //   bio: companyBio,
    //   officeDetails
    // }
  }
}

// cleanupJobsData here?
