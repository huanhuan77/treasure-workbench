/**
 * selectLowPublish 口径单测（node 直接跑，不依赖浏览器）
 * 运行：pnpm check:lowpublish
 * （必须用 vite-node：源码是 Vite 风格的无扩展名导入，node 直跑会 ERR_MODULE_NOT_FOUND）
 *
 * 口径：**逐账号判定，按样品聚合**。
 *   每个账号各算各的 —— 某账号自己发满 5 条就该账号达标，
 *   与同样品别的账号发了多少无关。
 *   列表一个样品一条，条目里带未达标账号明细，不按账号拆条。
 */
import { selectLowPublish, LOW_PUBLISH_LIMIT } from './reminders'

let pass = 0, fail = 0
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      期望 ${e}\n      实际 ${a}`) }
}

const A = '广东刘亦菲', B = '晚梨不吃梨', C = '努力成为富婆'

// 构造样品：countsByAccount 是判定依据（逐账号读）
const mk = (id, name, counts, opts = {}) => {
  const accounts = Object.keys(counts)
  return {
    id, name, accounts,
    countsByAccount: Object.fromEntries(
      accounts.map((a) => [a, { publishCount: counts[a].publishCount || 0, orderCount: counts[a].orderCount || 0 }]),
    ),
    ...opts,
  }
}

// 把结果压成好断言的形状
const flat = (r) => r.map((it) => `${it.sample.name}:${it.accounts.map((x) => `${x.account}=${x.publishCount}`).join(',')}`)

console.log('阈值 =', LOW_PUBLISH_LIMIT)
console.log()

console.log('① 单账号：已发 3 条未出单 → 入选')
check('发3条',
  flat(selectLowPublish([mk(1, 'X', { [A]: { publishCount: 3, orderCount: 0 } })])),
  ['X:广东刘亦菲=3'])

console.log()
console.log('② 该账号已出单 → 该账号达标，样品落选')
check('发3条已出单1',
  selectLowPublish([mk(2, 'X', { [A]: { publishCount: 3, orderCount: 1 } })]).length, 0)

console.log()
console.log('③ 该账号发满 5 条 → 达标')
check('发5条未出单',
  selectLowPublish([mk(3, 'X', { [A]: { publishCount: 5, orderCount: 0 } })]).length, 0)

console.log()
console.log('④ 该账号 0 条 → 不算「发布不足」（那是「还没发」）')
check('发0条',
  selectLowPublish([mk(4, 'X', { [A]: { publishCount: 0, orderCount: 0 } })]).length, 0)

console.log()
console.log('⑤【核心】各账号单独算：一账号达标不代表另一账号达标')
// 刘亦菲发 6 条（达标）、富婆发 1 条（不足）→ 只该提醒富婆。
// 合计口径（旧实现）会得 7 ≥ 5 而整体排除，把富婆漏掉。
check('只留未达标的账号',
  flat(selectLowPublish([mk(5, '混合', {
    [A]: { publishCount: 6, orderCount: 0 },
    [C]: { publishCount: 1, orderCount: 0 },
  })])),
  ['混合:努力成为富婆=1'])

console.log()
console.log('⑥【核心】各账号各 2 条 → 三个都未达标，全都要提醒')
// 合计 6 ≥ 5，合计口径会整体漏报；按账号则应全部入选。
const s6 = selectLowPublish([mk(6, '三号', {
  [A]: { publishCount: 2, orderCount: 0 },
  [B]: { publishCount: 2, orderCount: 0 },
  [C]: { publishCount: 2, orderCount: 0 },
})])
check('三个账号都入选', flat(s6), ['三号:广东刘亦菲=2,晚梨不吃梨=2,努力成为富婆=2'])
check('仍只占 1 条（不拆条）', s6.length, 1)

console.log()
console.log('⑦【核心】出单只看该账号自己：A 未出单、B 已出单 → 只提醒 A')
check('别的账号出单不影响 A',
  flat(selectLowPublish([mk(7, '混合出单', {
    [A]: { publishCount: 2, orderCount: 0 },
    [B]: { publishCount: 2, orderCount: 5 },
  })])),
  ['混合出单:广东刘亦菲=2'])

console.log()
console.log('⑧ 多账号都未达标 → 一条条目带多个账号，按条数升序')
const s8 = selectLowPublish([mk(8, '排序', {
  [C]: { publishCount: 3, orderCount: 0 },
  [A]: { publishCount: 1, orderCount: 0 },
})])
check('账号按条数升序', s8[0].accounts.map((x) => `${x.account}=${x.publishCount}`),
  ['广东刘亦菲=1', '努力成为富婆=3'])
check('minPublishCount 取最小值', s8[0].minPublishCount, 1)
check('minLack = 5-1', s8[0].minLack, 4)

console.log()
console.log('⑨【防虚增】明细缺失的账号跳过，不用顶层合计顶替')
// 老数据没跑过迁移时，getCounts 会回退成顶层合计，多账号下等于把同一份
// 数字复制给每个账号 → 虚增。这里明确要求：明细缺失就跳过该账号。
const noDetail = { id: 9, name: '无明细', accounts: [A, B], countsByAccount: {}, publishCount: 3, orderCount: 0 }
check('明细缺失 → 不入选（宁可不报不虚报）', selectLowPublish([noDetail]).length, 0)
const partial = {
  id: 10, name: '半明细', accounts: [A, B],
  countsByAccount: { [A]: { publishCount: 2, orderCount: 0 } },
  publishCount: 2, orderCount: 0,
}
check('只有 A 有明细 → 只提醒 A',
  flat(selectLowPublish([partial])), ['半明细:广东刘亦菲=2'])

console.log()
console.log('⑩ 列表条数 = 未达标样品数（不是账号数）')
const all = [
  mk(11, 'P1', { [A]: { publishCount: 1, orderCount: 0 } }),                                   // 入选
  mk(12, 'P2', {
    [A]: { publishCount: 2, orderCount: 0 },
    [B]: { publishCount: 1, orderCount: 0 },
  }),                                                                                          // 入选（2 个账号，仍 1 条）
  mk(13, 'P3', { [B]: { publishCount: 4, orderCount: 1 } }),                                   // 落选（自己出单）
  mk(14, 'P4', { [C]: { publishCount: 5, orderCount: 0 } }),                                   // 落选（自己发满）
  mk(15, 'P5', {
    [A]: { publishCount: 9, orderCount: 0 },
    [C]: { publishCount: 4, orderCount: 0 },
  }),                                                                                          // 入选（只剩 C 未达标）
]
const r10 = selectLowPublish(all)
check('共 3 条', r10.length, 3)
check('明细正确', flat(r10), ['P1:广东刘亦菲=1', 'P2:晚梨不吃梨=1,广东刘亦菲=2', 'P5:努力成为富婆=4'])
check('账号总数 = 4', r10.reduce((n, it) => n + it.accounts.length, 0), 4)
check('每条都至少一个未达标账号', r10.every((it) => it.accounts.length > 0), true)
check('未达标账号都满足 0 < 条数 < 5', r10.every((it) => it.accounts.every((x) => x.publishCount > 0 && x.publishCount < 5)), true)
check('未达标账号都未出单', r10.every((it) => it.accounts.every((x) => x.orderCount === 0)), true)

console.log()
console.log('⑪【关键】已放弃/归档的样品不提醒')
// 用户反馈：铜锣烧已放弃，却出现在「发布不足5条」里还提示「补发布」。
// 已放弃的样品不该再催 —— 三种归档形态都要挡住。
const mkArchived = (id, name, extra) => ({
  id, name, accounts: [A],
  countsByAccount: { [A]: { publishCount: 1, orderCount: 0 } },
  ...extra,
})
check('archived: true',
  selectLowPublish([mkArchived(21, 'A1', { archived: true })]).length, 0)
check('archived: false（未放弃）→ 仍提醒',
  selectLowPublish([mkArchived(22, 'A2', { archived: false })]).length, 1)
check('顶层 status = abandoned',
  selectLowPublish([mkArchived(23, 'A3', { status: 'abandoned' })]).length, 0)
check('execByAccount 全为 abandoned（老数据形态）',
  selectLowPublish([mkArchived(24, 'A4', { execByAccount: { [A]: 'abandoned' } })]).length, 0)
check('execByAccount 部分 abandoned（未全放弃）→ 仍提醒',
  selectLowPublish([mkArchived(25, 'A5', { execByAccount: { [A]: 'published' } })]).length, 1)

console.log()
console.log('⑫ 未归档的样品不受影响（回归）')
check('正常样品照常入选',
  selectLowPublish([mkArchived(26, 'A6', {})]).length, 1)

console.log()
console.log(`===== 通过 ${pass} / ${pass + fail} =====`)
process.exit(fail ? 1 : 0)
