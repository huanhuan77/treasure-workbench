import { useMemo } from 'react'

// 本地时区 YYYY-MM-DD
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 截止日期标签。due 为空（未设截止日）时不渲染任何内容。
 * 颜色：过期=红 / 今天或3天内=橙 / 更远=灰
 */
export function DueTag({ due, style }) {
  const calc = useMemo(() => {
    // 兼容异常数据：due 可能是任意类型（数字/数组/对象），一律安全转成字符串再判断。
    let s = ''
    try {
      if (due === null || due === undefined) s = ''
      else if (typeof due === 'string') s = due
      else if (Array.isArray(due)) s = due[0] ? String(due[0]) : ''
      else s = String(due)
    } catch {
      s = ''
    }
    if (!s || typeof s !== 'string') return null
    const m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
    if (!m) return null
    const y = +m[1], mo = +m[2], d = +m[3]
    if (!y || !mo || !d) return null
    const dueMs = new Date(y, mo - 1, d).getTime()
    const today = todayStr()
    const [ty, tm, td] = today.split('-').map(Number)
    const todayMs = new Date(ty, tm - 1, td).getTime()
    const days = Math.round((dueMs - todayMs) / 86400000)
    if (days < 0) {
      return {
        text: days === -1 ? '昨天已过期' : `已过期 ${Math.abs(days)} 天`,
        color: '#dc2626', bg: '#fee2e2',
      }
    }
    if (days === 0) return { text: '今天截止', color: '#ea580c', bg: '#ffedd5' }
    if (days <= 3) return { text: `剩 ${days} 天`, color: '#ea580c', bg: '#ffedd5' }
    return { text: `${mo}月${d}日截止`, color: '#6b7280', bg: '#f3f4f6' }
  }, [due])

  if (!calc) return null
  return (
    <span style={{
      flexShrink: 0, fontSize: '11px', fontWeight: 600, color: calc.color,
      background: calc.bg, padding: '2px 8px', borderRadius: '8px', whiteSpace: 'nowrap',
      ...style,
    }}>
      {calc.text}
    </span>
  )
}

export { todayStr }
