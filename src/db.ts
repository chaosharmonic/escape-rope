import { collection, kvdex, model } from 'kvdex/'
import { Company, JobPost, Settings } from './types.ts'
import 'dotenv/load'
import { initSettings } from '../config/init.js'

const filename = Deno.env.get('DB_FILENAME') || ''


export const kv = await Deno.openKv(`${filename}.db`)
export const db = kvdex({
  kv,
  schema: {
    jobs: collection(model<JobPost>()),
    companies: collection(model<Company>()),
    settings: collection(model<Settings>())
  }
})

// check for settings and init them if none exist

const settings = await db.settings.getOne()
  .then(v => v?.value)

console.log({ settings })

if (!settings) {
  await db.settings.add(initSettings)

  console.log({ initSettings })
}

// TODO: fix this
// await kv.close()
