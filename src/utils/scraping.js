import { launch, connect } from 'astral/'
// TODO: import dynamically based on env
import { DOMParser } from 'deno-dom/'
// TODO: replace (most of) this with some actual user settings
import 'dotenv/load'

export const wsEndpoint = Deno.env.get('WS_ENDPOINT')

// TODO: randomize this
const userAgent = ''
const proxyServer = ''

const windowSize = '--windowsize=1920,1080'
// or, '--start-mazimized'

const launchOptions = {
  userAgent,
  headless: false,
  defaultViewport: null,
  args: [
    proxyServer && `--proxy-server=${proxyServer}`,
    windowSize,
    '--incognito' // FIXME: this has issues upstream
  ].filter(e => Boolean(e))
}

const connectOptions = {
  userAgent,
  wsEndpoint
}

export const setupBrowser = async () => wsEndpoint
  ? await connect(connectOptions)
  : await launch(launchOptions)

// export const browser = await setupBrowser()

// you may want to pass these into browser automation as args
//  in which case `DOMParser` will already exist
// browser automation can take the functions as strings,
//  which will skip the dependencies anyway

export const fetchHTML = (endpoint, options) =>
  fetch(endpoint, options)
    .then((res) => res.text())
export const parseHTML = (page) =>
  new DOMParser().parseFromString(page, 'text/html')

export const getDoc = (e, o) => fetchHTML(e, o).then((res) => parseHTML(res))

// get a random time, measured in seconds, to ms precision
// (that's ultimately a little inefficient, but the output reads a little cleaner)
export const getRandomTime = (target = 12, window = 3) => {
  if (window < 0) window = Math.abs(window)

  // generate a random second count
  const roll = () => Math.floor(Math.random() * (target + window))
  let seconds = roll()

  // if random selection isn't within the window specified,
  //  reassign with a new value until it is
  // we don't need to check upper bounds, as that's already a hard limit
  //  in the randomization above
  while (seconds < (target - window)) seconds = roll()

  // generate ms separately. This way, we're only dealing in this level
  //  of precision once, no matter how many re-rolls happen above
  const ms = Math.floor(Math.random() * 1000) / 1000

  return seconds + ms
}

export const getRandomMilliseconds = (target = 12, window = 3) =>
  getRandomTime(target, window) * 1000

export const sleep = (timeout) =>
  new Promise((resolve) => setTimeout(resolve, timeout))

export const getDOMQueryResults = (
  selector,
  doc = document,
) => [...doc.querySelectorAll(selector)]
