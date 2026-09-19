import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ACCOUNT_COLOR } from '../utils/accounts'
import { getAccounts, getCounts } from '../utils/sampleStatus'
import { LOW_PUBLISH_LIMIT, selectLowPublish } from '../utils/reminders'
import { ReminderListPage, ReminderCard, CardTitleRow, CardActions } from '../components/ReminderListPage'

const ACCENT = '#8b5cf6'

// 发布数分布条：1/2/3/4 条各有多少条。
// 0 条不在此列表内 —— 口径要求「已发布」，0 条即未发布。
// 抽成独立组件而不是内联在 extraTop 里：extraTop 是渲染函数，
// 内联时想先算一次 dist 再复用，只能上 IIFE 或重复调用，都不好看。
function DistBar({ list }) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const s of list || []) {
    const n = Number(s.publishCount) || 0
    if (dist[n] !== undefined) dist[n]++
  }
  return (
    <div style={{ padding: '4px 16px 2px', display: 'flex', gap: '6px', flexShrink: 0 }}>
      {[1, 2, 3, 4].map((n) => (
        <div key={n} style={{
          flex: '1 1 0', minWidth: 0, textAlign: 'center', padding: '6px 2px',
          background: dist[n] > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
          border: '1px solid rgba(255,255,255,0.9)', borderRadius: '10px',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--text-sub)', fontWeight: 600, whiteSpace: 'nowrap' }}>发{n}条</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: dist[n] > 0 ? 'var(--text-main)' : '#cfc4c8', lineHeight: 1.2 }}>{dist[n]}</div>
        </div>
      ))}
    </div>
  )
}

// 「发布不足 N 条」列表页
// 口径来自 utils/reminders，与总览 Tab 计数同源。
//
// 条目粒度是**样品**：一个样品一条。曾经短暂改成「样品 × 账号」粒度，
// 但那会把列表撑大 —— 早期「一个样品属于一个账号」的数据在 mergeSplitSamples
// 合并后，顶层计数被原样复制给每个账号，导致「已发 3 条」的三账号样品
// 被当成三个账号各自「已发 3 条」而拆成 3 条。改成样品粒度后计数与列表一一对应。
// 账号维度改用「标签 + 各自条数」表达：主数字仍是样品合计，账号标签后附该账号
// 自己的条数（无分账号明细时即为合计值），既能看出是哪些账号，又不会因此拆条。
export function LowPublishSamplesPage() {
  const { samples } = useStore()
  const navigate = useNavigate()

  const base = useMemo(() => selectLowPublish(samples), [samples])

  // 依赖数组必须稳定：sorts 每次渲染都新建会导致 useMemo 失效，这里提到组件外
  const SORTS = useMemo(() => [
    { key: 'countAsc', label: '条数少→多', compare: (a, b) => (Number(a.publishCount) || 0) - (Number(b.publishCount) || 0) },
    { key: 'countDesc', label: '条数多→少', compare: (a, b) => (Number(b.publishCount) || 0) - (Number(a.publishCount) || 0) },
    { key: 'name', label: '名称', compare: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN') },
  ], [])

  return (
    <ReminderListPage
      title={`发布不足 ${LOW_PUBLISH_LIMIT} 条（${base.length}）`}
      accent={ACCENT}
      base={base}
      sorts={SORTS}
      emptyText={`🎉 所有已发布样品都发满 ${LOW_PUBLISH_LIMIT} 条了`}
      noMatchText="没有符合筛选条件的样品"
      // 分布条读 list（筛选后）而非 base（全量）：
      // 否则筛了账号后上方数字不变、与下方列表对不上，用户会以为筛选没生效。
      extraTop={({ list }) => list.length > 0 && <DistBar list={list} />}
    >
      {(s) => {
        const publishCount = Number(s.publishCount) || 0
        const lack = Math.max(0, LOW_PUBLISH_LIMIT - publishCount)
        return (
          <ReminderCard key={s.id} borderColor="#ede9fe">
            <CardTitleRow
              name={s.name}
              badge={(
                <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  已发 {publishCount} 条 · 还差 {lack}
                </span>
              )}
            />

            {/* 账号标签 + 各自条数 + 未出单标记。
                标签用账号主题色（同一账号在各页面颜色一致，便于辨认）。
                条数取该账号自己的统计；老数据没有分账号明细时会回退成样品的
                合计值（getCounts 的兼容行为），此时各账号显示同一个数字。 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {getAccounts(s).map((a) => {
                const col = ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(0,0,0,0.06)' }
                const acctCount = getCounts(s, a).publishCount
                return (
                  <span key={a} style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap',
                    background: col.bg, color: col.c, border: `1px solid ${col.c}`,
                  }}>{a}({acctCount}条)</span>
                )
              })}
              <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', color: '#16a34a', background: 'rgba(22,163,74,0.12)', fontWeight: 600, whiteSpace: 'nowrap', alignSelf: 'center' }}>未出单</span>
            </div>

            <CardActions
              sample={s}
              onEdit={() => navigate(`/samples/${s.id}/edit`)}
              publishText="📹 补发布"
            />
          </ReminderCard>
        )
      }}
    </ReminderListPage>
  )
}
