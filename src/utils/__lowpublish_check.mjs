/**
 * selectLowPublish 口径单测（node 直接跑，不依赖浏览器）
 * 运行：pnpm check:lowpublish
 * （必须用 vite-node：源码是 Vite 风格的无扩展名导入，node 直跑会 ERR_MODULE_NOT_FOUND）
 *
 * 口径：**按样品合计判定**，一个未达标样品占一条。
 *   把样品所有账号的发布数加在一起，合计 < 5 且未出单才算「发布不足」。
 *   卡片上列出各账号条数分布，仅供参考该给谁补。
 */
import { selectLowPublish, LOW_PUBLISH_LIMIT } from './reminders'

let pass = 0, fail = 0
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      期望 ${e}\n      实际 ${a}`) }
}

const A = '广东刘亦菲', B = '晚梨不吃梨', C = '努力成为富婆'

// 构造样品：countsByAccount 是判定依据
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
console.log('② 已出单 → 落选')
check('发3条已出单1',
  selectLowPublish([mk(2, 'X', { [A]: { publishCount: 3, orderCount: 1 } })]).length, 0)

console.log()
console.log('③ 合计发满 5 条 → 达标')
check('发5条未出单',
  selectLowPublish([mk(3, 'X', { [A]: { publishCount: 5, orderCount: 0 } })]).length, 0)

console.log()
console.log('④ 一条都没发 → 不算「发布不足」（那是「还没发」）')
check('发0条',
  selectLowPublish([mk(4, 'X', { [A]: { publishCount: 0, orderCount: 0 } })]).length, 0)

console.log()
console.log('⑤【核心】按合计判定：多账号凑够 5 条 → 整体达标，落选')
// 用户拍板要合计口径：A 发 3 + B 发 3 = 6 ≥ 5 → 不提醒。
// 这是合计口径的固有取舍（A、B 各自不足 5 条，但样品整体够了）。
const s5 = selectLowPublish([mk(5, '凑够', {
  [A]: { publishCount: 3, orderCount: 0 },
  [B]: { publishCount: 3, orderCount: 0 },
})])
check('合计 6 ≥ 5 → 落选', s5.length, 0)

console.log()
console.log('⑥【核心】合计不足 5 → 入选，一个样品只占一条')
// A 发 2 + B 发 2 = 4 < 5 → 入选；卡片列出两个账号的分布。
const s6 = selectLowPublish([mk(6, '三号', {
  [A]: { publishCount: 2, orderCount: 0 },
  [B]: { publishCount: 2, orderCount: 0 },
})])
check('入选且列出各账号分布', flat(s6), ['三号:广东刘亦菲=2,晚梨不吃梨=2'])
check('只占 1 条（不按账号拆条）', s6.length, 1)

console.log()
console.log('⑦ 合计已够 5 条 → 落选（即便每个账号都不足）')
check('合计 8 ≥ 5 → 落选',
  selectLowPublish([mk(7, '各四条', {
    [A]: { publishCount: 4, orderCount: 0 },
    [C]: { publishCount: 4, orderCount: 0 },
  })]).length, 0)

console.log()
console.log('⑧ 合计缺口计算 + 账号按条数升序')
const s8 = selectLowPublish([mk(8, '排序', {
  [C]: { publishCount: 2, orderCount: 0 },
  [A]: { publishCount: 1, orderCount: 0 },
})])
check('账号按条数升序', s8[0].accounts.map((x) => `${x.account}=${x.publishCount}`),
  ['广东刘亦菲=1', '努力成为富婆=2'])
check('minLack = 5 - 合计3 = 2', s8[0].minLack, 2)
check('publishCount = 合计 3', s8[0].publishCount, 3)

console.log()
console.log('⑨ 老数据形态：只有顶层计数、无 countsByAccount 明细')
// getCounts 会回退到顶层值，单账号场景求和后仍正确
const legacy = { id: 9, name: '老数据', accounts: [A], countsByAccount: {}, publishCount: 3, orderCount: 0 }
check('顶层计数 3 < 5 → 入选', selectLowPublish([legacy]).length, 1)
check('minLack = 2', selectLowPublish([legacy])[0].minLack, 2)

console.log()
console.log('⑩ 列表条数 = 未达标样品数（不是账号数）')
const all = [
  mk(11, 'P1', { [A]: { publishCount: 1, orderCount: 0 } }),                                   // 入选
  mk(12, 'P2', {
    [A]: { publishCount: 2, orderCount: 0 },
    [B]: { publishCount: 1, orderCount: 0 },
  }),                                                                                          // 入选（合计3，2 个账号，仍 1 条）
  mk(13, 'P3', { [B]: { publishCount: 4, orderCount: 1 } }),                                   // 落选（已出单）
  mk(14, 'P4', { [C]: { publishCount: 5, orderCount: 0 } }),                                   // 落选（合计够）
  mk(15, 'P5', {
    [A]: { publishCount: 9, orderCount: 0 },
    [C]: { publishCount: 4, orderCount: 0 },
  }),                                                                                          // 落选（合计13 ≥ 5）
]
const r10 = selectLowPublish(all)
check('共 2 条', r10.length, 2)
check('明细正确', flat(r10), ['P1:广东刘亦菲=1', 'P2:晚梨不吃梨=1,广东刘亦菲=2'])
check('每条合计都 0 < 合计 < 5', r10.every((it) => it.publishCount > 0 && it.publishCount < 5), true)
check('每条都未出单', r10.every((it) => it.orderCount === 0), true)
check('minLack = 5 - 合计', r10.every((it) => it.minLack === 5 - it.publishCount), true)

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
console.log('⑬【防虚增】多账号样品不会因为明细被复制而条数变多')
// 历史故障：mergeSplitSamples 把顶层合计复制给每个账号，导致一个样品被拆成多条。
// 现在按样品判定，一个样品**恒定只占一条**，与账号数无关。
const multi = [
  mk(31, 'M1', { [A]: { publishCount: 1, orderCount: 0 }, [B]: { publishCount: 1, orderCount: 0 } }),
  mk(32, 'M2', { [A]: { publishCount: 1, orderCount: 0 }, [B]: { publishCount: 1, orderCount: 0 }, [C]: { publishCount: 1, orderCount: 0 } }),
]
const r13 = selectLowPublish(multi)
check('2 个样品 → 恰好 2 条', r13.length, 2)
check('3 账号的样品也只占 1 条', r13.filter((it) => it.sample.name === 'M2').length, 1)

console.log()
console.log(`===== 通过 ${pass} / ${pass + fail} =====`)
process.exit(fail ? 1 : 0)
