/*
Sample code, loosely modified from an actual implementation

It's purposely generic, so that you can loosely modify *this*
 in a manner suited to your own targets
When I've fleshed out the data persistence enough to
 justify pushing it, this will then be updated to track
 properly with the types

*/

import { launch } from 'astral/mod.ts'
import { writeJsonSync } from 'jsonfile/mod.ts'
import { format as formatDate } from 'datetime/mod.ts'
import { getRandomMilliseconds, sleep } from '../../src/utils/scraping.js'
import { flagForbiddenWords } from '../../src/utils/cleanup.js'

const options = { headless: false }
const browser = await launch(options)

const target = '' // YOUR TARGET HERE
const searchLink = new URL(target)

const salaryTarget = 175000
// this is an intentional overshoot for example purposes
// (see other example for more detailed explanation)

const query = 'javascript developer'

const location = 'remote'
const maxAge = 2

// not real examplees
const params = {
  keywords: query,
  salary: salaryTarget,
  location,
  fromage: maxAge,
}

searchLink.search = new URLSearchParams(params)

const page = await browser.newPage(searchLink.href)

// don't run until there's a whole document you can query
// if you run the block below it too fast, you'll be able
//  to get document.body.innerHTML, but not an actual DOM
//  that you can query otherwise
// CAPTCHA detection will also break this if you're too blunt-force
// that said, waitFor will run for a minute before breaking,
//  so you can feasibly also solve it manually in that time

// await page.$('body')

const contentSelector = '' // something indicating that content has rendered
await page.$(contentSelector)

console.log('fetching!')

const getDataFromDirectory = async (currentListings = [], targetURL = '') => {
  // TODO: maybe store the functions in an object,
  //  and pass that into page.eval as an arg?
  // still figuring out how that would work...
  const { nextListings, nextPageURL } = await page.evaluate(
    async (targetPage) => {
      const fetchHTML = (endpoint, options) =>
        fetch(endpoint, options).then((res) => res.text())
      const parseHTML = (html) =>
        new DOMParser().parseFromString(html, 'text/html')

      const getDoc = (e, o) => fetchHTML(e, o).then((res) => parseHTML(res))

      const getDOMQueryResults = (
        selector,
        doc = document,
      ) => [...doc.querySelectorAll(selector)]

      const checkTextContents = (el, text) =>
        el?.innerText.toLowerCase().includes(text)

      const doc = targetPage ? await getDoc(targetPage) : document

      const currentPage = doc.querySelector('') // YOUR QUERY HERE
        ?.innerText ||
        1 // if only one page of results

      console.log(`parsing results for page ${currentPage}...`)

      const contentSelector = ''
      const nextListings = getDOMQueryResults(contentSelector, doc)
        .map((e) => {
          const innerDoc = parseHTML(e.outerHTML)

          const [title, company, location, pay] = [
            // YOUR SELECTORS HERE
          ].map((selector) => innerDoc.querySelector(selector)?.innerText)

          const hiringMultipleCandidates = checkTextContents(
            e,
            'hiring multiple candidates',
          )

          // HTML elements may have custom attributes, and some of them
          //  will correspond to things like IDs used server-side.
          // They're not meaningful to a typical user, but can be leveraged
          //  to do things like:
          //   construct bare retrieval links
          //   get different versions of a listing (or levels of detail)
          //   or check for redirect links to an original listing
          const idAttribute = '' // YOUR QUERY HERE
          const jobID = innerDoc.querySelector('a').getAttribute(idAttribute)

          const retrievalLink = '' // it would look like...
          // `${target}/${somePathName}?${someQueryParam}=${jobID}`

          const results = {
            title,
            company,
            location,
            // jobID,
            retrievalLink,
          }

          // filter out empty optional values
          // this is a little roundabout, vs just using Array.filter,
          //  but [...values].filter().reduce() breaks if filter()
          //  returns an empty set of results, so it's safer
          //  to transform empty values to an empty objects
          //  and reduce those instead
          const optionalResults = Object.entries({
            pay,
            hiringMultipleCandidates,
            easyApply,
          }).map(([k, v]) => v ? { [k]: v } : {})
            .reduce((a, b) => ({ ...a, ...b }))

          return { ...results, ...optionalResults }
        })

      const nextButtonQuery = '' // YOUR QUERY HERE
      const nextPageURL = doc.querySelector(nextButtonQuery)?.href
      if (!nextPageURL) return { nextListings }

      return { nextListings, nextPageURL }
    },
    { args: [targetURL] },
  )

  const entries = [...currentListings, ...nextListings]
  if (!nextPageURL) return entries

  const timeout = getRandomMilliseconds()
  await sleep(timeout)

  try {
    return await getDataFromDirectory(entries, nextPageURL)
  } catch ({ message }) {
    console.error(message)
    return entries
  }
}

const getDetailedResults = async () => {
  const data = await getDataFromDirectory()

  console.log(`Got ${data.length} entries`)
  console.log('Getting details (this could take a while...)')

  for (const result of data) {
    const passesFilters = [
      flagForbiddenWords(result, 'title'),
    ].every((e) => e)

    // only get ones we actually want more data about
    if (!passesFilters) continue

    const timeout = getRandomMilliseconds()
    await sleep(timeout)

    console.log(`getting: ${result.title} at ${result.company}...`)

    try {
      // not a complete implementation -- different query strings may return
      //  different results
      const detailedResults = await page.evaluate(async (retrievalLink) => {
        const fetchHTML = (endpoint, options) =>
          fetch(endpoint, options).then((res) => res.text())
        const parseHTML = (html) =>
          new DOMParser().parseFromString(html, 'text/html')

        const getDoc = (e, o) => fetchHTML(e, o).then((res) => parseHTML(res))

        const getDOMQueryResults = (
          selector,
          doc = document,
        ) => [...doc.querySelectorAll(selector)]

        const doc = await getDoc(retrievalLink)

        // TODO: markdown conversion
        const descriptionSelector = '' // YOUR SELECTOR HERE
        const description = doc.querySelector(descriptionSelector)
          ?.innerHTML

        const companyProfileLink = doc.querySelector(
          '', // YOUR SELECTOR HERE
        )?.href

        const details = Object.entries({
          description,
          companyProfileLink,
        }).map(([k, v]) => v && v.length ? { [k]: v } : {})
          .reduce((a, b) => ({ ...a, ...b }))

        return details
      }, { args: [result.retrievalLink] })

      for (const [k, v] of Object.entries(detailedResults)) result[k] = v
    } catch (e) {
      console.error(e.message)
      result.error = e
    }
  }

  return data
}

/*

preserved for example's sake
but you might prefer to do this on deciding that you're interested,
 instead of taking a bunch of additional time to run this up front
or not -- maybe you want warning ahead of time if a company
 is using Workday :shrug:

*/

const data = await getDetailedResults()

console.log('fetched!')

console.log(`getting redirect links (again, this will take a while...)`)
for (let item of data) {
  const passesFilters = [
    item.description, // this includes the filters from the first pass
    flagForbiddenWords(item, 'details'),
  ].every((e) => e)

  if (!passesFilters) continue

  try {
    const redirectLink = item.retrievalLink.replace('', '')
    await page.goto(redirectLink)

    const originalLink = await page.evaluate(() => document.URL)
      .then((link) => new URL(link))

    // this will avoid capturing things like chrome error pages
    // TODO: it isn't comprehensive though, and specifcially
    //  would need ot also check against URL shorteners
    const isRealRedirectLink = originalLink.host != searchLink.host &&
      originalLink.protocol == 'https'

    const timeout = getRandomMilliseconds()
    await sleep(timeout)

    if (isRealRedirectLink) item.originalLink = originalLink.href
  } catch ({ message }) {
    console.error(message)
  }
}

const formattedDate = formatDate(new Date(), 'MM-dd-yyyy')

writeJsonSync(`./data/test/${formattedDate}.json`, data, { spaces: 2 })

await browser.close()
