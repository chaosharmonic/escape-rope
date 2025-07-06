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
    // ... with 'value' containing the actual string
    .then(({ value: v }) => {
      // strip all extraneous slashes padding out newlines
      while (v.includes('\\')) {
        v = v.replaceAll('\\', '')
      }

      while (v.includes('\n \n'.repeat(3))) {
        v = v.replaceAll('\n \n', '\n\n')
      }

      while (v.includes('\n'.repeat(3))) {
        v = v.replaceAll('\n'.repeat(3), '\n\n')
      }

      // and other things
      //  (*most* of these probably won't exist in layers)

      v = v.replaceAll('• ', '- ')
        .replaceAll('● ', '- ')
        .replaceAll('* \n\n ', '* ')

      while (v.includes('*  ')) {
        v = v.replaceAll('*  ', '* ')
      }

      return v
    })

export const md2html = async (md) =>
  await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md) // see above
    .then(({ value: v }) => v)

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
