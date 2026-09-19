import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ACCOUNT_COLOR } from '../utils/accounts'
import { LOW_PUBLISH_LIMIT, selectLowPublish } from '../utils/reminders'
import { ReminderListPage, ReminderCard, CardTitleRow, CardActions } from '../components/ReminderListPage'

const ACCENT = '#8b5cf6'

// 发布数分布条：1/2/3/4 条各有多少个账号条目。
// 0 条不在此列表内 —— 口径要求「已发布」，某账号 0 条即该账号未发布。
// 抽成独立组件而不是内联在 extraTop 里：extraTop 是渲染函数，
// 内联时想先算一次 dist 再复用，只能上 IIFE 或重复调用，都不好看。
function DistBar({ list }) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const it of list || []) if (dist[it.publishCount] !== undefined) dist[it.publishCount]++
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
// 条目粒度是「样品 × 账号」：selectLowPublish 返回扁平条目而非样品数组，
// 因为一个样品可能多个账号各自发布不足，它们要独立计数、独立展示。
export function LowPublishSamplesPage() {
  const { samples } = useStore()
  const navigate = useNavigate()

  const base = useMemo(() => selectLowPublish(samples), [samples])

  // 依赖数组必须稳定：sorts 每次渲染都新建会导致 useMemo 失效，这里提到组件外
  const SORTS = useMemo(() => [
    { key: 'countAsc', label: '条数少→多', compare: (a, b) => a.publishCount - b.publishCount },
    { key: 'countDesc', label: '条数多→少', compare: (a, b) => b.publishCount - a.publishCount },
    { key: 'name', label: '名称', compare: (a, b) => (a.sample.name || '').localeCompare(b.sample.name || '', 'zh-Hans-CN') },
  ], [])

  return (
    <ReminderListPage
      title={`发布不足 ${LOW_PUBLISH_LIMIT} 条（${base.length}）`}
      accent={ACCENT}
      base={base}
      sorts={SORTS}
      emptyText={`🎉 所有已发布账号都发满 ${LOW_PUBLISH_LIMIT} 条了`}
      noMatchText="没有符合筛选条件的账号"
      // base 是「样品 × 账号」条目，需告知容器如何解析：
      // 账号筛选要按条目自带的 account 精确匹配（否则会把同样品其它账号的条目也带进来）
      getItem={(it) => ({ sample: it.sample, account: it.account })}
      // 分布条读 list（筛选后）而非 base（全量）：
      // 否则筛了账号后上方数字不变、与下方列表对不上，用户会以为筛选没生效。
      extraTop={({ list }) => list.length > 0 && <DistBar list={list} />}
    >
      {(it) => {
        const s = it.sample
        const { account, publishCount, lack } = it
        const col = ACCOUNT_COLOR[account] || { c: '#64748b', bg: 'rgba(0,0,0,0.06)' }
        return (
          <ReminderCard key={`${s.id}::${account}`} borderColor="#ede9fe">
            <CardTitleRow
              name={s.name}
              badge={(
                <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  已发 {publishCount} 条 · 还差 {lack}
                </span>
              )}
            />

            {/* 账号标签 + 未出单标记：三个筛选条件（已发布 / 不足阈值 / 未出单）都落在同一账号上 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap',
                background: col.bg, color: col.c, border: `1px solid ${col.c}`,
              }}>{account}({publishCount}条)</span>
              <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', color: '#16a34a', background: 'rgba(22,163,74,0.12)', fontWeight: 600, whiteSpace: 'nowrap', alignSelf: 'center' }}>未出单</span>
            </div>

            {/* account 必须传：否则「补发布」会带该样品的全部账号进发布页，
                而用户是从某个具体账号的条目点进来的 */}
            <CardActions
              sample={s}
              account={account}
              onEdit={() => navigate(`/samples/${s.id}/edit`)}
              publishText="📹 补发布"
            />
          </ReminderCard>
        )
      }}
    </ReminderListPage>
  )
}
