import { unescape } from "jsr:@std/html/entities"
import { unified } from 'npm:unified'
import rehypeParse from 'npm:rehype-parse'
import remarkParse from 'npm:remark-parse'
import rehypeStringify from 'npm:rehype-stringify'
import remarkStringify from 'npm:remark-stringify'
import rehypeRemark from 'npm:rehype-remark'
import remarkRehype from 'npm:remark-rehype'

export const html2md = async (html) => {
  let prepped = unescape(html)

  const isHTML = [
    "div",
    "br",
    "p",
    "ul"
  ].some(el => prepped.includes(`<${el}>`))

  if (!isHTML) return prepped
    .replaceAll('•', '- ')
    .replaceAll('●', '- ')
    .replaceAll('·', '- ')
    .replaceAll('\no ', '\n- ')
    .replaceAll('- \n\n ', '- ')
    .replaceAll('****', '**')

  for (let el of ['strong', 'em', 'b', 'i']) {
    const badBreak = `<br></${el}>`
    const goodBreak = `</${el}><br>`

    while (prepped.includes(badBreak)) {
      prepped = (prepped.replaceAll(badBreak, goodBreak))
    }
  }

  return await unified()
    .use(rehypeParse)
    .use(rehypeRemark)
    .use(remarkStringify)
    .process(prepped) // this outputs an object...
    // ... with 'value' containing the actual string
    .then(({ value: v }) => {
      // strip all extraneous slashes padding out newlines
      while (v.includes('\\')) {
        v = v.replaceAll('\\', '')
      }

      while (v.includes('\n \n')) {
        v = v.replaceAll('\n \n', '\n\n')
      }

      while (v.includes('\n'.repeat(3))) {
        v = v.replaceAll('\n'.repeat(3), '\n\n')
      }

      // and other things
      //  (*most* of these probably won't exist in layers)

      // various non-dashed bullet points
      v = v.replaceAll('•', '- ')
        .replaceAll('●', '- ')
        .replaceAll('·', '- ')
        .replaceAll('- \n\n ', '- ')
        .replaceAll('\no ', '\n- ')
        // any extra bullet points potentially
        //  introduced by the above
        .replaceAll('- - '), ('- ')
        .replaceAll('****', '**')

      while (v.includes('-  ')) {
        v = v.replaceAll('-  ', '- ')
      }

      return v
    })
}

export const md2html = async (md) =>
  await unified()
    .use(remarkParse)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md) // see above
    .then(({ value: v }) => v)

