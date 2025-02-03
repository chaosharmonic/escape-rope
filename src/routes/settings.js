import { Router } from 'oak/router'
import * as settingsController from '../controller/settings.ts'

const settingsRouter = new Router()

settingsRouter.get('/', async (ctx) => {
  const res = await settingsController.getSettings()
  
  ctx.response.body = res
})

settingsRouter.put('/', async (ctx) => {
  const payload = await ctx.request.body().value

  const res = await settingsController
    .updateSettings(payload)

  ctx.response.body = res
})

export default settingsRouter