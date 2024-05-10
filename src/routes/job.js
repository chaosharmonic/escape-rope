import { Router } from 'oak/mod.ts'
import * as jobsController from '../controller/job.ts'

const jobsRouter = new Router()

jobsRouter.get('/', async (ctx) => {
  ctx.response.body = await jobsController.getAllJobs()
})
// TODO: add job
// TODO: update job

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

jobsRouter.post('/upload', async (ctx) => {
  const importSource = 'json'
  // TODO: take this as a param; it could be CSV
  //  or, do this from the frontend
  const {
    jobs,
    source = {
      name: importSource,
      retrievalDate: new Date()
    }
  } = await ctx.request.body().value

  // console.log({jobs})

  const jobsToAdd = jobs.map((j) => {
    // spread static data on sourcing (site, date, etc)
    //  into one object w the dynamic retrievalDate value
    const sources = j.sources.map((s) => ({ ...s, ...source }))
    
    return { ...j, sources }
  })

  console.log({job: jobsToAdd[0]})

  ctx.response.body = await jobsController.bulkAddJobPosts(jobsToAdd)
  // ctx.response.body = jobsToAdd[0]
})

// undo action

// jobsRouter.post('/:jobId/superIgnore', async (ctx) => {
//     const {jobId} = ctx.params
//     ctx.response.body = await jobsController.superIgnoreJobPost(jobId)
// })

export default jobsRouter
