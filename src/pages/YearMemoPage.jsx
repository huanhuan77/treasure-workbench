// 年度备忘录（独立页面，刻意不挂在 PC 工作台侧边栏框架里）
// · 只在电脑上用：窄屏（手机）访问自动回工作台总览（用户明确「手机不要这个功能」）
// · 一年 12 个月，每月一张 7 列（周一→周日）× 6 行的日历表
// · 每天最多 5 条记事；新增/编辑/删除都在**弹窗**里完成（用户要求弹窗，不要格子内小输入框）
// · 数据独立存 localStorage.year_memo_v1，同时纳入云备份 KEYS
//   { '2026-01-04': ['约了闺蜜逛街', '…'] }
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const KEY = 'year_memo_v1'
const MAX_PER_DAY = 5
const WEEK_LABEL = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
const MONTH_LABEL = ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月', '7 月', '8 月', '9 月', '10 月', '11 月', '12 月']

const G = {
  bg: '#f2f6ec',
  head: '#2f5d34',
  weekHead: '#3a6b3c',
  line: '#dfe7d4',
  text: '#2f3a2c',
  muted: '#8b9683',
  accent: '#4b7d43',
  todayBg: '#eef6e2',
}

const pad2 = (n) => String(n).padStart(2, '0')
const ymd = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`
const todayStr = () => {
  const t = new Date()
  return ymd(t.getFullYear(), t.getMonth(), t.getDate())
}

// 每条记事 = { t: 文本, done: 是否完成 }；兼容早期存的纯字符串数组
const normItem = (it) => {
  if (typeof it === 'string') return { t: it, done: false }
  if (it && typeof it === 'object') return { t: String(it.t || ''), done: !!it.done }
  return { t: '', done: false }
}

function loadMemo() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out = {}
    Object.keys(raw).forEach((k) => {
      const arr = Array.isArray(raw[k]) ? raw[k].map(normItem).filter((x) => x.t) : []
      if (arr.length) out[k] = arr
    })
    return out
  } catch (e) {
    return {}
  }
}

// 一个月铺成 6 行 × 7 列（周一起始）→ [{ day, date } | null]
function buildCells(year, month) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // 0 = 周一
  const days = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < 42; i++) {
    const day = i - firstDow + 1
    cells.push(day >= 1 && day <= days ? { day, date: ymd(year, month, day) } : null)
  }
  return cells
}

export default function YearMemoPage() {
  const navigate = useNavigate()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-11，一次只看一个月
  const [memo, setMemo] = useState(loadMemo)
  const [dayModal, setDayModal] = useState(null) // 正在弹窗编辑的日期 'YYYY-MM-DD'
  const today = todayStr()

  // 手机不要这个功能：窄屏打开就直接送回工作台总览
  useEffect(() => {
    if (window.innerWidth < 768) navigate('/', { replace: true })
  }, [])

  // 独立页：挂上 memo-mode 去掉工作台的侧边栏留白与粉色底
  useEffect(() => {
    document.body.classList.add('memo-mode')
    return () => document.body.classList.remove('memo-mode')
  }, [])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(memo)) } catch (e) { /* 满/隐私模式忽略 */ }
  }, [memo])

  // 弹窗开着时按 Esc 关闭
  useEffect(() => {
    if (!dayModal) return
    const onKey = (e) => { if (e.key === 'Escape') closeModal() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const cells = useMemo(() => buildCells(year, month), [year, month])

  const listOf = (date) => (memo[date] || []).map(normItem)

  // 编辑期允许空槽存在（否则清空输入框重打时条目会消失），关弹窗时再统一清理
  const writeDay = (date, next) => {
    setMemo((prev) => {
      const copy = { ...prev }
      const list = next.map((it) => ({ t: it.t || '', done: !!it.done }))
      if (list.length) copy[date] = list
      else delete copy[date]
      return copy
    })
  }

  const toggleDone = (date, idx) => {
    const cur = listOf(date).map((it, i) => (i === idx ? { ...it, done: !it.done } : it))
    writeDay(date, cur)
  }

  const removeItem = (date, idx) => {
    writeDay(date, listOf(date).filter((_, i) => i !== idx))
  }

  // 关闭弹窗时把空条目清掉
  const closeModal = () => {
    if (dayModal) {
      const cur = listOf(dayModal)
      if (cur.some((it) => !it.t.trim())) writeDay(dayModal, cur.filter((it) => it.t.trim()))
    }
    setDayModal(null)
  }

  const goPrevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) } else setMonth((m) => m - 1)
  }
  const goNextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) } else setMonth((m) => m + 1)
  }

  const jumpToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  const topBtn = {
    background: 'rgba(255,255,255,0.9)', color: G.head, border: 'none', borderRadius: 8,
    padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
  }

  const modalInfo = (() => {
    if (!dayModal) return null
    const items = listOf(dayModal)
    const d = new Date(`${dayModal}T00:00:00`)
    return {
      items,
      label: `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日 · ${WEEK_LABEL[(d.getDay() + 6) % 7]}`,
      setItem: (i, v) => writeDay(dayModal, items.map((it, k) => (k === i ? { ...it, t: v } : it))),
      toggle: (i) => writeDay(dayModal, items.map((it, k) => (k === i ? { ...it, done: !it.done } : it))),
      del: (i) => writeDay(dayModal, items.filter((_, k) => k !== i)),
      add: () => {
        if (items.length >= MAX_PER_DAY) return
        writeDay(dayModal, [...items, { t: '', done: false }])
      },
    }
  })()

  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text }}>
      {/* 顶栏 */}
      <div style={{ background: G.head, color: '#fff', padding: '14px 20px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>{year} 年 · 年度备忘录</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setYear((y) => y - 1)} style={topBtn}>‹ {year - 1}</button>
            <button onClick={() => setYear((y) => y + 1)} style={topBtn}>{year + 1} ›</button>
            <button onClick={jumpToday} style={{ ...topBtn, background: '#dcefd0' }}>回到今天</button>
          </div>
        </div>
        <div style={{ maxWidth: 1240, margin: '10px auto 0', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {MONTH_LABEL.map((label, i) => {
            const on = i === month
            return (
              <button
                key={label}
                onClick={() => setMonth(i)}
                style={{
                  background: on ? '#fff' : 'rgba(255,255,255,0.16)',
                  color: on ? G.head : '#fff',
                  border: 'none', borderRadius: 999, padding: '4px 12px', fontSize: 12.5,
                  cursor: 'pointer', fontWeight: on ? 800 : 600,
                }}
              >{label}</button>
            )
          })}
          <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.85 }}>
            每天最多 {MAX_PER_DAY} 条 · 点格子开弹窗编辑，格子里可直接勾完成、点 × 删除
          </span>
        </div>
      </div>

      {/* 一次只显示一个月 */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '18px 20px 50px' }}>
        <div className="ym-card" style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(47,93,52,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${G.line}` }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: G.head }}>{year} 年 {month + 1} 月</span>
            <span style={{ fontSize: 12, color: G.muted }}>
              本月记了 {Object.keys(memo).filter((k) => k.startsWith(`${year}-${pad2(month + 1)}`)).length} 天
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={goPrevMonth} style={{ ...topBtn, background: '#f2f6ec', color: G.head, border: `1px solid ${G.line}` }}>‹ 上一月</button>
              <button onClick={goNextMonth} style={{ ...topBtn, background: '#f2f6ec', color: G.head, border: `1px solid ${G.line}` }}>下一月 ›</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: G.weekHead }}>
            {WEEK_LABEL.map((w) => (
              <div key={w} style={{ color: '#fff', fontSize: 13, fontWeight: 700, textAlign: 'center', padding: '9px 0', borderRight: '1px solid rgba(255,255,255,0.18)' }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((cell, i) => {
              if (!cell) {
                return <div key={`e${i}`} style={{ minHeight: 150, background: '#fafcf7', borderRight: `1px solid ${G.line}`, borderBottom: `1px solid ${G.line}` }} />
              }
              const items = listOf(cell.date)
              const isToday = cell.date === today
              return (
                <div
                  key={cell.date}
                  onClick={() => setDayModal(cell.date)}
                  title={`点开编辑 ${month + 1} 月 ${cell.day} 日的备忘`}
                  style={{
                    minHeight: 150, padding: '6px 9px 8px', borderRight: `1px solid ${G.line}`, borderBottom: `1px solid ${G.line}`,
                    background: isToday ? G.todayBg : '#fff', cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: isToday ? G.head : '#9aa393', marginBottom: 4 }}>
                    {cell.day}{isToday ? ' · 今天' : ''}
                  </div>
                  {items.map((it, idx) => {
                    if (!it.t) return null
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                        <span
                          className="ym-check"
                          title={it.done ? '标记为未完成' : '标记完成'}
                          onClick={(e) => { e.stopPropagation(); toggleDone(cell.date, idx) }}
                          style={{
                            flex: '0 0 auto', width: 15, height: 15, borderRadius: 4, fontSize: 10, lineHeight: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1.5px solid ${it.done ? G.accent : '#c9d3c1'}`,
                            background: it.done ? G.accent : '#fff', color: '#fff', cursor: 'pointer',
                          }}
                        >{it.done ? '✓' : ''}</span>
                        <span
                          title={it.t}
                          style={{
                            flex: 1, minWidth: 0, fontSize: 14, lineHeight: '20px', color: '#111',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            textDecoration: it.done ? 'line-through' : 'none', opacity: it.done ? 0.5 : 1,
                          }}
                        >{it.t}</span>
                        <span
                          className="ym-del"
                          title="删除这条"
                          onClick={(e) => { e.stopPropagation(); removeItem(cell.date, idx) }}
                        >×</span>
                      </div>
                    )
                  })}
                  {items.filter((it) => it.t).length < MAX_PER_DAY && (
                    <div style={{ color: '#b6c3ac', fontSize: 13, lineHeight: '20px' }}>＋ 添加</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: G.muted, paddingTop: 12 }}>
          电脑专用页面。数据存本机，已纳入「备份与同步」。
        </div>
      </div>

      {/* 当天编辑弹窗：新增、修改、删除都在这里 */}
      {modalInfo && (
        <div
          onClick={closeModal}
          style={{ position: 'fixed', inset: 0, background: 'rgba(28,42,26,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 520, maxWidth: '92vw', maxHeight: '86vh', overflowY: 'auto', background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 12px 40px rgba(20,32,18,0.28)' }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: G.head }}>{modalInfo.label}</div>
              <div style={{ fontSize: 12, color: G.muted, marginLeft: 'auto' }}>{modalInfo.items.length} / {MAX_PER_DAY} 条</div>
            </div>

            {modalInfo.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <button
                  onClick={() => modalInfo.toggle(i)}
                  title={it.done ? '标记为未完成' : '标记完成'}
                  style={{
                    flex: '0 0 auto', width: 20, height: 20, borderRadius: 6, fontSize: 12, marginTop: 9,
                    border: `1.5px solid ${it.done ? G.accent : '#c9d3c1'}`, background: it.done ? G.accent : '#fff',
                    color: '#fff', cursor: 'pointer', padding: 0, lineHeight: 1,
                  }}
                >{it.done ? '✓' : ''}</button>
                <span style={{ fontSize: 12, color: '#a9b3a0', paddingTop: 9, minWidth: 12 }}>{i + 1}.</span>
                <textarea
                  value={it.t}
                  onChange={(e) => modalInfo.setItem(i, e.target.value)}
                  rows={1}
                  autoFocus={i === modalInfo.items.length - 1}
                  placeholder="写点什么…"
                  style={{
                    flex: 1, minWidth: 0, fontSize: 15, lineHeight: 1.5, padding: '8px 10px', fontFamily: 'inherit',
                    border: `1.5px solid ${G.line}`, borderRadius: 10, outline: 'none', resize: 'vertical',
                    background: '#fbfdf8', color: G.text,
                  }}
                />
                <button
                  onClick={() => modalInfo.del(i)}
                  style={{ border: 'none', background: '#fdecea', color: '#c0392b', borderRadius: 8, fontSize: 13, padding: '8px 12px', marginTop: 2, cursor: 'pointer' }}
                >删</button>
              </div>
            ))}

            {modalInfo.items.length === 0 && (
              <div style={{ fontSize: 13, color: G.muted, margin: '4px 0 14px' }}>这天还没有记事，点下面新增一条。</div>
            )}

            {modalInfo.items.length < MAX_PER_DAY && (
              <button
                onClick={modalInfo.add}
                style={{ width: '100%', border: `1.5px dashed ${G.line}`, background: '#fbfdf8', color: G.accent, borderRadius: 10, padding: '10px 0', fontSize: 14, fontWeight: 700, marginBottom: 14, cursor: 'pointer' }}
              >＋ 新增一条</button>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{ background: G.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 26px', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
              >完成</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
