/**
 * selectLowPublish 口径单测（node 直接跑，不依赖浏览器）
 * 运行：npx vite-node src/utils/__lowpublish_check.mjs
 * （必须用 vite-node：源码是 Vite 风格的无扩展名导入，node 直跑会 ERR_MODULE_NOT_FOUND）
 *
 * 覆盖：按账号粒度、多账号互不干扰、出单按账号判定、未发布账号不计入
 */
import { selectLowPublish, LOW_PUBLISH_LIMIT } from './reminders'

let pass = 0, fail = 0
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      期望 ${e}\n      实际 ${a}`) }
}

const A = '广东刘亦菲', B = '晚梨不吃梨', C = '努力成为富婆'

// 构造样品：countsByAccount 是唯一数据源
//
// 注意 execByAccount 必须与 publishCount 自洽：store 启动时会跑
// backfillLegacyPublishRecords（src/store.jsx:3656），它把
// 「execByAccount[x]=='published' 但 publishCount==0」当作历史丢数的老样品，
// 会补一条历史发布记录、把条数从 0 顶成 1。本单测直接调 selectLowPublish
// 不经过 store，所以不受影响；但夹具若被拿去跑浏览器验证就会失真，故这里也保持自洽。
const mk = (id, name, accounts, counts) => ({
  id, name, accounts, countsByAccount: counts,
  execByAccount: Object.fromEntries(accounts.map((a) => [a, (counts[a]?.publishCount || 0) > 0 ? 'published' : null])),
  publishHistory: accounts.flatMap((a) =>
    Array.from({ length: counts[a]?.publishCount || 0 }, (_, i) => ({
      recordId: `fixture_${id}_${a}_${i}`, publishDate: '2026-09-02', accounts: [a], qty: 1,
    }))),
})

console.log('阈值 =', LOW_PUBLISH_LIMIT)
console.log()

console.log('① 单账号：已发布但不足5条、未出单 → 应入选')
check('发3条未出单', 
  selectLowPublish([mk(1, 'X', [A], { [A]: { publishCount: 3, orderCount: 0 } })]).map(i => `${i.sample.name}/${i.account}/${i.publishCount}/${i.lack}`),
  ['X/广东刘亦菲/3/2'])

console.log()
console.log('② 已发布但已出单 → 应排除')
check('发3条已出单1',
  selectLowPublish([mk(2, 'X', [A], { [A]: { publishCount: 3, orderCount: 1 } })]).length, 0)

console.log()
console.log('③ 已发满5条 → 应排除')
check('发5条未出单',
  selectLowPublish([mk(3, 'X', [A], { [A]: { publishCount: 5, orderCount: 0 } })]).length, 0)

console.log()
console.log('④ 未发布（0条）→ 应排除（口径要求「已发布」）')
check('发0条',
  selectLowPublish([mk(4, 'X', [A], { [A]: { publishCount: 0, orderCount: 0 } })]).length, 0)

console.log()
console.log('⑤ 多账号：A发1条、B发6条 → 旧逻辑会整体漏掉，新逻辑应只入选A')
const s5 = mk(5, '多号品', [A, B], {
  [A]: { publishCount: 1, orderCount: 0 },
  [B]: { publishCount: 6, orderCount: 0 },
})
check('多账号只选不足的那个',
  selectLowPublish([s5]).map(i => `${i.account}/${i.publishCount}`), ['广东刘亦菲/1'])

console.log()
console.log('⑥ 多账号都发布不足 → 应各自成为独立条目')
const s6 = mk(6, '双不足', [A, C], {
  [A]: { publishCount: 2, orderCount: 0 },
  [C]: { publishCount: 4, orderCount: 0 },
})
check('两个账号各自成条',
  selectLowPublish([s6]).map(i => `${i.account}/${i.publishCount}/${i.lack}`), ['广东刘亦菲/2/3', '努力成为富婆/4/1'])

console.log()
console.log('⑦ 出单按账号判定：A未出单、B已出单 → 只选A')
const s7 = mk(7, '混合出单', [A, B], {
  [A]: { publishCount: 2, orderCount: 0 },
  [B]: { publishCount: 2, orderCount: 5 },
})
check('只选未出单的账号',
  selectLowPublish([s7]).map(i => `${i.account}`), ['广东刘亦菲'])

console.log()
console.log('⑧ 兼容老数据：无 countsByAccount、顶层有 publishCount/orderCount')
const legacy = { id: 8, name: '老样品', account: A, publishCount: 3, orderCount: 0, status: 'published' }
check('老数据可入选',
  selectLowPublish([legacy]).map(i => `${i.sample.name}/${i.account}/${i.publishCount}`), ['老样品/广东刘亦菲/3'])

console.log()
console.log('⑨ 混合数据集：条目数与账号数一致')
const all = [
  mk(11, 'P1', [A], { [A]: { publishCount: 1, orderCount: 0 } }),                 // 入选
  mk(12, 'P2', [A, B], { [A]: { publishCount: 2, orderCount: 0 }, [B]: { publishCount: 7, orderCount: 0 } }), // 入选A
  mk(13, 'P3', [B], { [B]: { publishCount: 4, orderCount: 1 } }),                 // 排除（出单）
  mk(14, 'P4', [C], { [C]: { publishCount: 5, orderCount: 0 } }),                 // 排除（满5）
  mk(15, 'P5', [A, C], { [A]: { publishCount: 1, orderCount: 0 }, [C]: { publishCount: 3, orderCount: 0 } }), // 入选A,C
]
const r9 = selectLowPublish(all)
// P1 入选 A(发1)；P2 入选 A(发2，B 发7已满不算)；P3 排除（已出单）；
// P4 排除（发满5）；P5 入选 A(发1) 与 C(发3) 两条 → 共 4 条，涉及 3 个样品
check('共4条入选', r9.length, 4)
check('涉及3个样品', new Set(r9.map(i => i.sample.id)).size, 3)
check('明细正确',
  r9.map(i => `${i.sample.name}/${i.account}/${i.publishCount}`),
  ['P1/广东刘亦菲/1', 'P2/广东刘亦菲/2', 'P5/广东刘亦菲/1', 'P5/努力成为富婆/3'])
check('全部满足未出单', r9.every(i => i.orderCount === 0), true)
check('全部满足不足阈值', r9.every(i => i.publishCount > 0 && i.publishCount < 5), true)

console.log()
console.log(`===== 通过 ${pass} / ${pass + fail} =====`)
process.exit(fail ? 1 : 0)
