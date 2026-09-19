import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ACCOUNTS, getAccounts } from '../utils/accounts'

// 提醒中心三个列表页共用的骨架
//
// 为什么要抽：发布提醒 / 即将到期 / 发布不足5条 三个页面本是同一族，
// 原先各写一套外壳，导致筛选、搜索、排序、底部留白、空状态五处都不一致。
// 这里统一外壳与筛选交互，页面只负责「基础口径 + 排序项 + 卡片内容」。
//
// 注意底部留白：BottomNav 是固定定位，列表末条若不留够高度会被盖住。
// 统一用 calc(80px + safe-bottom)，三页一致。

function PageHeader({ title, onBack }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: 'calc(12px + var(--safe-top)) 16px 12px',
      borderBottom: '1px solid rgba(236,72,153,0.12)',
      background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 100%)',
      flexShrink: 0,
    }}>
      <button onClick={onBack} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
      <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>{title}</h1>
    </div>
  )
}

// 胶囊按钮：账号筛选与排序共用
function Pill({ active, onClick, children, accent = '#ec4899' }) {
  return (
    <button onClick={onClick} style={{
      flex: '0 0 auto', padding: '4px 12px', borderRadius: '999px',
      fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      border: active ? 'none' : '1px solid rgba(244,114,182,0.3)',
      background: active ? `linear-gradient(135deg,${accent},${accent}dd)` : 'rgba(255,255,255,0.7)',
      color: active ? '#fff' : 'var(--text-sub)',
      transition: 'background .15s, color .15s',
    }}>{children}</button>
  )
}

/**
 * @param title       标题文案（通常带总数）
 * @param accent      主强调色，用于排序选中态
 * @param base        基础口径过滤后的数组（页面的「全部」数据）
 * @param sorts       排序项 [{ key, label, compare(a,b) }]，第一项为默认
 * @param searchKeys  搜索匹配的字段访问器数组，默认按 name
 * @param extraTop    筛选区下方的额外内容（如分布条），接收 { base, list }。
 *                    base = 未筛选的全量，list = 当前筛选后的结果 ——
 *                    分布条这类「跟着筛选走」的展示请读 list，
 *                    需要「总量」参照时才读 base。
 * @param emptyText   基础口径为空时的文案
 * @param noMatchText 有数据但被筛选/搜索筛空时的文案
 * @param children    渲染单条卡片：(item) => JSX
 * @param getItem     条目适配器，把 base 里的一项解析成 { sample, account }
 *
 * 为什么需要 getItem：
 *   本组件原先假设 base 是「样品数组」，筛选/搜索都直接读 item.name 与 getAccounts(item)。
 *   但「发布不足5条」的口径是**按账号**的，它的 base 是「样品 × 账号」扁平条目
 *   { sample, account, ... }，直接读 name 会拿到 undefined、筛选也会失效。
 *   故把「如何从条目取出样品与账号」抽象成注入项：
 *   默认实现对应样品数组（账号取第一个，用于账号筛选的兜底匹配），
 *   按账号口径的页面传入自定义实现即可，筛选与搜索逻辑无需各写一套。
 */
export function ReminderListPage({
  title, accent = '#ec4899', base, sorts, searchKeys, extraTop,
  emptyText = '暂无数据', noMatchText = '没有符合筛选条件的样品', children,
  getItem = (it) => ({ sample: it, account: null }),
}) {
  const navigate = useNavigate()
  const [accountFilter, setAccountFilter] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [sortKey, setSortKey] = useState(sorts[0]?.key)

  const list = useMemo(() => {
    let r = base || []
    // 账号筛选：条目自带 account 时按它精确匹配，否则退回「样品归属账号」判断。
    // 按账号口径的条目必须走前一条 —— 用「样品归属」会把同样品其它账号的条目也带进来。
    if (accountFilter !== 'all') {
      r = r.filter((it) => {
        const { sample, account } = getItem(it)
        return account ? account === accountFilter : getAccounts(sample).includes(accountFilter)
      })
    }
    const kw = keyword.trim().toLowerCase()
    if (kw) {
      const keys = searchKeys || [({ sample }) => sample?.name]
      r = r.filter((it) => keys.some((k) => String(k(it) || '').toLowerCase().includes(kw)))
    }
    const arr = [...r]
    const cur = sorts.find((o) => o.key === sortKey) || sorts[0]
    if (cur?.compare) arr.sort(cur.compare)
    return arr
  }, [base, accountFilter, keyword, sortKey, sorts, searchKeys, getItem])

  const filtered = accountFilter !== 'all' || keyword.trim() !== ''

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh' }}>
      <PageHeader title={title} onBack={() => navigate(-1)} />

      {/* 筛选区：账号胶囊 + 搜索框 + 排序胶囊 */}
      <div style={{ padding: '10px 16px 6px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
        <div className="hide-scrollbar" style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {[{ k: 'all', label: '全部账号' }, ...ACCOUNTS.map((a) => ({ k: a, label: a }))].map((o) => (
            <Pill key={o.k} active={accountFilter === o.k} accent={accent} onClick={() => setAccountFilter(o.k)}>{o.label}</Pill>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          background: '#fff', borderRadius: '999px', padding: '7px 12px',
          boxShadow: '0 2px 10px rgba(244,114,182,0.06)',
        }}>
          <span style={{ fontSize: '13px', opacity: 0.6, flexShrink: 0 }}>🔍</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索样品名"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', fontSize: '13px', background: 'transparent', color: 'var(--text-main)' }}
          />
          {keyword && (
            <button onClick={() => setKeyword('')} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-sub)', padding: 0, flexShrink: 0 }}>✕</button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>排序</span>
          {sorts.map((o) => (
            <Pill key={o.key} active={sortKey === o.key} accent={accent} onClick={() => setSortKey(o.key)}>{o.label}</Pill>
          ))}
        </div>

        {/* 筛选生效时给出「已筛掉多少条 + 一键清空」，避免用户以为数据丢了 */}
        {filtered && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-sub)' }}>
              {accountFilter !== 'all' ? `账号：${accountFilter}` : ''}
              {accountFilter !== 'all' && keyword ? ' · ' : ''}
              {keyword ? `关键词：${keyword}` : ''}
              {` · 命中 ${list.length} / ${(base || []).length} 条`}
            </span>
            <button
              onClick={() => { setAccountFilter('all'); setKeyword('') }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: accent, padding: 0, flexShrink: 0 }}
            >清空筛选</button>
          </div>
        )}
      </div>

      {extraTop ? extraTop({ base: base || [], list }) : null}

      {/* 列表：底部留出 BottomNav 高度，避免最后几条被遮挡 */}
      <div style={{ padding: '8px 12px calc(80px + var(--safe-bottom, 0px))' }}>
        {list.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '30px 16px', textAlign: 'center', color: filtered ? 'var(--text-sub)' : '#16a34a', fontSize: '13px' }}>
            {filtered ? noMatchText : emptyText}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {list.map((s) => children(s))}
          </div>
        )}
      </div>
    </div>
  )
}

// 卡片外壳：三个页面的卡片结构一致（标题行 + 详情行 + 按钮行）
export function ReminderCard({ children, borderColor = '#fecdd3' }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${borderColor}`, borderRadius: '10px', padding: '8px 12px' }}>
      {children}
    </div>
  )
}

// 卡片标题行：样品名 + 右侧徽标
export function CardTitleRow({ name, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      {badge}
    </div>
  )
}

// 卡片按钮行：补发布 / 调整状态，三页文案统一
//
// account 为可选：按账号口径的列表页（发布不足5条）必须传它，否则「补发布」
// 会把该样品的**全部**账号带进发布记录页，而用户明明是从某个账号的条目点进来的。
// 发布记录页优先读 account 单值（见 NewPublishRecordPage.jsx:36），
// 传单值即可精确预选，无需再动 accounts 数组。
export function CardActions({ sample, account, onEdit, publishText = '📹 补记发布' }) {
  const navigate = useNavigate()
  return (
    <div style={{ marginTop: '7px', display: 'flex', gap: '8px' }}>
      <button
        onClick={() => navigate('/publish-record/new', {
          state: account
            ? { sampleId: sample.id, account }
            : { sampleId: sample.id, accounts: getAccounts(sample) },
        })}
        style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', background: '#ec4899', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
      >{publishText}</button>
      <button
        onClick={() => (onEdit ? onEdit(sample) : navigate(`/samples/${sample.id}/edit`))}
        style={{ flex: 1, padding: '7px 0', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.6)', color: 'var(--text-sub)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
      >调整状态</button>
    </div>
  )
}
