import { unified } from 'npm:unified'
import rehypeParse from 'npm:rehype-parse'
import remarkParse from 'npm:remark-parse'
import rehypeStringify from 'npm:rehype-stringify'
import remarkStringify from 'npm:remark-stringify'
import rehypeRemark from 'npm:rehype-remark'
import remarkRehype from 'npm:remark-rehype'

export const html2md = async (html) =>
  await unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkStringify)
    .process(html) // this outputs an object...
    .then(({ value: v }) => v) // ... with 'value' containing the actual string

export const md2html = async (md) =>
  await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md) // see above
    .then(({ value: v }) => v)

const forbiddenTitles = [
  'chief',
  'director',
  'principal',
  'lead',
  'architect',
  'manager',
  'founding',
  'staff',
  'distinguished',
  'junior',
  'jr',
  'entry',
  'intern',
  'internship',
  'coop',
  'clearance',
  'public trust',
  'ts/sci',
  'crypto',
  'blockchain',
  'dapp',
  'web3',
  'defi',
]

const forbiddenDetails = [
  'hybrid',
  'clearance',
  'ts/sci',
  'crypto',
  'blockchain',
  'dapp',
  'web3',
  'defi',
]

// full descriptions will sometimes mention others in the org chart:
//  "mentor junior engineers," "reports to enginieering director," etc
// so you want to filter by section, to avoid skipping over valid entries
export const forbiddenWords = {
  title: [...forbiddenTitles, ...forbiddenDetails],
  details: forbiddenDetails,
}

// TODO: this should be named better
export const flagForbiddenWords = (text, section) =>
  forbiddenWords[section]
    .every((w) => {
      const formatted = text[section]
        ?.toLowerCase()
        .replace(/\W/g, ' ')
        .split(' ')

      return !formatted.includes(w)
    })

// alternative for Markdown handling. I still don't have a *strong*
//  opinion here, but it'd be nice to not need 7 different NPM imports

/*
import { DOMParser } from 'deno-dom/mod.ts'
import { TDService } from 'npm:turndown'

const html2md = html => {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  // const looseList = [...doc.querySelectorAll('li p')]
  // looseList.forEach(e => { e.parentNode.innerHTML = e.innerHTML })

  return new TDService().turndown(doc.body.innerHTML)
}





...

*/
