import 'dotenv/load'
import { delay } from 'async/delay'
import {
  getRandomMilliseconds,
  setupBrowser,
  fetchHTML,
  getDOMQueryResults,
  parseHTML,
} from '../../src/utils/scraping.js'
// NOTE: these don't all *have* to be run server-side
// you can also pass the data back into Astral
//  and just leverage a full DOM with `Page.evaluate`

import { PaginatedList } from '../../crawlers/CrawlerBase.ts'

interface SearchFields {
  query: String
  location: String
  // maxAge: Number
  // targetSalary: Number
}

// stuff that will, or at least might, be there at top level
interface BasicJobMetadata {
  name: String
  company: String // should actually be an ID, but for now...
  retrievalLink: String
  pay?: String // see types for notes on this
}

// stuff hidden behind a specific page
interface DetailedJobMetadata {
  description: String
  // pay?: string
}

// TODO:
// type SimplifiedResult = 

export class ListSample extends PaginatedList {
  static name = 'Momster'
  static baseURL = 'https://www.momster.mom'
  static searchPageEndpoint = `${ListSample.baseURL}/jobs`

  static DOMSelectors = {
    resultsPage: {
      nextPageLink: '#nextPage',
      result: 'li.card',
      title: '.jobTitle',
      company: '.companyName',
      location: '.location',
      pay: '.pay',
    },
    detailPage: {
      description: '#jobDescriptionText',
      pay: '#salaryInfoAndJobType span',
      companyProfile: '[data-testid="inlineHeader-companyName"] a',
      applyLinkContainer: '.applyButtonLinkContainer',
    },
  }

  // static DOMAttributes ?

  constructor(retrievalDate = new Date(), searchParams, browserOptions) {
    super(retrievalDate, searchParams, browserOptions)
    
    const location = Deno.env.get('SEARCH_LOCATION') || 'Remote'

    const remote = !location ||
      location.toLowerCase() == 'remote'

    this.retrievalDate = retrievalDate

    const defaultParams = {
      minSalary: Deno.env.get('SEARCH_MIN_SALARY'),
      searchTerms: Deno.env.get('SEARCH_TERMS'),
      location,
      remote,
      maxAge: Deno.env.get('SEARCH_MAX_AGE'),
    }

    this.searchParams = searchParams || defaultParams
    this.browserOptions = browserOptions

    // crawlerOptions: merge details if record exists, vs skip
  }

  // browser automation only
  async navigateToJobResults() {
    console.log('start!')
    const browser = await setupBrowser()

    const {
      searchTerms,
      minSalary,
      maxAge,
      location
    } = this.searchParams
    
    const searchURL = new URL(ListSample.searchPageEndpoint)

    const query = {
      searchTerms,
      minSalary,
      location,
      maxAge,
    }

    // TODO: fix typing
    searchURL.search = new URLSearchParams(query)//.toString()

    const page = await browser.newPage(searchURL.origin, { waitUntil: 'load' })
    // if (detectAuthWall) dosomething...
    console.log('arrived at homepage')

    // TODO: replace rng when `@std/random` stabilizes
    const interval = getRandomMilliseconds(45, 15)
    console.log(`waiting ${interval / 1000} seconds...`, '\n')
    await delay(interval)

    console.log('Running search...', '\n')
    await page.goto(searchURL.href)

    // if (detectAuthWall) dosomething...

    return page
  }

  // ASK: can I put interfaces or types on the class itself,
  //  or do I have to export those separately?
  
  // browser automation only
  // TODO: move to parent class?
  async crawlJobSearchResults(maxRetries = 10) {
    const page = await this.navigateToJobResults()
    const rawResults = await this.fetchJobResults(page)

    const results = rawResults.flatMap(html => this.parseJobResults(html))

    const filteredResults = this.filterJobResults(results)

    const taggedResults = await this.tagSavedJobResults(filteredResults)

    const getOutput = (results) => {
      const {
        jobs,
        companies,
        source
      } = this.cleanupJobsData(results)
      
      return  { jobs, companies, source }
    }

    this.writeResultsToJSON(getOutput(filteredResults))

    console.log('Getting details...', '\n')

    // TODO: optionally, validate redirect links
    const detailedResults = await this.fetchAllJobDetailPages(
      taggedResults, {
        maxRetries,
        page
    })

    this.writeResultsToJSON(getOutput(detailedResults))
  }

  // scraping methods
  // these take a `page` argument
  // referencing the object from `astral`

  // if `page` is missing, it's assumed to be
  //  running in a browser extension
  async fetchJobResults(page) {
    console.log('Getting initial results...', '\n')

    const pages = []

    // TODO: handle this later
    // const isExtension = Boolean(!page)

    // run doc query directly if extension
    let pageContents = await page
      .evaluate(() => document.body.innerHTML)

    pages.push(pageContents)

    // attempt to use browser document if running in extension
    let doc = parseHTML(pageContents)
    // let doc = document || parseHTML(pageContents)

    let pageNumber = 1

    let nextPageURL = this.getNextPageURL(doc)

    while (nextPageURL) {
      // const interval = getRandomMilliseconds(150, 30)
      const interval = getRandomMilliseconds(40, 10)
      console.log(`waiting ${interval / 1000} seconds...`, '\n')

      await delay(interval)

      pageNumber++
      console.log(`getting results for page ${pageNumber}...`)

      try {
        // pageContents = await fetchHTML(nextPageURL)

        await page.goto(nextPageURL)

        const pageContents = await page
          .evaluate(() => document.body.innerHTML)

        // console.log({ pageContents })

        // await Deno.writeTextFile('./testData.html', pageContents)

        pages.push(pageContents)
        
        doc = parseHTML(pageContents)
        
        // TODO: break this out
        //  might be a next button, might be a link to fetch against
        nextPageURL = this.getNextPageURL(doc)
      } catch(e) {
        console.error(e)
        console.error("couldn't get next page", '\n')
        break
      }
    }

    return pages
  }

  // parse a single page of results
  // NOTE: this has no real target (yet)
  parseJobResults(html) {
    const {
      resultsPage: queries,
    } = ListSample.DOMSelectors

    const outerDoc = parseHTML(html)

    const { result: resultSelector } = queries

    return getDOMQueryResults(resultSelector, outerDoc)
      .map((e) => {
        const doc = parseHTML(e.outerHTML)

        const { title: titleSelector } = queries
        const title = doc.querySelector(titleSelector)
          ?.getAttribute('title')

        const {
          company: companySelector,
          location: locationSelector,
          pay: paySelector,
          summary: summarySelector,
        } = queries

        const innerTextSelectors = [
          companySelector,
          locationSelector,
          paySelector,
        ]

        const [company, location, pay] = innerTextSelectors
          .map((s) => doc.querySelector(s)?.innerText)

        const summary = getDOMQueryResults(summarySelector, doc)
          ?.map((e) => e.innerText).join('\n\n')

        const retrievalLink = doc.querySelector('a')
          ?.getAttribute('href')

        const results = {
          title,
          company,
          location,
          retrievalLinks: [retrievalLink],
          summary,
        }

        const optionalResults = Object.entries({
          pay,
          // hiringMultipleCandidates,
          // easyApply,
        }).map(([k, v]) => v ? { [k]: v } : {})
          .reduce((a, b) => ({ ...a, ...b }))
        // TODO: check if @std offers this operation anywhere

        return { ...results, ...optionalResults }
      })
  }

  filterJobResults(results) {
    return super.filterJobResults(results, ListSample.baseURL)
  }

  async fetchAllJobDetailPages(data, { maxRetries = 10, page }) {
    return super.fetchAllJobDetailPages(data, {
      page,
      maxRetries,
      parseFn: this.parseJobDetails
    })
  }

  // extension or automation
  parseJobDetails(html) {
    const doc = parseHTML(html)

    const {
      detailPage: queries,
    } = ListSample.DOMSelectors

    const {
      description: decriptionSelector,
      companyProfile: companySelector,
      applyLinkContainer: applyLinkContainerSelector,
    } = queries
    const description = doc.querySelector(decriptionSelector)
      ?.innerHTML

    //   let pay = doc.querySelector('#salaryInfoAndJobType span')?.innerText
    //   if (!pay?.includes('$')) pay = ''

    // this probably isn't of real use, since these are
    //  mostly pretty generic
    // const benefits = getDOMQueryResults('#benefits li', doc)
    //   ?.map((e) => e.innerText)

    const companyProfileLink = doc.querySelector(companySelector)
      ?.href

    // self-reports as a redirect
    const isRedirect = doc.querySelector(applyLinkContainerSelector)
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

  // util
  // TODO: default param as Document?
  //  maybe split some of this across extension vs automation
  // also, parent class?
  getNextPageURL(doc) {
    const { nextPageLink: selector } = ListSample.DOMSelectors.resultsPage
    const endpoint = doc.querySelector(selector)
      ?.getAttribute('href')?.replace('/', '')

    if (!endpoint) return null
    
    return `${ListSample.baseURL}/${endpoint}`
  }

  // util
  cleanupJobsData(data) {
    const companies = [...new Set(data.map((r) => r.company))]
      .map((c) => {
        const { companyProfileLink: link } = data
          .find((r) => r.company == c)

        return { name: c, link }
      })

    const jobs = data.map((r) => {
      const {
        title,
        company,
        location,
        retrievalLinks,
        pay,
        summary,
        description,
        // easyApply
      } = r

      // FIXME: filter these down
      const optionalResults = {
        pay,
        summary,
        description,
        // easyApply
      }

      return {
        title,
        company,
        location,
        ...optionalResults,
        retrievalLinks
      }
    })

    const { retrievalDate, searchParams } = this

    const source = {
      name: 'momster',
      retrievalDate,
      searchParams,
    }

    return { companies, jobs, source }
  }
}
