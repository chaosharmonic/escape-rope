import { JobPost, LifecycleStage } from '../types.ts'
import { db } from '../db.ts'

export const addNewJobPost = async (job: JobPost) => {
  const { title, company, pay, description, summary, sources } = job

  // should potentially be able to bypass if distinct job,
  //  but if purging old entries it shouldn't matter much/
  const savedEntry = await db.jobs.getOne({
    filter: ({ value: v }) => {
      //

      // this needs better sanitization than I'm really doing here
      //  but for now it's not critical
      if (description == v.description) {
        console.log('descriptions match')

        return true
      }

      const [storedSearchResults, newSearchResults] = [v.sources, sources]
        .map((arr) => arr.map((e) => e.retrievalLink))
      const resultExists = newSearchResults
        .some((r) => storedSearchResults.includes(r))

      if (resultExists) {
        console.log('search result exists')
        return true
      }

      const [storedRedirects, newRedirects] = [v.sources, sources]
        .map((arr) =>
          arr
            .filter((e) => Boolean(e.redirectLink))
            .map((e) => e.redirectLink)
        )

      const redirectExists = newRedirects
        .some((r) => storedRedirects.includes(r))

      if (redirectExists) {
        console.log('redirect exists')
        return true
      }

      // TODO: flesh this out
      // exclude examples from known recruiting firms

      // summary: not all examples will list this
      // pay: targets will have different formatting,
      //  so this can't realistically be used for now

      const basicDetailsMatch = title == v.title &&
        company == v.company

      const detailsMatch = basicDetailsMatch && [
        pay == v.pay,
        summary == v.summary,
      ].every((c) => c)

      return basicDetailsMatch
      // return detailsMatch
    },
  })

  if (savedEntry) {
    console.log('found existing entry for this job. updating...')

    console.log({ savedEntry, job })

    const { id, value: { sources: savedSources } } = savedEntry
    const { sources: newSources } = job

    // TODO:
    //  this should check for both the same timestamp *and* location
    //  something along the lines of an array of objects with both properties
    //  checking that both match on the same index, not just
    //  that there *are* matches
    const [storedTimestamps, newTimestamps] = [newSources, savedSources]
      .map((arr) => arr.map((e) => e.retrievalDate))

    console.log({ storedTimestamps, newTimestamps })

    const hasBeenProcessed = newTimestamps
      .some((r) => storedTimestamps.includes(r))

    if (hasBeenProcessed) {
      console.log('result already processed')
      return savedEntry
    }

    // TODO: cover if this is manual entry
    // that *could* be a string instead of an array
    // may be best covered via changes to the type,
    // but for now it doesn't matter, bc no one's doing this
    const sources = [...savedSources, ...newSources]

    console.log({ id, sources })

    // TODO: merge any new data into the update
    return await db.jobs.update(id, { sources })
  }

  return await db.jobs.add({ ...job, lifecycle: 'queued' })
}

// should this be a bulk add?
//  that might be an issue w validations
// but it's fine to just loop over it for now
export const bulkAddJobPosts = async (jobs: JobPost[]) => {
  const result = await Promise.all(jobs
    .map(async (j) => await addNewJobPost(j))
  )
  
  return result
}

const setJobPostStatus = async (jobId: string, status: LifecycleStage) => {
  const result = await db.jobs.update(jobId, { lifecycle: status })

  return result
}

export const resetJobPostStatus = async (jobId: string) =>
  await setJobPostStatus(jobId, 'queued')
export const likeJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'liked')
export const ignoreJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'ignored')
export const unmatchJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'unmatched')

export const superIgnoreJobPost = async (jobId: string) => {
  await setJobPostStatus(jobId, 'ignored')

  // has associated jobId
  // how to deal with possible duplicates here?
  // const {result: {id}} = await db.jobs.find()
  // await ignoreCompany(companyId)
}

// more specific "likes"
export const flagStashedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'stashed')
export const flagShortlistedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'shortlisted')

export const flagAppliedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'applied')
export const flagInterviewingJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'interview')
export const flagOfferedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'offer')
export const flagHiredJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'hire')

// exits
export const flagRejectedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'rejected')
export const flagDeclinedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'declined')
export const flagGhostedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'ghosted')
export const flagRescindedJobPost = async (jobId: string) =>
  await setJobPostStatus(jobId, 'rescinded')

export const getAllJobs = async () => {
  const { result: jobs } = await db.jobs.getMany()

  return jobs
}

// TODO: types
export const searchJobs = async (filters) => {
  const { result: jobs } = await db.jobs.getMany({
    filter: ({ value }) => {
      // TODO: handle more than just status
      
      // TODO: types
      for (let [property, options] of Object.entries(filters)) {
        if (property == 'status' && !options.includes(value.lifecycle)) {
          // console.log({options, status: value.lifecycle})
          return false
        }
      }
      
      return true
    }
  })

  return jobs
}

// TODO: bother with pagination
export const getJobsByStatus = async (status: string) => {
  const { result: jobs } = await db.jobs.getMany({
    filter: ({ value: { lifecycle } }) => lifecycle == status,
  })

  return jobs
}

// ...do I care about this? Maybe for recruiting firms
// const getJobsBySource

// filter by has contacts?

export const getQueuedJobs = async () => await getJobsByStatus('queued')
export const getLikedJobs = async () => await getJobsByStatus('liked')
export const getIgnoredJobs = async () => await getJobsByStatus('ignored')
export const getAppliedJobs = async () => await getJobsByStatus('applied')
