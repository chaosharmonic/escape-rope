import { Application, Router } from 'oak/mod.ts'
import jobsRouter from './routes/job.js'
import 'dotenv/load.ts'

const port = Deno.env.get('SERVER_PORT') ||
  3000

const app = new Application()

const router = new Router()

router.use('/jobs', jobsRouter.routes())
router.get('/', (ctx) => {
  ctx.response.body = 'good news everyone!'
})

app.use(router.routes())

console.log(`listening on port ${port}`)

app.listen({ port })
