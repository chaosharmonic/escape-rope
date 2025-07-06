import { getDOMQueryResults, parseHTML } from '../../src/utils/scraping'

const baseURL = 'https://www.indeed.com'
// const searchPageEndpoint = `${baseURL}/jobs`

const DOMSelectors = {
  resultsPage: {
    nextPageLink: '[data-testid="pagination-page-next"]',
    result: '.cardOutline',
    title: '.jobTitle span',
    company: '[data-testid="company-name"]',
    location: '[data-testid="text-location"]',
    summary: '[data-testid="jobsnippet_footer"] li',
    pay: '.salary-snippet-container>div',
  },
  detailPage: {
    description: '#jobDescriptionText',
    pay: '#salaryInfoAndJobType span',
    companyProfile: '[data-testid="inlineHeader-companyName"] a',
    applyLinkContainer: '.applyButtonLinkContainer',
  },
}

// getNextPageLink

export const parseJobResultsPage = (html) => {
  const { resultsPage: queries } = DOMSelectors

  const doc = parseHTML(html)

  return getDOMQueryResults(queries.result, doc)
    .map((el) => {
      const title = el.querySelector(queries.title)
        ?.getAttribute('title')

      const innerTextSelectors = [
        queries.company,
        queries.location,
        queries.pay,
      ]

      const [company, location, pay] = innerTextSelectors
        .map((s) => el.querySelector(s)?.innerText)

      const summary = getDOMQueryResults(queries.summary, el)
        ?.map((e) => e.innerText).join('\n\n')

      const jobID = el.querySelector('a')
        ?.getAttribute('data-jk')

      // link to masked page containing additional details
      const retrievalLink = `${baseURL}/viewjob?jk=${jobID}`

      const results = {
        title,
        company,
        location,
        retrievalLinks: [retrievalLink],
    }
    
    const optionalResults = Object.entries({
        summary,
        pay,
        // hiringMultipleCandidates,
        // easyApply,
      }).map(([k, v]) => v ? { [k]: v } : {})
        .reduce((a, b) => ({ ...a, ...b }))
      // TODO: replace with `filterValues`

      return { ...results, ...optionalResults }
    })
}

export const parseJobDetailsPage = (html) => {
  const doc = parseHTML(html)

  const {
    detailPage: queries,
  } = DOMSelectors

  const description = doc.querySelector(queries.description)
    ?.innerHTML

  // let pay = doc.querySelector('#salaryInfoAndJobType span')
  // ?.innerText
  // if (!pay?.includes('$')) pay = ''

  // this probably isn't of real use,
  // since these are
  //  mostly pretty generic
  // const benefits = getDOMQueryResults('#benefits li', doc)
  //   ?.map((e) => e.innerText)

  const companyProfileLink = doc.querySelector(queries.companyProfile)
    ?.getAttribute('href')

  // self-reports as a redirect
  const isRedirect = doc.querySelector(queries.applyLinkContainer)
    ?.innerText
    ?.includes('company site')

  return Object.entries({
    description,
    // pay,
    // benefits,
    companyProfileLink,
    isRedirect,
  }).map(([k, v]) => v?.length ? { [k]: v } : {})
    .reduce((a, b) => ({ ...a, ...b }))
  // TODO: can I filter this using the stdlib?
}
