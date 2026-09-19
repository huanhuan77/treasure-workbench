/**
 * selectLowPublish 口径单测（node 直接跑，不依赖浏览器）
 * 运行：pnpm check:lowpublish
 * （必须用 vite-node：源码是 Vite 风格的无扩展名导入，node 直跑会 ERR_MODULE_NOT_FOUND）
 *
 * 覆盖：样品粒度、只算已发布且未出单、多账号不拆条（关键回归）、老数据兼容
 */
import { selectLowPublish, lowPublishCounts, LOW_PUBLISH_LIMIT } from './reminders'

let pass = 0, fail = 0
function check(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a === e) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name}\n      期望 ${e}\n      实际 ${a}`) }
}

const A = '广东刘亦菲', B = '晚梨不吃梨', C = '努力成为富婆'

// 构造样品。
//
// 注意：selectLowPublish 读的是**顶层** publishCount / orderCount
// （store 维护的样品级合计影子字段），所以夹具必须把顶层写好。
// countsByAccount 一并写上，是为了让「账号标签后的条数」也有数据可读。
const mk = (id, name, accounts, counts) => {
  const perAcc = counts || {}
  const publishCount = accounts.reduce((n, a) => n + (perAcc[a]?.publishCount || 0), 0)
  const orderCount = accounts.reduce((n, a) => n + (perAcc[a]?.orderCount || 0), 0)
  return {
    id, name, accounts, countsByAccount: perAcc,
    publishCount, orderCount,
    // execByAccount 与 publishCount 保持一致：store 启动时会跑
    // backfillLegacyPublishRecords（src/store.jsx:3656），把
    // 「execByAccount[x]=='published' 但 publishCount==0」当作历史丢数的老样品补记一条。
    execByAccount: Object.fromEntries(accounts.map((a) => [a, (perAcc[a]?.publishCount || 0) > 0 ? 'published' : null])),
    publishHistory: accounts.flatMap((a) =>
      Array.from({ length: perAcc[a]?.publishCount || 0 }, (_, i) => ({
        recordId: `fixture_${id}_${a}_${i}`, publishDate: '2026-09-02', accounts: [a], qty: 1,
      }))),
  }
}

console.log('阈值 =', LOW_PUBLISH_LIMIT)
console.log()

console.log('① 单账号：已发布但不足5条、未出单 → 应入选')
check('发3条未出单',
  selectLowPublish([mk(1, 'X', [A], { [A]: { publishCount: 3, orderCount: 0 } })]).map(s => `${s.name}/${s.publishCount}`),
  ['X/3'])

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
console.log('⑤【关键回归】多账号样品只出 1 条，不按账号拆条')
// 这是用户实测「25 条被拆成更多」的根因：mergeSplitSamples 合并老数据后
// 把顶层计数原样复制给每个账号，按账号迭代就会把一个样品拆成 N 条。
const s5 = mk(5, '三号品', [A, B, C], { [A]: { publishCount: 1, orderCount: 0 } })
check('三账号样品只贡献1条', selectLowPublish([s5]).length, 1)
check('返回的是样品本身', selectLowPublish([s5]).map(s => s.name), ['三号品'])

console.log()
console.log('⑥ 多账号各自发布不足 → 仍只出 1 条（合计判断）')
const s6 = mk(6, '双不足', [A, C], {
  [A]: { publishCount: 2, orderCount: 0 },
  [C]: { publishCount: 2, orderCount: 0 },
})
check('合计4条 → 入选且只有1条', selectLowPublish([s6]).length, 1)
check('合计条数 = 4', selectLowPublish([s6]).map(s => s.publishCount), [4])

console.log()
console.log('⑦ 任一账号出单 → 该样品整体排除（合计口径）')
const s7 = mk(7, '混合出单', [A, B], {
  [A]: { publishCount: 2, orderCount: 0 },
  [B]: { publishCount: 2, orderCount: 1 },
})
check('合计已出单 → 排除', selectLowPublish([s7]).length, 0)

console.log()
console.log('⑧ 兼容老数据：无 countsByAccount、顶层有 publishCount/orderCount')
const legacy = { id: 8, name: '老样品', account: A, publishCount: 3, orderCount: 0, status: 'published' }
check('老数据可入选',
  selectLowPublish([legacy]).map(s => `${s.name}/${s.publishCount}`), ['老样品/3'])
check('老数据只1条', selectLowPublish([legacy]).length, 1)

console.log()
console.log('⑨ 混合数据集：条目数 = 入选样品数（不再是账号数）')
const all = [
  mk(11, 'P1', [A], { [A]: { publishCount: 1, orderCount: 0 } }),                                  // 入选（合计1）
  mk(12, 'P2', [A, B], { [A]: { publishCount: 2, orderCount: 0 }, [B]: { publishCount: 1, orderCount: 0 } }), // 入选（合计3）
  mk(13, 'P3', [B], { [B]: { publishCount: 4, orderCount: 1 } }),                                  // 排除（出单）
  mk(14, 'P4', [C], { [C]: { publishCount: 5, orderCount: 0 } }),                                  // 排除（满5）
  mk(15, 'P5', [A, C], { [A]: { publishCount: 1, orderCount: 0 }, [C]: { publishCount: 8, orderCount: 0 } }), // 排除（合计9 ≥ 5）
]
const r9 = selectLowPublish(all)
check('共2条入选', r9.length, 2)
check('明细正确', r9.map(s => `${s.name}/${s.publishCount}`), ['P1/1', 'P2/3'])
check('全部满足未出单', r9.every(s => (Number(s.orderCount) || 0) === 0), true)
check('全部满足不足阈值', r9.every(s => { const n = Number(s.publishCount) || 0; return n > 0 && n < 5 }), true)
check('涉及样品数 = 条目数', new Set(r9.map(s => s.id)).size, r9.length)

console.log()
console.log('⑩ lowPublishCounts：卡片文案「已发 N 条 · 还差 M」')
check('发3条 → 还差2', lowPublishCounts(mk(20, 'Y', [A], { [A]: { publishCount: 3, orderCount: 0 } })),
  { publishCount: 3, lack: 2 })
check('发0条 → 还差5（不出现负数）', lowPublishCounts({ publishCount: 0, orderCount: 0 }),
  { publishCount: 0, lack: 5 })

console.log()
console.log(`===== 通过 ${pass} / ${pass + fail} =====`)
process.exit(fail ? 1 : 0)
