import { Router } from 'oak/router'
import * as jobsController from '../controller/job.ts'

const jobsRouter = new Router()

jobsRouter.get('/', async (ctx) => {
  ctx.response.body = await jobsController.getAllJobs()
})
// TODO: add job
// TODO: update job

jobsRouter.post('/search', async (ctx) => {
  const payload = await ctx.request.body.formData()
  
  const filters = JSON.parse(payload.get('filters'))

  ctx.response.body = await jobsController.searchJobs(filters)
})

// these names are styled after dating apps,
//  just since I'm ripping a log of the categorization
//  handling from them conceptually
// subject to change
jobsRouter.get('/batch', async (ctx) => {
  ctx.response.body = await jobsController.getQueuedJobs()
})

jobsRouter.get('/matches', async (ctx) => {
  ctx.response.body = await jobsController.getLikedJobs()
})

jobsRouter.get('/second_look', async (ctx) => {
  ctx.response.body = await jobsController.getIgnoredJobs()
})

jobsRouter.post('/:jobId/like', async (ctx) => {
  const { jobId } = ctx.params

  const result = await jobsController.likeJobPost(jobId)
  console.log({ result })

  // if (result.ok)

  // TODO: return newly transformed object
  ctx.response.body = result
})

// superlike
//  I might need to name these better after all...

jobsRouter.post('/:jobId/ignore', async (ctx) => {
  // include reason for ignore?
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.ignoreJobPost(jobId)
})

jobsRouter.post('/:jobId/shortlisted', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagShortlistedJobPost(jobId)
})

jobsRouter.post('/:jobId/stashed', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagStashedJobPost(jobId)
})

jobsRouter.post('/:jobId/unmatched', async (ctx) => {
  // include reason for unmatch?
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.unmatchJobPost(jobId)
})

jobsRouter.post('/:jobId/expired', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagExpiredJobPost(jobId)
})

jobsRouter.post('/:jobId/applied', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagAppliedJobPost(jobId)
})

jobsRouter.post('/:jobId/interview', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagInterviewingJobPost(jobId)
})

jobsRouter.post('/:jobId/withdrawn', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagWithdrawnJobPost(jobId)
})

jobsRouter.post('/:jobId/offer', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagOfferedJobPost(jobId)
})

jobsRouter.post('/:jobId/rescinded', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagRescindeddJobPost(jobId)
})

jobsRouter.post('/:jobId/hire', async (ctx) => {
  const { jobId } = ctx.params
  ctx.response.body = await jobsController.flagHiredJobPost(jobId)
})

jobsRouter.post('/upload', async (ctx) => {
  // TODO: handle alternate request methods
  //  this *could* still be directly sent as JSON
  const payload = await ctx.request.body.formData()

  // if direct JSON,
  // data = await ctx.request.body().value
  const data = await payload.get('file').text()
    .then(j => {
      // TODO: send or infer file type
      // do something different for CSV
      return JSON.parse(j)
    })

  const {
    jobs,
    source = {
      name: 'user upload',
      retrievalDate: new Date()
    }
  } = data

  const jobsToAdd = jobs.map((j) => {
    // spread static data on sourcing (site, date, etc)
    //  into one object w the dynamic retrievalDate value
    const output = { ...j }
    
    const sources = j.retrievalLinks
      .map((retrievalLink) => ({ retrievalLink, ...source }))
    
    delete(output.retrievalLinks)
    
    return { ...output, sources }
  })

  try {
    const result = await jobsController.bulkAddJobPosts(jobsToAdd)

    ctx.response.body = result

  } catch ({ message: m }) {
    console.error(m)
    ctx.response.body = { error: m }
  }
})

// undo action

// jobsRouter.post('/:jobId/superIgnore', async (ctx) => {
//     const {jobId} = ctx.params
//     ctx.response.body = await jobsController.superIgnoreJobPost(jobId)
// })

export default jobsRouter
