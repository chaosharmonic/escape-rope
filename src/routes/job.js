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
  ctx.response.body = await jobsController.getFlaggedJobs()
})

jobsRouter.get('/second_look', async (ctx) => {
  ctx.response.body = await jobsController.getIgnoredJobs()
})

jobsRouter.post('/:jobId/flag', async (ctx) => {
  const { jobId } = ctx.params

  const result = await jobsController.flagJobPost(jobId)
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

// jobsRouter.post('/:jobId/superIgnore', async (ctx) => {
//     const {jobId} = ctx.params
//     ctx.response.body = await jobsController.superIgnoreJobPost(jobId)
// })

export default jobsRouter
