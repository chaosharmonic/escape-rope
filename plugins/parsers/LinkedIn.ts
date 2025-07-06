import { getDOMQueryResults, parseHTML } from '../../src/utils/scraping'

// baseURL here?

const DOMSelectors = {
  resultsPage: {
    nextPageLink: '#nextPage',
    result: 'main#main-content li > div',
    title: 'h3',
    company: 'h4',
    location: '.job-search-card__location',
    pay: '.job-search-card__salary-info',
    postedDate: 'time',
  },
  detailPage: {
    description: '.description__text section div',
    contact: '.message-the-recruiter',
    contactName: 'h3',
    contactHeader: 'h4',
    contactProfile: 'a',
    pay: '.compensation__salary',
    companyProfile: '[data-testid="inlineHeader-companyName"] a',
    redirectLink: '#applyUrl',
  },
}

// countLoadedResults

// getTotalResults

// checkForViewedAllMessage

export const parseJobResultsPage = (html) => {
  const { resultsPage: queries } = DOMSelectors

  const doc = parseHTML(html)

  return getDOMQueryResults('main#main-content li > div', doc)
    .map((el) => {
      const [title, company, location, pay] = [
        queries.title,
        queries.company,
        queries.location,
        queries.pay,
      ].map((selector) =>
        el.querySelector(selector)
          ?.innerText.trim()
      )

      const [
        retrievalLink,
        companyProfileLink,
      ] = getDOMQueryResults('a', el).map((a) => {
        // `deno-dom` doesn't have `href` as a direct property yet
        // the next 2 lines could just be `href` otherwise
        const href = a.getAttribute('href')
        const link = new URL(href)
        link.search = ''

        return link.toString()
      })

      const postedDate = el.querySelector(queries.postedDate)
        ?.dateTime

      const results = {
        title,
        company,
        location,
        retrievalLinks: [retrievalLink],
        // summary
      }

      const optionalResults = Object.entries({
        pay,
        companyProfileLink,
        postedDate,
      }).map(([k, v]) => Boolean(v) ? { [k]: v } : {})
        .reduce((a, b) => ({ ...a, ...b }))
      // TODO: see indeed

      return { ...results, ...optionalResults }
    })
}

export const parseJobDetailsPage = (html) => {
  const { detailPage: queries } = DOMSelectors

  const doc = parseHTML(html)

  let description = doc.querySelector(queries.description)
    ?.innerHTML

  const contact = doc.querySelector(queries.contact)

  const [contactName, contactHeader] = [
    queries.contactName,
    queries.contactHeader,
  ].map((tag) => contact?.querySelector(tag)?.innerText.trim())

  const contactProfile = contact
    ?.querySelector(queries.contactProfile)
    ?.getAttribute('href')

  const notes = [contactHeader].filter((e) => e)

  const hiringManager = contact && {
    name: contactName,
    linkedIn: contactProfile,
    notes,
  }

  // TODO:
  // flesh this out
  // determine if these are consistent fields or not
  // const otherMetadata = getDOMQueryResults('.description__job-criteria-item', doc)
  //   ?.map(li => {
  //     const [ field, value ] = [ 'h3', 'span' ]
  //       .map(e => li.querySelector(e)?.innerText)
  //     return { [ field ]: value }
  //   })

  // secondary check for pay ranges, to fill in on detailed pulls
  //  if this isn't specified at the top level
  const pay = doc.querySelector(queries.pay)
    ?.innerText.trim()

  const comment = doc.querySelector(queries.redirectLink)
    ?.firstChild.textContent.replaceAll('"', '')

  const redirectLink = URL.parse(comment)
    ?.searchParams.get('url')

  const details = Object.entries({
    description,
    pay,
    // benefits,
    redirectLink,
    hiringManager,
    // otherMetadata
  }).map(([k, v]) => Boolean(v) ? { [k]: v } : {})
    .reduce((a, b) => ({ ...a, ...b }))
  // TODO: update the above

  return details
}
