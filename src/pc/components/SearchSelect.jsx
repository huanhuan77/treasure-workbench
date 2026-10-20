import { useEffect, useMemo, useRef, useState } from 'react'

// 可搜索的下拉选择（替代原生 <select>）。
//
// 起因：出单页的「全部产品」下拉里有几十个产品，原生 select 只能滚动、没法搜，
// 找某一款要拖半天（用户要求「可以搜索」）。
//
// 用法：
//   <SearchSelect value={v} onChange={setV} options={['A','B']} allLabel="全部产品" width={180} />
// options 既可传字符串数组，也可传 { value, label } 数组。
export function SearchSelect({
  value = '',
  options = [],
  onChange,
  allLabel = '全部',
  width = 180,
  placeholder = '搜索…',
  title,
  // 允许输入列表里没有的值（如「发布产品」既能从产品库选、也能手填新名字）：
  // 输入框回车或点「使用「xxx」」采用自定义值；allLabel 传空字符串则不显示「全部」项
  allowCustom = false,
  customLabel = '使用',
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const boxRef = useRef(null)
  const inputRef = useRef(null)

  const items = useMemo(
    () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options],
  )

  const current = items.find((i) => i.value === value)
  const label = value ? (current ? current.label : value) : allLabel

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) => String(i.label).toLowerCase().includes(q))
  }, [items, query])

  // 点外面 / 按 Esc 关闭
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      // 等面板渲染出来再聚焦
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const pick = (v) => {
    onChange(v)
    setOpen(false)
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', width }}>
      <button
        type="button"
        className="pcv-input"
        title={title || label}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 6, cursor: 'pointer', background: '#fff', color: value ? '#333a45' : '#8a8f98',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 60,
            width: '100%', minWidth: 180, background: '#fff', borderRadius: 10,
            border: '0.5px solid rgba(15,23,42,0.10)',
            boxShadow: '0 10px 28px rgba(15,23,42,0.14)', padding: 6,
          }}
        >
          <input
            ref={inputRef}
            className="pcv-input"
            style={{ width: '100%', marginBottom: 4 }}
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              if (filtered.length > 0) pick(filtered[0].value)
              else if (allowCustom && query.trim()) pick(query.trim())
            }}
          />
          <div className="pcv-drop-list" style={{ maxHeight: 260 }}>
            {allLabel && (
              <button
                type="button"
                className={`pcv-drop-row${value === '' ? ' on' : ''}`}
                onClick={() => pick('')}
              >{allLabel}</button>
            )}
            {/* 自定义值入口：输入了列表里没有的名字时，第一行就是「使用『xxx』」 */}
            {allowCustom && query.trim() && !items.some((i) => i.label === query.trim()) && (
              <button
                type="button"
                className="pcv-drop-row"
                onClick={() => pick(query.trim())}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{customLabel}「{query.trim()}」</span>
              </button>
            )}
            {filtered.length === 0 ? (
              !allowCustom && <div style={{ padding: '10px 8px', fontSize: 12, color: '#9aa0a9' }}>没有匹配项</div>
            ) : filtered.map((i) => (
              <button
                key={i.value}
                type="button"
                className={`pcv-drop-row${i.value === value ? ' on' : ''}`}
                title={i.label}
                onClick={() => pick(i.value)}
              >
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.label}</span>
                {i.value === value && <span className="pcv-drop-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
