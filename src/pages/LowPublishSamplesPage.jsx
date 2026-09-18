import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getAccounts, ACCOUNT_COLOR } from '../utils/accounts'
import { SAMPLE_STATUS } from '../utils/sampleStatus'
import { LOW_PUBLISH_LIMIT, selectLowPublish } from '../utils/reminders'
import { ReminderListPage, ReminderCard, CardTitleRow, CardActions } from '../components/ReminderListPage'

const ACCENT = '#8b5cf6'

// 「发布不足 N 条」列表页
// 口径来自 utils/reminders，与总览 Tab 计数同源
export function LowPublishSamplesPage() {
  const { samples } = useStore()
  const navigate = useNavigate()

  const base = useMemo(() => selectLowPublish(samples), [samples])

  // 顶部统计：发布数分布（0/1/2/3/4 条各几个）
  const dist = useMemo(() => {
    const d = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 }
    base.forEach((s) => { const n = Number(s.publishCount) || 0; if (d[n] !== undefined) d[n]++ })
    return d
  }, [base])

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
      emptyText={`🎉 所有已发布产品都发满 ${LOW_PUBLISH_LIMIT} 条了`}
      noMatchText="没有符合筛选条件的样品"
      extraTop={({ base: b }) => b.length > 0 && (
        <div style={{ padding: '4px 16px 2px', display: 'flex', gap: '6px', flexShrink: 0 }}>
          {[0, 1, 2, 3, 4].map((n) => (
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
      )}
    >
      {(s) => {
        const st = SAMPLE_STATUS[s.status] || SAMPLE_STATUS.published
        const count = Number(s.publishCount) || 0
        return (
          <ReminderCard key={s.id} borderColor="#ede9fe">
            <CardTitleRow
              name={s.name}
              badge={(
                <span style={{ fontSize: '10px', fontWeight: 700, color: ACCENT, background: '#ede9fe', padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  已发 {count} 条 · 还差 {LOW_PUBLISH_LIMIT - count}
                </span>
              )}
            />

            {/* 按账号显示各自发布数，不足阈值的标黄 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {getAccounts(s).map((a) => {
                const ac = (s.countsByAccount && s.countsByAccount[a]?.publishCount) || 0
                const lack = ac < LOW_PUBLISH_LIMIT
                return (
                  <span key={a} style={{
                    fontSize: '10px', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, whiteSpace: 'nowrap',
                    background: lack ? '#fef3c7' : (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg,
                    color: lack ? '#d97706' : (ACCOUNT_COLOR[a] || { c: '#64748b' }).c,
                  }}>{a}({ac}条)</span>
                )
              })}
              <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', color: st.color, background: st.bg, fontWeight: 600, whiteSpace: 'nowrap', alignSelf: 'center' }}>{st.icon} {st.label}</span>
            </div>

            <CardActions sample={s} onEdit={() => navigate(`/samples/${s.id}/edit`)} publishText="📹 补发布" />
          </ReminderCard>
        )
      }}
    </ReminderListPage>
  )
}
