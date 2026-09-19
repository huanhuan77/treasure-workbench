import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { ACCOUNT_COLOR } from '../utils/accounts'
import { LOW_PUBLISH_LIMIT, selectLowPublish } from '../utils/reminders'
import { ReminderListPage, ReminderCard, CardTitleRow, CardActions } from '../components/ReminderListPage'

const ACCENT = '#8b5cf6'

// 发布数分布条：1/2/3/4 条各有多少个**样品**。
// 0 条不在此列表内 —— 口径要求「已发布」，0 条即未发布。
// 判定是样品级的（合计 < 5），所以分布也按样品计数：
// 一个样品即使有多个账号，它在「合计几条」这个维度上只有一个值。
function DistBar({ list }) {
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const it of list || []) {
    const n = Number(it.publishCount) || 0
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
// 判定**按样品合计**：把样品所有账号的发布数加在一起，合计 < 5 且未出单才入选。
// 展示**按样品**：一个样品一条，卡片里列出各账号的条数分布供参考，
//   不按账号拆条 —— 拆条会让列表凭空变长（曾经踩过：25 条被拆成更多）。
// 已放弃/归档的样品不在此列表（它已经不做了，再催补发布是错的）。
export function LowPublishSamplesPage() {
  const { samples } = useStore()
  const navigate = useNavigate()

  const base = useMemo(() => selectLowPublish(samples), [samples])

  // 依赖数组必须稳定：sorts 每次渲染都新建会导致 useMemo 失效，这里提到组件外
  // 排序读 item.publishCount / item.name 会拿到 undefined（条目是 { sample, accounts, ... }），
  // 故统一从 sample 与 minPublishCount 取。
  const SORTS = useMemo(() => [
    { key: 'countAsc', label: '条数少→多', compare: (a, b) => (a.minPublishCount || 0) - (b.minPublishCount || 0) },
    { key: 'countDesc', label: '条数多→少', compare: (a, b) => (b.minPublishCount || 0) - (a.minPublishCount || 0) },
    { key: 'name', label: '名称', compare: (a, b) => (a.sample?.name || '').localeCompare(b.sample?.name || '', 'zh-Hans-CN') },
  ], [])

  return (
    <ReminderListPage
      title={`发布不足 ${LOW_PUBLISH_LIMIT} 条（${base.length}）`}
      accent={ACCENT}
      base={base}
      sorts={SORTS}
      emptyText={`🎉 所有样品都发满 ${LOW_PUBLISH_LIMIT} 条了`}
      noMatchText="没有符合筛选条件的样品"
      // base 是 { sample, accounts, ... } 条目，需告知容器如何取出样品与账号：
      // 账号筛选按「该样品有任一账号命中」匹配，语义与页面口径一致。
      getItem={(it) => ({ sample: it.sample, account: null })}
      // 分布条读 list（筛选后）而非 base（全量）：
      // 否则筛了账号后上方数字不变、与下方列表对不上，用户会以为筛选没生效。
      extraTop={({ list }) => list.length > 0 && <DistBar list={list} />}
    >
      {(it) => {
        const s = it.sample
        return (
          <ReminderCard key={s.id} borderColor="#ede9fe">
            <CardTitleRow
              name={s.name}
              badge={(
                <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  还差 {it.minLack} 条{it.accounts.length > 1 ? ` · ${it.accounts.length} 个账号` : ''}
                </span>
              )}
            />

            {/* 列出各账号的条数分布（账号主题色，跨页面一致），供参考该给谁补。
                判定在样品级，所以这里列的是「有发布记录的账号」，不是「未达标账号」。
                不显示「未出单」标记：能进这个列表本身就意味着未出单，属冗余信息。 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {it.accounts.map(({ account: a, publishCount: n }) => {
                const col = ACCOUNT_COLOR[a] || { c: '#64748b', bg: 'rgba(0,0,0,0.06)' }
                return (
                  <span key={a} style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap',
                    background: col.bg, color: col.c, border: `1px solid ${col.c}`,
                  }}>{a}({n}条)</span>
                )
              })}
            </div>

            {/* 带这些账号：从卡片点「补发布」时预选它们，
                与卡片上展示的分布保持一致，不用用户再手选 */}
            <CardActions
              sample={s}
              onEdit={() => navigate(`/samples/${s.id}/edit`)}
              publishText="📹 补发布"
              publishAccounts={it.accounts.map((x) => x.account)}
            />
          </ReminderCard>
        )
      }}
    </ReminderListPage>
  )
}
