import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { getAccounts, ACCOUNT_COLOR } from '../utils/accounts'
import { SAMPLE_STATUS } from '../utils/sampleStatus'
import { EXPIRING_DAYS, daysUntilDeadline, selectExpiringSoon } from '../utils/reminders'
import { ReminderListPage, ReminderCard, CardTitleRow, CardActions } from '../components/ReminderListPage'

const ACCENT = '#f97316'

// 「即将到期」列表页
// 口径来自 utils/reminders，与总览 Tab 计数同源
export function ExpiringSamplesPage() {
  const { samples } = useStore()
  const navigate = useNavigate()

  // 基础口径已按截止日升序，故首项排序即「最紧急优先」
  const base = useMemo(() => selectExpiringSoon(samples), [samples])

  const SORTS = useMemo(() => [
    { key: 'deadlineAsc', label: '最紧急优先', compare: (a, b) => (daysUntilDeadline(a.deadline) ?? 999) - (daysUntilDeadline(b.deadline) ?? 999) },
    { key: 'deadlineDesc', label: '最宽松优先', compare: (a, b) => (daysUntilDeadline(b.deadline) ?? 999) - (daysUntilDeadline(a.deadline) ?? 999) },
    { key: 'name', label: '名称', compare: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN') },
  ], [])

  return (
    <ReminderListPage
      title={`即将到期（${base.length}）`}
      accent={ACCENT}
      base={base}
      sorts={SORTS}
      emptyText={`🎉 近 ${EXPIRING_DAYS} 天没有即将到期的样品`}
      noMatchText="没有符合筛选条件的样品"
    >
      {(s, { accountFilter } = {}) => {
        const st = SAMPLE_STATUS[s.status] || SAMPLE_STATUS.published
        const du = daysUntilDeadline(s.deadline)
        const overdue = du !== null && du < 0
        const text = overdue
          ? `已逾期 ${Math.abs(du)} 天（截止 ${s.deadline}）`
          : du === 0 ? `今天截止（${s.deadline}）` : `剩 ${du} 天（截止 ${s.deadline}）`
        const color = overdue ? '#ef4444' : du <= 3 ? '#ea580c' : '#ca8a04'
        // 用户筛了账号就只显示该账号，避免"筛了一个账号却看到别的账号标签"
        const all = getAccounts(s)
        const showAccounts = (accountFilter && accountFilter !== 'all' && all.includes(accountFilter))
          ? [accountFilter]
          : all
        return (
          <ReminderCard key={s.id} borderColor="#fecdd3">
            <CardTitleRow
              name={s.name}
              badge={(
                <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', color: st.color, background: st.bg, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {st.icon} {st.label}
                </span>
              )}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '3px' }}>
              <span style={{ fontSize: '11px', color, fontWeight: 600, lineHeight: 1.4 }}>⏰ {text}</span>
              {showAccounts.map((a) => (
                <span key={a} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
              ))}
            </div>
            <CardActions
              sample={s}
              account={accountFilter && accountFilter !== 'all' ? accountFilter : undefined}
              onEdit={() => navigate(`/samples/${s.id}/edit`)}
            />
          </ReminderCard>
        )
      }}
    </ReminderListPage>
  )
}
