import fs from 'fs'
import { parseBulkCopies } from '/workspace/workbench/src/utils/helpers.js'
import { DEFAULT_SENSITIVE_WORDS } from '/workspace/workbench/src/utils/copyGenerator.js'

const txtPath = '/workspace/导入文案/DOBO噗噗片.txt'
const storePath = '/workspace/workbench/src/store.jsx'

const raw = fs.readFileSync(txtPath, 'utf-8')
const blocks = parseBulkCopies(raw)

console.log('parsed blocks:', blocks.length)
console.log('hasOrder:', blocks.filter(b => b.hasOrder).length, ' used:', blocks.filter(b => b.used).length)

// build seed array items
const items = blocks.map(b =>
  `  { content: ${JSON.stringify(b.content)}, hasOrder: ${b.hasOrder}, used: ${b.used}, topics: [] }`
).join(',\n')

const seedBlock = `const doboSeed = [
${items}
].map((c, i) => ({
  id: 'p_dobo_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, 'DOBO噗噗片', 'DOBO', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, 'DOBO噗噗片', 'DOBO', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))`

let store = fs.readFileSync(storePath, 'utf-8')

// 1) insert seed before `const defaultData = {`
const defIdx = store.indexOf('const defaultData = {')
if (defIdx < 0) throw new Error('未找到 const defaultData')
store = store.slice(0, defIdx) + seedBlock + '\n\n' + store.slice(defIdx)

// 2) insert product line before first old sample p_shijin
const oldIdx = store.indexOf("    { id: 'p_shijin'")
if (oldIdx < 0) throw new Error('未找到 p_shijin 锚点')
const productLine = "    { id: 'p_dobo', name: 'DOBO噗噗片', brand: 'DOBO', category: '保健品', createdAt: Date.now(), copies: doboSeed },\n"
store = store.slice(0, oldIdx) + productLine + store.slice(oldIdx)

fs.writeFileSync(storePath, store, 'utf-8')
console.log('injected doboSeed + p_dobo')
