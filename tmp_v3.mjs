import { parseBulkCopies } from '/workspace/workbench/src/utils/helpers.js'

const fmt = `洁比兔 湿巾
带娃出门最怕什么？一包湿巾搞定全身清洁 👍

手口屁屁都能擦，无酒精不刺激 ✅

宝宝红屁屁克星，温和到可以入口

加厚珍珠纹，一张顶三张 ✅

#洁比兔 #温和清洁 #卫生湿巾 #亲测分享 #女生必备`

console.log('===== 你的格式：产品名 / 文案 / 话题 =====')
const a = parseBulkCopies(fmt)
console.log('条数:', a.length)
a.forEach((c, i) => console.log(`第${i + 1}条 topics=${JSON.stringify(c.topics)} | ${c.content}`))
console.log('含产品名垃圾文案?', a.some(c => c.content === '洁比兔 湿巾'))

console.log('\n===== 回归：无表头（仅 文案+话题） =====')
const b = parseBulkCopies(`带娃出门最怕什么 👍

手口屁屁都能擦 ✅

#洁比兔 #温和清洁`)
console.log('条数:', b.length, '| 首条:', JSON.stringify(b[0]?.content))

console.log('\n===== 回归：每条各自带话题 =====')
const c = parseBulkCopies(`带娃出门最怕什么 👍
#洁比兔 #温和

手口屁屁都能擦 ✅
#洁比兔 #温和`)
console.log('条数:', c.length, '| 首条topics:', JSON.stringify(c[0]?.topics))
