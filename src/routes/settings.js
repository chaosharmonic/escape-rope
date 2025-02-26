import { Router } from 'oak/router'
import * as settingsController from '../controller/settings.ts'

const settingsRouter = new Router()

settingsRouter.get('/', async (ctx) => {
  const res = await settingsController.getSettings()
  
  ctx.response.body = res
})

settingsRouter.post('/', async (ctx) => {
  const payload = await ctx.request.body.json()

  console.log({ payload })

  const res = await settingsController
    .updateSettings(payload)

  ctx.response.body = res
})

settingsRouter.put('/campaign/basic_details', async (ctx) => {
  const payload = await ctx.request.body.formData()

  const data = Object.fromEntries(payload.entries())

  const update = Object.entries(data)
    .map(([ k, v ]) => ({ [k]: JSON.parse(v) }))
    .reduce( ( a, b ) => ({ ...a, ...b }) )

  const res = await settingsController
    .updateBasicCampaignSettings({ ...update }, 'default')

  ctx.response.body = res
})

// TODO: route params
// (when I get to support for multiple searches)
// (*maybe* break these out into their own model)
settingsRouter.put('/campaign/cover_letters', async (ctx) => {
  // ...if I'm getting this granular
  //  can I reasonably just go back to FormData?
  const payload = await ctx.request.body.json()

  const res = await settingsController
    .updateCoverLetters({ ...payload }, 'default')

  ctx.response.body = res
})

settingsRouter.put('/campaign/blocklist', async (ctx) => {
  const payload = await ctx.request.body.formData()

  const blocklist = JSON.parse(payload.get('blocklist'))

  const res = await settingsController
    .updateBlocklist({ ...blocklist }, 'default')

  ctx.response.body = res
})

settingsRouter.put('/campaign/interview_questions', async (ctx) => {
  const payload = await ctx.request.body.formData()

  console.log({ payload })

  const defaultInterviewQuestions = JSON.parse(
    payload.get('defaultInterviewQuestions')
  )


  const res = await settingsController
    .updateDefaultInterviewQuestions(
      defaultInterviewQuestions,
      'default'
    )

  ctx.response.body = res
})


export default settingsRouter