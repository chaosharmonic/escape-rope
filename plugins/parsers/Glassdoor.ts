import { getDOMQueryResults, parseHTML } from '../../src/utils/scraping'

// const baseURL = 'https://www.glassdoor.com'

// TODO: some kind of normalization of selectors

// totalResults, loadedResults(?) for infinite scrolls
// nextPageLink || nextPageButton for pagination

const DOMSelectors = {
  resultsPage: {
    result: 'ul[aria-label="Jobs List"] li[data-test="jobListing"]',
    title: 'a',
    company: 'span',
    location: 'emp-location', // partial
    pay: 'detailSalary', // partial
    summary: 'descSnippet', // partial
  },
  detailPage: {
    description: '.description__text section div',
    pay: '.compensation__salary',
  },
}

export const parseJobResultsPage = (html) => {
  const doc = parseHTML(html)

  const { resultsPage: queries } = DOMSelectors

  return getDOMQueryResults(queries.result, doc)
    .filter(({ classList }) =>
      [...classList].some((c) => c.includes('JobsList')) &&
      [...classList].every((c) => !c.includes('noop'))
    )
    .map((li) => {
      const [location, payDetails, summary] = [
        queries.location,
        queries.pay,
        queries.summary,
      ].map((q) => li.querySelector(`[data-test="${q}"]`)?.innerText)

      const providedRange = payDetails?.toLowerCase()
        .includes('employer')

      const pay = providedRange &&
        payDetails.split('(').at(0).trim()

      const company = li.querySelector(queries.company)
        ?.innerText

      const a = li.querySelector(queries.title)
      const { innerText: title } = a

      const retrievalLink = a.getAttribute('href')

      const results = {
        title,
        company,
        location,
        retrievalLinks: [retrievalLink],
      }

      const optionalResults = Object.entries({
        pay,
        summary,
      }).map(([k, v]) => Boolean(v) ? { [k]: v } : {})
        .reduce((a, b) => ({ ...a, ...b }))

      return { ...results, ...optionalResults }
    })
}

export const parseJobDetailsPage = (html) => {
  const { detailPage: queries } = DOMSelectors

  const doc = parseHTML(html)

  let description = doc.querySelector(queries.description)
    ?.innerHTML

  // description &&= await html2md(description)

  // ...other metadata?

  // secondary check for pay ranges, to fill in on detailed pulls
  //  if this isn't specified at the top level
  const pay = doc.querySelector(queries.pay)
    ?.innerText.trim()

  // const redirectLink =

  const details = Object.entries({
    description,
    pay,
  }).map(([k, v]) => Boolean(v) ? { [k]: v } : {})
    .reduce((a, b) => ({ ...a, ...b }))
  // TODO: `filterValues`

  return details
}
