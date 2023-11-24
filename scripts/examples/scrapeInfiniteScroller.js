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

const query = 'javascript developer'

const location = 'United States'
const maxAge = 2
const salaryTarget = 175000
// this is an intentional overshoot for example purposes
// specifically, you *do* want to set up filters before doing
//  something like this, because you don't want to hit a
//  target site too aggressively (or spend an extraneous
//  amount of time every time you run this)

const scrambledParams = {
  // this could be any of a variety of things
  // these won't always have clearly named properties,
  //  and the values may just be choices from a <select> tag,
  //  whose <option>s then correspond to the real values
}

const params = { keywords: query, location, ...scrambledParams }

searchLink.search = new URLSearchParams(params)

const page = await browser.newPage(searchLink.href)

// something indicating that content has rendered
const contentSelector = ''
await page.$(contentSelector)

console.log('fetching!')

const handleInfiniteScroll = async () => {
  const totalResults = await page.evaluate(() => {
    const countSelector = '' // YOUR SELECTOR HERE
    const countQuery = document.querySelector(countSelector)
    return Number(countQuery.innerText)
  })

  const countLoadedResults = async () =>
    await page
      .evaluate(() =>
        [...document.querySelectorAll('main#main-content li > div')].length
      )

  let loadedResults = await countLoadedResults()

  while (loadedResults < totalResults) {
    // TODO: also check for any visible element indicating
    //  that you've seen all avaliable results

    await page.evaluate(() => {
      const getMoreButton = document.querySelector(
        '', // YOUR QUERY HERE
      )

      getMoreButton.checkVisibility()
        ? getMoreButton.click()
        : window.scrollTo(0, document.body.scrollHeight)
    })

    await sleep(getRandomMilliseconds())

    loadedResults = await countLoadedResults()

    console.log({ loadedResults, totalResults })
  }

  await sleep(getRandomMilliseconds())
}

// TODO: maybe store the functions in an object,
//  and pass that into page.eval as an arg?
const getDataFromDirectory = async () => {
  // TODO: client side occlusion handling
  // if the page ever starts *removing* items from the list
  //  for performance reasons, you need to start storing
  //  results to process later
  // an easy way would be to just map over the list
  //  with each run, check for any diffs,
  //  and return the `outerHTML` of each
  // I mostly haven't done this already bc I just haven't
  //  run into it yet myself
  await handleInfiniteScroll()

  console.log('all results loaded')

  const data = await page
    .evaluate(async () => {
      const parseHTML = (page) =>
        new DOMParser().parseFromString(page, 'text/html')
      const getDOMQueryResults = (
        selector,
        doc = document,
      ) => [...doc.querySelectorAll(selector)]

      return getDOMQueryResults('main#main-content li > div', doc)
        .map((e) => {
          const innerDoc = parseHTML(e.outerHTML)

          const [title, company, location, pay] = [
            // YOUR SELECTORS HERE
          ].map((selector) =>
            innerDoc.querySelector(selector)?.innerText.trim()
          )

          const [
            retrievalLink,
            companyProfileLink,
          ] = [
            // YOUR SELECTORS HERE
          ].map((selector) => {
            const a = document.querySelector(selector)
            const link = new URL(a)
            link.search = ''

            return link.toString()
          })

          const postedDate = innerDoc.querySelector('time')?.dateTime

          const results = {
            title,
            company,
            location,
            retrievalLink,
          }

          const optionalResults = Object.entries({
            pay,
            companyProfileLink,
            postedDate,
          }).map(([k, v]) => v ? { [k]: v } : {})
            .reduce((a, b) => ({ ...a, ...b }))

          return { ...results, ...optionalResults }
        })
    }) //, { args: [] })

  return data
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

    // let's not get ourselves rate limited, shall we?
    const timeout = getRandomMilliseconds()
    await sleep(timeout)

    console.log(`getting: ${result.title} at ${result.company}...`)

    try {
      const detailedResults = await page.evaluate(async (retrievalLink) => {
        const fetchHTML = (endpoint, options) =>
          fetch(endpoint, options).then((res) => res.text())
        const parseHTML = (html) =>
          new DOMParser().parseFromString(html, 'text/html')

        const getDoc = (e, o) => fetchHTML(e, o).then((res) => parseHTML(res))

        const doc = await getDoc(retrievalLink)

        // TODO: markdown conversion
        const description = doc.querySelector('section.description > div')
          ?.innerHTML

        const comment = doc.querySelector('#applyUrl')
          ?.firstChild.textContent

        const redirectLink = comment &&
          new URL(comment.slice(1, comment.length - 2))
            .searchParams.get('url').replaceAll('\\u002d', '')

        const details = Object.entries({
          description,
          // benefits,
          // companyProfileLink,
          redirectLink,
        }).map(([k, v]) => v && v.length ? { [k]: v } : {})
          .reduce((a, b) => ({ ...a, ...b }))

        return details
      }, { args: [result.retrievalLink] })

      for (const [k, v] of Object.entries(detailedResults)) result[k] = v
    } catch (e) {
      // TODO: figure out why this isn't coming up as e.*message*
      //  like in browsers
      console.error(e.text)
      result.error = e
    }
  }

  return data
}

const data = await getDetailedResults()

console.log('fetched!')

const formattedDate = formatDate(new Date(), 'MM-dd-yyyy')

writeJsonSync(`./data/test/${formattedDate}.json`, data, { spaces: 2 })

await browser.close()
