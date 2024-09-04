#!/usr/bin/env -S deno -R=. -W=. -N

import { writeJsonSync } from 'jsonfile/mod.ts'
import { html2md } from '../src/utils/cleanup.js'

/* NOTE:
this was written before I wrote any of the scraping code,
 and my initial wall was sorting out how I was
 going to get data out of the forum threads
I've since started toying with using LLM's for this,
 but it's still early in the experiment phase
*/

const baseURL = 'https://hacker-news.firebaseio.com/v0/'

const getAllJobsThreads = async () => {
  const res = await fetch(`${baseURL}/user/whoishiring.json`)
  const data = await res.json()
  return data.submitted

  // TODO: dynamically fill post titles?
}

const getLatestJobsThread = async (isFreelance = false) => {
  const threads = await getAllJobsThreads()

  if (isFreelance) return threads[1]
  return threads[0]

  // HN Jobs bot always posts in this order: who is searching, freelancers, who is hiring
  //  ergo, open job postings are always the most recent thread
}

const jobsThreadID = await getLatestJobsThread()
const jobsThreadURL = `${baseURL}/item/${jobsThreadID}.json`

console.log('making fetch happen...!')
const rawJobsData = await fetch(jobsThreadURL)
const { title, kids: jobPosts } = await rawJobsData.json()
const filename = title.replace('Ask HN: Who is hiring? (', '').replace(')', '')

const getJobData = async (job) => {
  const jobURL = `${baseURL}/item/${job}.json`
  const jobRes = await fetch(jobURL)

  const data = await jobRes.json()
  // if (!data) return null
  const { by: user, text, time } = data

  // TODO: convert Markdown here

  return { user, text: await html2md(text), time }
}

const fetchedListings = jobPosts.map(async (job) => await getJobData(job))
const data = await Promise.all(fetchedListings)
const output = { source: 'HN', thread: jobsThreadID, data }

writeJsonSync(`./data/HN/${filename}.json`, output, { spaces: 2 })
