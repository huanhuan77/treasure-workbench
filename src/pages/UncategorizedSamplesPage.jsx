import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'
import { CATEGORIES } from '../utils/categories'
import { getAccounts, ACCOUNT_COLOR } from '../utils/accounts'
import { SAMPLE_STATUS, getTopStatus } from '../utils/sampleStatus'
import { copyText } from '../utils/helpers'

// 未分类样品：集中列出 + 单个/批量设置分类
// 入口：样品页顶部提示条（存在无分类样品时显示）
export function UncategorizedSamplesPage() {
  const navigate = useNavigate()
  const { samples, products, updateSample } = useStore()
  const { show } = useToast()
  const [checked, setChecked] = useState({})
  const [bulkCat, setBulkCat] = useState('')

  const list = useMemo(() => (samples || []).filter((s) => !(s.category || '').trim()), [samples])
  const checkedIds = useMemo(() => Object.keys(checked).filter((k) => checked[k]), [checked])

  // 从关联产品（productId 优先，其次同名产品）推断分类
  const guessCategory = (s) => {
    const ps = products || []
    const byId = ps.find((p) => p.id && p.id === s.productId && (p.category || '').trim())
    if (byId) return byId.category.trim()
    const byName = ps.find((p) => (p.name || '').trim() === (s.name || '').trim() && (p.category || '').trim())
    return byName ? byName.category.trim() : ''
  }
  const guessable = useMemo(() => list.filter((s) => guessCategory(s)), [list, products])

  const apply = (ids, cat) => {
    ids.forEach((id) => updateSample(id, { category: cat }))
    setChecked({})
    show(`已把 ${ids.length} 个样品设为「${cat}」`, 'success')
  }

  const setOne = (id, cat) => {
    updateSample(id, { category: cat })
    show(`已设为「${cat}」`, 'success')
  }

  const autoFill = () => {
    if (!guessable.length) { show('没有可从产品继承分类的样品', 'error'); return }
    let n = 0
    guessable.forEach((s) => { updateSample(s.id, { category: guessCategory(s) }); n += 1 })
    show(`已按产品分类补全 ${n} 个样品`, 'success')
  }

  const copyList = async () => {
    const text = list
      .map((s, i) => {
        const acc = getAccounts(s).join('、')
        return `${i + 1}. ${s.name || '（未命名）'}${acc ? `（${acc}）` : ''}`
      })
      .join('\n')
    const ok = await copyText(text)
    show(ok ? '清单已复制，可直接粘贴给助理' : '复制失败', ok ? 'success' : 'error')
  }

  const allChecked = list.length > 0 && checkedIds.length === list.length

  return (
    <div className="app-container" style={{ background: 'linear-gradient(180deg,#ffe3ec 0%,#fff0f3 55%,#fff8f9 100%)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: 'calc(12px + var(--safe-top)) 16px 12px', borderBottom: '1px solid rgba(236,72,153,0.12)' }}>
        <button onClick={() => navigate(-1)} style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'rgba(244,114,182,0.08)', color: 'var(--primary)', fontSize: '22px', cursor: 'pointer', flexShrink: 0 }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', flex: 1 }}>未分类样品（{list.length}）</h1>
        {list.length > 0 && (
          <button onClick={copyList} style={{ padding: '7px 12px', borderRadius: '10px', border: '1px solid rgba(244,114,182,0.3)', background: '#fff', color: 'var(--primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            复制清单
          </button>
        )}
      </div>

      <div style={{ padding: '10px 12px 16px' }}>
        {list.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '30px 16px', textAlign: 'center', color: '#16a34a', fontSize: '13px' }}>
            🎉 所有样品都已经有分类了
          </div>
        ) : (
          <>
            {/* 批量操作区 */}
            <div style={{ background: '#fff', border: '1px solid #fce7ec', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
                  已选 <b style={{ color: 'var(--primary)' }}>{checkedIds.length}</b> / {list.length} 个
                </span>
                <button onClick={() => setChecked(allChecked ? {} : Object.fromEntries(list.map((s) => [s.id, true])))}
                  style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-sub)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  {allChecked ? '取消全选' : '全选'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setBulkCat(bulkCat === c ? '' : c)} style={{
                    padding: '6px 12px', borderRadius: '9px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
                    border: bulkCat === c ? '1.5px solid #6d28d9' : '1px solid rgba(0,0,0,0.08)',
                    background: bulkCat === c ? 'rgba(109,40,217,0.12)' : 'rgba(255,255,255,0.7)',
                    color: bulkCat === c ? '#6d28d9' : 'var(--text-sub)',
                  }}>{c}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { if (!bulkCat) { show('先选一个分类', 'error'); return } if (!checkedIds.length) { show('先勾选样品', 'error'); return } apply(checkedIds, bulkCat) }}
                  style={{ flex: 1, padding: '9px 0', borderRadius: '9px', border: 'none', background: 'linear-gradient(135deg,#f472b6,#ec4899)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  批量应用
                </button>
                <button onClick={autoFill} style={{ flex: 1, padding: '9px 0', borderRadius: '9px', border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.7)', color: 'var(--text-sub)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  按产品自动补全{guessable.length ? `（${guessable.length}）` : ''}
                </button>
              </div>
            </div>

            {/* 样品清单 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {list.map((s, i) => {
                const st = SAMPLE_STATUS[getTopStatus(s)] || SAMPLE_STATUS.un_arrived
                const accs = getAccounts(s)
                const on = !!checked[s.id]
                return (
                  <div key={s.id} style={{ background: '#fff', border: on ? '1.5px solid #ec4899' : '1px solid #fecdd3', borderRadius: '10px', padding: '9px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <button onClick={() => setChecked((c) => ({ ...c, [s.id]: !c[s.id] }))} style={{
                        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, marginTop: '1px', cursor: 'pointer',
                        border: on ? '6px solid #ec4899' : '2px solid #d1d5db', boxSizing: 'border-box', background: '#fff', padding: 0,
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', color: '#cbd5e1', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name || '（未命名）'}</span>
                          <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', color: st.color, background: st.bg, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            {st.icon} {st.label}
                          </span>
                        </div>
                        {accs.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
                            {accs.map((a) => (
                              <span key={a} style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '5px', background: (ACCOUNT_COLOR[a] || { bg: 'rgba(0,0,0,0.06)' }).bg, color: (ACCOUNT_COLOR[a] || { c: '#64748b' }).c, fontWeight: 600, whiteSpace: 'nowrap' }}>{a}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px', paddingLeft: '28px' }}>
                      {CATEGORIES.map((c) => (
                        <button key={c} onClick={() => setOne(s.id, c)} style={{
                          padding: '5px 10px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                          border: '1px solid rgba(109,40,217,0.25)', background: 'rgba(109,40,217,0.06)', color: '#6d28d9',
                        }}>{c}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
