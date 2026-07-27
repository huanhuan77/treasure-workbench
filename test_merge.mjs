import pkg from '/root/.nvm/versions/node/v22.13.1/lib/node_modules/playwright/index.js'
const { chromium } = pkg

const BASE = 'http://localhost:8123/'

function makeLegacyStorage() {
  // 老用户：localStorage 里同时有 p_jiebiwet(湿厕纸,8) 和 p_jiebitudushijin(湿巾,10)
  const products = [
    {
      id: 'p_jiebiwet', name: '洁比兔湿厕纸', brand: '洁比兔', category: '其他',
      createdAt: Date.now(),
      copies: [
        { id: 'p_jiebiwet_c1', content: '老湿厕纸文案A', title: '', topics: [], style: '', used: true, usedDate: null, hasOrder: false, createdAt: Date.now() },
        { id: 'p_jiebiwet_c2', content: '老湿厕纸文案B', title: '', topics: [], style: '', used: false, usedDate: null, hasOrder: true, createdAt: Date.now() },
      ],
    },
    {
      id: 'p_jiebitudushijin', name: '洁比兔 湿巾', brand: '洁比兔', category: '其他',
      createdAt: Date.now(),
      copies: [
        { id: 'p_jiebitudushijin_c1', content: '新湿巾文案X', title: '', topics: ['#洁比兔','#温和清洁'], style: '', used: true, usedDate: null, hasOrder: true, createdAt: Date.now() },
        { id: 'p_jiebitudushijin_c2', content: '新湿巾文案Y', title: '', topics: ['#洁比兔','#温和清洁'], style: '', used: false, usedDate: null, hasOrder: false, createdAt: Date.now() },
      ],
    },
    { id: 'p_other', name: '其他产品', brand: 'X', category: '其他', createdAt: Date.now(), copies: [] },
  ]
  return JSON.stringify({ products, samples: [], transactions: [], sensitiveWords: [] })
}

async function scenario(name, preStorage) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  if (preStorage) {
    await page.evaluate((s) => localStorage.setItem('blogger_workbench_data_v1', s), preStorage)
    await page.reload({ waitUntil: 'networkidle' })
  } else {
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })
  }
  await page.waitForTimeout(800)
  const result = await page.evaluate(() => {
    const raw = localStorage.getItem('blogger_workbench_data_v1')
    const data = JSON.parse(raw)
    const jbt = data.products.filter((p) => /洁比兔/.test(p.name) && /(湿巾|湿厕纸)/.test(p.name))
    return {
      jbtCount: jbt.length,
      names: jbt.map((p) => p.name),
      copyCounts: jbt.map((p) => p.copies.length),
      otherCount: data.products.filter((p) => p.id === 'p_other').length,
    }
  })
  console.log(`[${name}]`, JSON.stringify(result))
  await browser.close()
  return result
}

const a = await scenario('全新用户', null)
const b = await scenario('老用户双产品', makeLegacyStorage())

let ok = true
if (a.jbtCount !== 1 || a.names[0] !== '洁比兔 湿巾' || a.copyCounts[0] !== 10) { ok = false; console.log('FAIL 全新用户') }
if (b.jbtCount !== 1 || b.names[0] !== '洁比兔 湿巾') { ok = false; console.log('FAIL 老用户合并') }
if (b.otherCount !== 1) { ok = false; console.log('FAIL 其他产品丢失') }
console.log(ok ? 'ALL PASS' : 'SOME FAILED')
process.exit(ok ? 0 : 1)
