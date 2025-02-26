import { parse } from 'jsr:@std/yaml'
import 'dotenv/load'

const [
  campaign = { name: 'default' },
  blocklist = {},
  defaultInterviewQuestions = []
  // TODO: maybe consider YAML for these?
] = await Promise.all([
  'campaign/basics.yaml',
  'campaign/blocklist.yaml',
  'campaign/interview_questions.yaml',
].map(async file => {
  // NOTE: these file paths are based on the folder 
  // and are *NOT* relative imports
  try {
    const yaml = await Deno.readTextFile(`config/${file}`)
    
    return parse(yaml)
  } catch (err) { return }
}))

const coverLetters = []

const coverLetterDir = 'config/campaign/cover_letters'
// TODO: ensureDir

for await (const entry of Deno.readDir(coverLetterDir)) {
  if (!entry.isFile) continue
  
  if (!entry.name.endsWith('.md')) continue

  const path = `${coverLetterDir}/${entry.name}`
  const text = await Deno.readTextFile(path)

  const name = entry.name.replace('.md', '')

  coverLetters.push({ name, text })
}

const { pay = {} } = campaign

// max isn't supported everywhere,
//  but can help you pare down results
pay.min ||= Deno.env.get('SEARCH_MIN_SALARY')
// pay.target ||= Deno.env.get('SEARCH_TARGET_SALARY')
pay.max ||= Deno.env.get('SEARCH_MAX_SALARY')

campaign.pay = { ...pay }

for (let key of ['locations', 'roles', 'skills']) {
  const envVar = `SEARCH_${key.toUpperCase()}`
  
  const values = Deno.env.get(envVar)?.split('|')
  || []

  campaign[key] ??= []

  !campaign[key].length && campaign[key].push(...values)
}

// const remote = !locations?.length
//   || locations.includes('remote')

campaign.roles ??= Deno.env.get('SEARCH_ROLES')
  .split('|') 

export const initSettings = {
  campaigns: [{
    ...campaign,
    defaultInterviewQuestions,
    coverLetters,
    blocklist
  }]
}

// export const browserOptions = {
    // wsendpoint
    // proxy server
    // ...tasks?
// }