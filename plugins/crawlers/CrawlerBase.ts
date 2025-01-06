import { delay } from 'async/delay'
import { writeJsonSync } from 'jsonfile/mod.ts'
import { flagForbiddenWords } from '../../src/utils/cleanup.js'
import {
  fetchHTML,
  getRandomMilliseconds,
  setupBrowser
} from '../../src/utils/scraping.js'
import { getAllJobs } from '../../src/controller/job.ts'
import { html2md } from '../../src/utils/cleanup.js'

// WIP
export class CrawlerBase {
  contructor(retrievalDate = new Date(), searchParams, browserOptions) {
    this.retrievalDate = retrievalDate
    
    this.searchParams = searchParams || {}
    // this.browserOptions = browserOptions || {}
  }

  // TODO: this actaully should be a util for server-side use
  //  (but for now it's probably fine)
  detectDuplicateJob(job, data) {
    // const options = {
      // strict field checking?
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

      // skip checking optional fields if one side is missing
      const optionalFieldConditions = ['pay', 'summary']
        .map(k => !(e[k] && job[k]) || e[k] == job[k])

      // FIXME: strictly speaking, this only works for direct
      //  hire posts -- for recruiting firms, it can be too wide
      //  of a net, and falsely flag separate jobs with
      //  the same title... but for now this is fine, and
      //  checking optional metadata can mitigate it somewhat
      // 

      return [
        e.title == job.title,
        e.company == job.company,
        ...optionalFieldConditions
      ].every((c) => c)
    })
  }

  filterJobResults(results, baseURL) {
    console.log(`Got ${results.length} entries`)

    const condensedResults = results.reduce((a, b) => {
      const [ retrievalLink ] = b.retrievalLinks
      
      const existingResult = this.detectDuplicateJob(b, a)

      if (existingResult) {
        existingResult.retrievalLinks.push(retrievalLink)
        
        const { retrievalLinks: links } = existingResult

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
        flagForbiddenWords(r, 'title'),
        originsMatch
      ].every((e) => e)
      
      return passesFilters
    })

    console.log(`${filteredResults.length} passing filters`)

    return filteredResults
  }

  async tagSavedJobResults(results) {
    const savedResults = await getAllJobs()

    // you may want to still save details from the
    //  top level results, in which case you wouldn't
    //  want to *delete* them outright, just skip
    //  making detailed requests on them
    const taggedResults = results.map(job => {
      const saved = this.detectDuplicateJob(job, savedResults)

      const isNew = !saved

      return {...job, isNew}
    })

    const newResults = taggedResults.filter(j => j.isNew)

    console.log(`${newResults.length} new`)

    return taggedResults
  }

  writeResultsToJSON(data, outputdir = '.') {
    const formattedDate = this.retrievalDate.toISOString()
    const filename = `${outputdir}/${formattedDate}.json`

    writeJsonSync(filename, data, { spaces: 2 })
  }

  // extension or automation
  // fetch results from same origin
  async fetchJobDetails(link, page) {
    // if (!page) return await fetchHTML(link)

    return await page.evaluate(async (l) => {
      // TODO: figure out loading this as a script
      const fetchHTML = (url) => fetch(url)
        .then(r => r.text())
      
      return await fetchHTML(l)
    }, { args: [ link ] })

    // TODO: options for other server-side tools...
    //  `curl-impersonate`?
    //  `page.goto`
  }

  async fetchAllJobDetailPages(data, { maxRetries = 10, page, parseFn }) {
    let remaining = [ ...data ]

    const newResults = data.filter(j => j.isNew)

    if (!newResults.length) {
      // TODO: add merge options
      
      return data
    }

    for (let [attempt] of Array(maxRetries).entries()) {
      if (attempt > 0) {
        console.log(`attempt #${attempt + 1}`)
        console.log(`remaining entries: ${remaining.length}`)
      }

      for (let [i, job] of data.entries()) {
        const interval = getRandomMilliseconds(30, 15)
        await delay(interval)

        if (!job.isNew) {
          // TODO: merge options
          continue
        }

        const { title, company } = job

        console.log(`Getting result ${i + 1}: ${title} at ${company}`)

        const [ retrievalLink ] = job.retrievalLinks

        try {
          const html = await this.fetchJobDetails(retrievalLink, page)

          const detail = parseFn(html)

          if (!detail.description) throw new Error("Couldn't parse details")
          
          const { description } = detail
          
          detail.description = await html2md(description)

          for (let [k, v] of Object.entries(detail)) job[k] ||= v
        } catch(e) {
          console.error('fetch failed!')
          console.error(e)
          // job.error = e
        }
      }

      remaining = data
        .filter(({ description: d }) => !d)

      if (!remaining.length) {
        console.log('done!')
        break
      }

      console.log('Run completed','')
      await delay(300 * 1000)
    }

    return data
  }

  // extension or automation
  // parse an HTML string and return detailed metadata
  // this is defined in child classes
  // parseJobDetails(html) {
  // }

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
}

export class PaginatedList extends CrawlerBase {
  constructor(retrievalDate, searchParams, browserOptions) {
    super(retrievalDate, searchParams, browserOptions)
  }

  // scraping methods
  // these take a `page` argument
  // referencing the object from `astral`

  /*
  // TODO: figure out breaking this out from the child class
  //  some stuff w nextPage detection needs to change
  async fetchJobResults(page) {
  }
  
  // this could be a link, or a button
  getNextPage() {
  }
  */
}


export class InfiniteScroller extends CrawlerBase { 
  constructor(retrievalDate, searchParams, browserOptions) {
    super(retrievalDate, searchParams, browserOptions)
  }

  /*
  // TODO: handle getting checkCompleted from a child class
  handleInfiniteScroll(page) {
    
  }
  
  checkCompleted(doc) {
    
  }
  */
}