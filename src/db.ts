import { collection, kvdex, model } from 'kvdex/'
import { Company, JobPost, Settings } from './types.ts'
import 'dotenv/load'

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

const { result: settings } = await db.settings.getMany()

if (!settings.length) {
  const defaultSettings = {
    campaigns: [{
      name: 'default'
    }]
  }

  await db.settings.add(defaultSettings)
}

// TODO: fix this
// await kv.close()
