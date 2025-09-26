import { delay } from 'async/delay'
import { filterValues } from 'collections/'
import { ensureDirSync } from 'fs/'
import { writeJsonSync } from 'jsonfile/mod.ts'
import {
  getRandomMilliseconds,
  setupBrowser
} from '../../src/utils/scraping.js'
import { getAllJobs } from '../../src/controller/job.ts'
import { html2md } from '../../src/utils/cleanup.js'
import { getSettings } from '../../src/controller/settings.ts'

// TODO: add some structure for setting up data types
// expected and optional details

const settings = await getSettings()
  .then(r => r?.value)

// NOTE:
// undecided on whether this will stay here
// its predecessor was a utility function, but at the
//  time it was only being used for the crawlers anyway
// could move back if that changes
const checkBlocklist = (job, section) =>{
  // TODO: see every other note about updating this
  const campaign = settings.campaigns.at(0)

  const blocklist = [settings.blocklist, campaign.blocklist]
    .reduce((a = {}, b = {}) => {
      for (let key of Object.keys(a)) {
        b[key].push(...a[key])
      }

      return b
    })

  return blocklist[section].every((w) => {
    const target = section == 'global'
    ? JSON.stringify(job)
    : job[section]

    const [ text, source ] = [ w, target ]
      .map(str => str
        ?.toLowerCase()
        ?.replace(/\W/g, ' '))

    return !source.includes(text)
      && !source.split(' ').includes(text)
  })
}

// WIP
export class CrawlerBase {
  constructor(
    retrievalDate = new Date(),
    searchParams = {},
    browserOptions = {}
    // TODO: crawler options... auto-upload, request type, etc
  ) {
    this.retrievalDate = retrievalDate
    this.searchParams = searchParams
    // this.browserOptions = browserOptions
    // this.userSettings = settings // TODO: handle filters
  }

  // TODO: this actaully should be a util for server-side use
  //  (but for now it's probably fine)
  detectDuplicateJob(job, data) {
    // const options = {
      // TODO: strict field checking?
    // }

    // NOTE: `job` is assumed to be a collected result, not
    //  already merged and stored in a db
    const [ retrievalLink ] = job.retrievalLinks
    
    return data.find((e) => {
      // get bare list of URLs, either from simplified results
      //  such as mid-scraping run, or from merged ones
      //  stored in a db
      const links = e.sources?.map(s => s.retrievalLink)
        ?? e.retrievalLinks
        ?? []

      // this assumes you're sanitizing links to avoid things
      //  like unique session IDs
      if (links.includes(retrievalLink)) return true

      // TODO: finish implementing this
      // check that pay ranges match, only if it exists on both
      const payMatches = !(e.pay && job.pay) || (
        e.pay.type == job.pay.type
        && e.pay.min == job.pay.min
        && e.pay.max == job.pay.max
      )

      // FIXME: strictly speaking, this only works for direct
      //  hire posts -- for recruiting firms, it can be too wide
      //  of a net, and falsely flag separate jobs with
      //  the same title... but for now this is fine, and
      //  checking pay can mitigate this somewhat

      // checking summary could also help, but that might vary
      //  across different targets

      return [
        e.title == job.title,
        e.company == job.company,
        // payMatches
      ].every((c) => c)
    })
  }

  filterJobResults(results, baseURL) {
    console.log(`Got ${results.length} entries`)

    const condensedResults = results.reduce((a, b) => {
      /* NOTE:
        this link is constructed in the previous step, but it's
          important to be aware that this logic can break if 
          there are unique query params (say, any form of
          session tracking), so it's important to sanitize
            this in various places
        this also matters when checking server-side
      */
      const [ retrievalLink ] = b.retrievalLinks
      
      const existingResult = this.detectDuplicateJob(b, a)

      if (existingResult) {
        const { retrievalLinks: links } = existingResult
        
        links.push(retrievalLink)

        existingResult.retrievalLinks = [...new Set(links)]

        return a
      }

      return [...a, b]
    }, [])

    console.log(`${condensedResults.length} unique`)

    const filteredResults = condensedResults.filter((r) => {
      // check to make sure a URL isn't on
      //  a different subdomain
      // useful for preventing extranous CORS requests
      //  that may not actually work
      // TODO: make that option configurable
      const originsMatch = this.compareOrigins([
        baseURL,
        r.retrievalLinks.at(0)
      ])
      
      const passesFilters = [
        checkBlocklist(r, 'title'),
        checkBlocklist(r, 'company'),
        // checkBlocklist(r, 'global'). TODO: check this
        !baseURL || originsMatch
      ].every((e) => e)
      
      return passesFilters
    })

    console.log(`${filteredResults.length} passing filters`)

    return filteredResults
  }

  async tagSavedJobResults(results) {
    const savedResults = await getAllJobs()
      .then(results => results.map(j => j.value))

    // you may want to still save details from the
    //  top level results, in which case you wouldn't
    //  want to *delete* them outright, just skip
    //  making detailed requests on them
    // even on an identical result, you might still
    //  want to log if it came from a different search
    const taggedResults = results.map(job => {
      const saved = this.detectDuplicateJob(job, savedResults)

      // TODO: only skip if there's a JD
      const isNew = !saved?.description

      return {...job, isNew}
    })

    const newResults = taggedResults.filter(j => j.isNew)

    console.log(`${newResults.length} new`)

    return taggedResults
  }

  parsePayRange(range) {
    const lower = range.toLowerCase()

    const numbers = lower
      .replaceAll('k', '000 ')
      .replaceAll(',', '')
      .replace(/\$|\/|-/g, ' ') // replace: $ / and -
      .split(' ') // ...with a split character
      .map(n => Number(n)) // ...then return
      .filter(n => n) // ...an array of numbers in the string

    const getPayInterval = () => {
      if (['hr', 'hour'].some((w) => lower.includes(w))) {
        return 'hour'
      }

      if (lower.includes('month')) return 'month'
      
      if (lower.includes('day')) return 'day'

      return 'year'
    }

    const type = getPayInterval()

    const min = numbers.at(0)
    const max = numbers.at(1) || numbers.at(0)

    const detail = { type, range }

    if (max != min) return { min, max, ...detail }

    // TODO: find more examples of this
    if (lower.includes('up to')) return { max, ...detail }

    return { min, ...detail }
  }


  // NOTE: `.` here is relative to your cwd
  //  *NOT* other imports!
  writeResultsToJSON(data, sourceName: string) {
    const outputData = this.cleanupJobsData(data, sourceName)
    
    const outputDir = `./data/${sourceName.toLowerCase()}`

    ensureDirSync(outputDir)
    
    const formattedDate = this.retrievalDate.toISOString()
    const filename = `${outputDir}/${formattedDate}.json`

    writeJsonSync(filename, outputData, { spaces: 2 })
  }

  // extension or automation
  async fetchPage(link, page) {
    
    // if env is extension
    // if (!page) return await fetchHTML(link)
    // fetch results from same origin

    // if env is automation
    // const utils =
    //   `const fetchHTML = ${fetchHTML.toString()}`
    // pass into fn
    return await page.evaluate(async (link) => {
      // TODO: figure out loading this as a script
      const fetchHTML = (url) => fetch(url)
        .then(r => r.text())
      
      return await fetchHTML(link)
    }, { args: [ link ] })

    // if fetch is blocked
    // await page.goto
    // return innerHTML

    // if env is cli, take a command

    // TODO: options for other server-side tools...
    //  `curl-impersonate`?
    //  `page.goto`
  }

  async getPageContents(page) {
    return await page.evaluate(() => document.body.innerHTML)
  }

  async getFullPageContents(page) {
    return await page.evaluate(() => [
      document.head.innerHTML,
      `\n`,
      document.body.innerHTML,
    ].join(''))
  }

  async fetchAllJobDetailPages(data, {
    maxRetries = 10,
    page,
    parseDetails,
    sourceName = 'sample'
  }) {
    let remaining = [ ...data ]

    const newResults = data.filter(j => j.isNew)

    if (!newResults.length) {
      // TODO: add merge options
      
      return data
    }

    for (let [attempt] of Array(maxRetries).entries()) {
      const count = attempt + 1
      
      if (attempt > 0) {
        console.log(`attempt #${count}`)
        console.log(`remaining entries: ${remaining.length}`)
      }

      for (let [i, job] of data.entries()) {
        const interval = getRandomMilliseconds(30, 15)
        await delay(interval)

        if (!job.isNew) {
          // TODO: add merge options
          continue
        }
        
        // don't repeat successful calls
        if (job.description) continue
        const { title, company } = job
        
        console.log(`Getting result ${i + 1}: ${title} at ${company.name || company}`)
        
        const [ retrievalLink ] = job.retrievalLinks
        
        try {
          const html = await this.fetchPage(retrievalLink, page)
          const detail = parseDetails(html)
          
          const { description } = detail

          if (!description) throw new Error("Couldn't parse details")
          
          detail.description = await html2md(description)
          
          for (let [k, v] of Object.entries(detail)) job[k] ||= v
          this.writeResultsToJSON(data, sourceName)
        } catch(e) {
          console.error('fetch failed!')
          console.error(e.message)
          // job.error = e.message
        }
      }

      remaining = data
        .filter(({ description: d, isNew }) => isNew && !d)

      if (!remaining.length) {
        console.log('done!')
        break
      }

      console.log(`completed attempt ${count}`, '\n')
      if (count == maxRetries) break

      await delay(300 * 1000)
    }

    return data
  }

  // util
  compareOrigins(links) {
    const [origin_a, origin_b] = links
      .map((l) => URL.parse(l)?.origin)

    if (!(origin_a && origin_b)) return null

    return origin_a == origin_b
  }

  // browser automation only
  // this may be different based on target --
  //  if using the target's own redirect,
  //   you'd just go there
  //  if it's harvested directly from a result page,
  //   it might be a separate tracking link with
  //   its own redirect
  // either way, you want to get the *actual*
  //  application link
  async followRedirectLink(link) {
    const browser = await setupBrowser()

    // TODO: waituntil
    const page = await browser.newPage(link)

    const redirect = await page.evaluate(() => document.URL)

    return redirect
  }

  // TODO: rename this
  cleanupJobsData(data, sourceName: string) {
    const companies = data.companies || [
      ...new Set(data.map((r) => r.company.name || r.company))
    ].map((c) => {
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
        redirectLink: applyLink,
        pay,
        summary,
        description,
        hiringManager
      } = r

      const optionalResults = filterValues({
        pay,
        summary,
        description,
        applyLink,
        hiringManager,
      }, (v) => v)

      return {
        title,
        company: company.name || company,
        location,
        ...optionalResults,
        retrievalLinks
      }
    })

    const { retrievalDate, searchParams } = this

    const source = {
      name: sourceName,
      retrievalDate,
      searchParams,
    }

    return { companies, jobs, source }
  }
}

export class PaginatedList extends CrawlerBase {
  constructor(retrievalDate, searchParams, browserOptions) {
    super(retrievalDate, searchParams, browserOptions)
  }

  // scraping methods
  // these take a `page` argument
  // referencing the object from `astral`

  // TODO: figure out breaking this out from the child class
  //  some stuff w nextPage detection needs to change
  async fetchJobResults(page, getNextPageURL) {
    console.log('Getting initial results...')
    
    const pages = []
    
    // TODO: handle this later
    // const isExtension = Boolean(!page)
    
    // run doc query directly if extension
    let pageContents = await this.getPageContents(page)
    
    pages.push(pageContents)
    
    // attempt to use browser document if running in extension
    
    let pageNumber = 1
    
    let nextPageURL = getNextPageURL(pageContents)
    console.log({nextPageURL})
    
    while (nextPageURL) {
      const interval = getRandomMilliseconds(40, 10)
      console.log(`waiting ${interval / 1000} seconds...`, '\n')
      
      await delay(interval)
      
      pageNumber++
      console.log(`getting results for page ${pageNumber}...`)
      
      try {
        // TODO: some kind of param for fetch/goto/other methods
        // pageContents = await fetchHTML(nextPageURL)
        
        await page.goto(nextPageURL)
        
        pageContents = await this.getPageContents(page)
        
        pages.push(pageContents)
        
        nextPageURL = getNextPageURL(pageContents)
      } catch(e) {
        console.error(e)
        console.error("couldn't get next page", '\n')
        break
        }
      }

      return pages
    }
}


export class InfiniteScroller extends CrawlerBase { 
  constructor(retrievalDate, searchParams, browserOptions) {
    super(retrievalDate, searchParams, browserOptions)
  }

  async dismissModal(page, closeButtonSelector = '') {
    // TODO:
    // press escape
    // if still there...
    
    // select button and click
    await page.evaluate((selector) => {
      document.querySelector(selector)?.click()
    }, { args: [ closeButtonSelector ] })
  }

  async getMoreResults(page, getMoreSelector = '') {
    const timeout = getRandomMilliseconds(45)
    
    await page.evaluate((selector, timeout) => {
      // TODO: this is *extremely* basic scrolling logic
      //  and could be improved a lot to resemble an actual user
      const { scrollHeight } = document.body
      const nextPosition = Math.floor(scrollHeight * Math.random())
      
      // actually do scrolling
      window.scrollTo({ top: scrollHeight, behavior: 'smooth' })
      
      // and attempt to click buttons if needed
      const getMoreButton = document.querySelector(selector)
      
      setTimeout(() => {
        getMoreButton?.checkVisibility() && getMoreButton.click()

        window.scrollTo({ top: nextPosition, behavior: 'smooth' })
      }, timeout)
    }, { args: [ getMoreSelector, timeout ] })
  }
  
  async handleInfiniteScroll(page, {
    checkForViewedAllMessage,
    countLoadedResults,
    getTotalResults
  }) {
    let html = await this.getFullPageContents(page)

    let viewedAll = checkForViewedAllMessage(html)

    await delay(getRandomMilliseconds())

    let loadedResults = countLoadedResults(html)

    const {
      total: totalResults,
      isPrecise: knownTotal
    } = getTotalResults(html)

    await this.dismissModal(page)

    console.log({ loadedResults, totalResults })
    console.log('doomscrolling for you...')

    // TODO: handle client-side occlusion
    const checkCompleted = () => {
      if (viewedAll) return true

      if (!knownTotal) return false

      return totalResults <= loadedResults
    }

    while (!checkCompleted()) {
      await this.dismissModal(page)

      await this.getMoreResults(page)

      await delay(getRandomMilliseconds(120))

      html = await this.getFullPageContents(page)
      
      loadedResults = countLoadedResults(html)
      viewedAll = checkForViewedAllMessage(html)

      console.log({ loadedResults, totalResults })
    }

    return await page.evaluate(() =>
      document.body.innerHTML
    )
  }
}
