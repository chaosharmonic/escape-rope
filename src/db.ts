import { collection, kvdex, model } from 'kvdex/'
import { Company, JobPost } from './types.ts'
import 'dotenv/load'

const filename = Deno.env.get('DB_FILENAME') || ''

export const kv = await Deno.openKv(`${filename}.db`)
export const db = kvdex(kv, {
  jobs: collection(model<JobPost>()),
  companies: collection(model<Company>()),
})

// TODO: fix this
// await kv.close()
