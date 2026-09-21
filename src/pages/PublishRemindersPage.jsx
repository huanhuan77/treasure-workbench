import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { daysSincePublish, daysSincePublishByAccount, pendingAccounts, isOverdue } from '../utils/publish'
import { getAccounts, ACCOUNT_COLOR } from '../utils/accounts'
import { SAMPLE_STATUS } from '../utils/sampleStatus'
import { selectPublishReminders } from '../utils/reminders'
import { ReminderListPage, ReminderCard, CardTitleRow, CardActions } from '../components/ReminderListPage'

const ACCENT = '#ec4899'

// 「发布提醒」列表页
// 口径来自 utils/reminders → publish.needPublishReminder，与总览 Tab 计数同源
export function PublishRemindersPage() {
  const { samples } = useStore()
  const navigate = useNavigate()

  const base = useMemo(() => selectPublishReminders(samples), [samples])

  const SORTS = useMemo(() => [
    // 最该处理的排前面：逾期优先，其次「多久没发视频」由久到近
    {
      key: 'urgent',
      label: '最紧急优先',
      compare: (a, b) => {
        const oa = isOverdue(a) ? 1 : 0
        const ob = isOverdue(b) ? 1 : 0
        if (oa !== ob) return ob - oa
        const da = daysSincePublish(a)
        const db = daysSincePublish(b)
        const na = da === Infinity ? Number.MAX_SAFE_INTEGER : da
        const nb = db === Infinity ? Number.MAX_SAFE_INTEGER : db
        return nb - na
      },
    },
    { key: 'name', label: '名称', compare: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hans-CN') },
  ], [])

  return (
    <ReminderListPage
      title={`发布提醒（${base.length}）`}
      accent={ACCENT}
      base={base}
      sorts={SORTS}
      emptyText="🎉 没有需要提醒的样品，都已按时发了视频"
      noMatchText="没有符合筛选条件的样品"
    >
      {(s, { accountFilter } = {}) => {
        const st = SAMPLE_STATUS[s.status] || SAMPLE_STATUS.published
        const days = daysSincePublish(s)
        // 只显示还需要发视频的账号（从未发过 / 超阈值没发）；都发过则显示全部
        const pending = pendingAccounts(s)
        const all = pending.length ? pending : getAccounts(s)
        // 用户筛了账号就只显示该账号 —— 否则从「广东刘亦菲」进来却看到
        // 「努力成为富婆」的标签，会以为筛选没生效。
        // 若所选账号不在本样品的待发名单里（本不该出现，防御性处理），退回全量避免卡片空标签。
        const showAccounts = (accountFilter && accountFilter !== 'all' && all.includes(accountFilter))
          ? [accountFilter]
          : all
        // 文案里的天数也跟着「待发账号」走，避免出现「已 0 天没发」这类矛盾
        const daysText = pending.length
          ? Math.max(...pending.map((a) => daysSincePublishByAccount(s, a)))
          : days
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
              {/* 已发布的样品不显示时间提示（逾期/已 N 天没发） */}
              {s.status !== 'published' && (
                <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, lineHeight: 1.4 }}>
                  {isOverdue(s)
                    ? `⚠ 已逾期（截止 ${s.deadline}）`
                    : `⚠ ${(daysText === Infinity ? '从未发布过视频' : `已 ${daysText} 天没发视频`)}（出单品需持续发）`}
                </span>
              )}
              {showAccounts.map((a) => (
                <span key={a} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
              ))}
            </div>
            {/* 筛了账号就把该账号带进发布页；未筛则交给 CardActions 默认带全部账号 */}
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
