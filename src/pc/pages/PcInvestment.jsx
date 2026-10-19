import { useMemo, useRef, useState } from 'react'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { recordDelete } from '../../utils/sync'
import {
  INVEST_STORAGE_KEY as KEY,
  loadInvestments as load,
  getAssetType,
  parseOcrText,
  runOcr,
  INVEST_TYPE_STYLE as TYPE_STYLE,
  investUid as uid,
} from '../../pages/InvestmentPage'
import { ResetButton } from '../components/ResetButton'

// PC 版「投资跟踪」。
// 数据与语义照手机版 InvestmentPage：**直接读写 localStorage 的 `blogger_investments_v1`**（数组），
// 记录形状 { id, code, name, sellPrice, currentPrice, sellDate, type: buy|sell, change, shares, amount, assetType }；
// 删除要 recordDelete 记墓碑。OCR 文本解析 / 资产类型判定 / 类型样式**直接复用页面的实现**（见那边的 export）。
//
// ⚠️ 与手机版的两处差异（都是环境依赖，不是偷懒）：
//   1. **不做自动轮询行情**（手机版每 60s 拉一次 stock-sdk）。PC 改成顶栏「刷新行情」手动触发，
//      拉取失败就在 toast 里说明 —— 离线/内网环境下这个接口本来也调不通，静默失败更糟。
//   2. 手机版的「下拉刷新」是触摸手势，PC 用上面的按钮替代。
// 盈亏口径**不自创新**：沿用手机版每笔的 `change`（现价 vs 成交价 %），没有「总盈亏」这种手机版没有的指标。
const fmtNum = (n, d = 2) => (Number(n) || 0).toFixed(d)
const pctText = (v) => (v === null || v === undefined || Number.isNaN(Number(v))) ? '—' : `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`

// 涨跌幅的底色：涨=淡红、跌=淡绿（A 股习惯），无数据显示浅灰。
// 只给淡底+同色字，不铺实底，避免整列变成红绿块。
const pctStyle = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return { background: '#f5f6f8', color: '#c9cdd4' }
  return Number(v) >= 0
    ? { background: '#fbeaea', color: '#c05a6e' }
    : { background: '#eef4ef', color: '#5f8a74' }
}

const TABS = [
  { key: 'stock', label: '股票' },
  { key: 'fund', label: '基金' },
]
export function PcInvestment() {
  const { show } = useToast()
  const [investments, setInvestments] = useState(load)
  const [activeTab, setActiveTab] = useState('stock')
  const [keyword, setKeyword] = useState('')
  const [expanded, setExpanded] = useState('')       // 展开的代码
  const [editing, setEditing] = useState(null)       // null / 对象（编辑） / 'new'
  const [form, setForm] = useState(null)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const fileRef = useRef(null)

  const save = (list) => {
    try { localStorage.setItem(KEY, JSON.stringify(list)) } catch (e) { /* 配额满等情况忽略 */ }
    setInvestments(list)
  }

  // 按代码分组（买入卖出归到同一只）
  const groups = useMemo(() => {
    const map = new Map()
    for (const inv of investments) {
      const key = (inv.code || '').trim() || '（无代码）'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(inv)
    }
    return [...map.entries()].map(([code, items]) => {
      const sorted = [...items].sort((a, b) => String(b.sellDate || '').localeCompare(String(a.sellDate || '')))
      const latest = sorted[0] || {}
      const buyShares = items.filter((i) => (i.type || 'buy') === 'buy').reduce((s, i) => s + (Number(i.shares) || 0), 0)
      const sellShares = items.filter((i) => i.type === 'sell').reduce((s, i) => s + (Number(i.shares) || 0), 0)
      const buyAmount = items.filter((i) => (i.type || 'buy') === 'buy').reduce((s, i) => s + (Number(i.amount) || 0), 0)
      const sellAmount = items.filter((i) => i.type === 'sell').reduce((s, i) => s + (Number(i.amount) || 0), 0)
      return {
        code,
        name: latest.name || items.find((i) => i.name)?.name || '',
        assetType: getAssetType(latest),
        // 明细按成交日期倒序（最新的一笔排最前），与父行的「最新日期」口径一致
        items: sorted.map((i) => ({ ...i, _dir: i.type || 'buy' })),
        latest,
        buyShares,
        sellShares,
        netShares: buyShares - sellShares,
        buyAmount,
        sellAmount,
        change: latest.change,
      }
    }).sort((a, b) => String(b.latest.sellDate || '').localeCompare(String(a.latest.sellDate || '')))
  }, [investments])

  const stockCount = investments.filter((i) => getAssetType(i) === 'stock').length
  const fundCount = investments.filter((i) => getAssetType(i) === 'fund').length
  const buyCount = investments.filter((i) => (i.type || 'buy') === 'buy').length
  const sellCount = investments.filter((i) => i.type === 'sell').length

  // 买卖方向筛选已去掉（用户要求），「股票 / 基金」Tab 之外只保留关键词搜索。
  const shown = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return groups
      .filter((g) => g.assetType === activeTab)
      .filter((g) => !kw || `${g.code} ${g.name}`.toLowerCase().includes(kw))
  }, [groups, activeTab, keyword])

  const openNew = () => {
    setForm({ code: '', name: '', direction: 'buy', shares: '', price: '', date: '', assetType: activeTab })
    setFetchedPrice(null)
    setNameFail(false)
    setEditing('new')
  }
  // 「编辑最新」按钮：不是改旧记录，而是**基于这一行再记一笔**（用户要求弹窗要清空）。
  // 只带过 代码 / 名称 / 资产类型，份额、成交价、日期全空 —— 否则会沿用上一笔的数字，
  // 一不留神就把新买入存成旧价格。
  const openNewFrom = (inv) => {
    const today = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    setForm({
      code: inv.code || '',
      name: inv.name || '',
      direction: 'buy',
      shares: '',
      price: '',
      date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      assetType: getAssetType(inv),
    })
    setFetchedPrice(null)
    setNameFail(false)
    setEditing('new')
  }

  const openEdit = (inv) => {
    // 编辑旧记录：保留它原本的日期；只有历史脏数据没填日期时才兜底成今天
    const today = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    setForm({
      code: inv.code || '',
      name: inv.name || '',
      direction: inv.type || 'buy',
      shares: String(inv.shares ?? ''),
      price: String(inv.sellPrice ?? ''),
      date: inv.sellDate || `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
      assetType: getAssetType(inv),
    })
    setFetchedPrice(inv.currentPrice ?? null)
    setNameFail(false)
    setEditing(inv)
  }

  // 按代码自动带出名称：填满 6 位数字后自动查（500ms 防抖），
  // 光标离开代码框也会立刻补查一次；名称已手填过就不覆盖。
  const lookupTimer = useRef(null)
  const [nameBusy, setNameBusy] = useState(false)
  const [nameFail, setNameFail] = useState(false)   // 查不到时给个明确提示，而不是默默没反应
  const [fetchedPrice, setFetchedPrice] = useState(null)   // 「获取行情」拿到的当前价，保存时写入 currentPrice

  // 获取行情：与**手机端「🔍 获取行情」按钮**完全同一套逻辑 ——
  // 基金走 sdk.quotes.fund（拿 name + nav），股票走 sdk.quotes.cn（拿 name + price），
  // 名称与当前价一起回填。PC 端额外做了：名称已有则不覆盖，失败给红字提示。
  const lookupName = async (rawCode, assetType, { quiet = false } = {}) => {
    const code = String(rawCode || '').replace(/\D/g, '')
    if (code.length < 6) return
    setNameBusy(true)
    setNameFail(false)
    try {
      const { StockSDK } = await import('stock-sdk')
      const sdk = new StockSDK()
      let name = ''
      let price = null
      if (assetType === 'fund') {
        const q = await sdk.quotes.fund([code])
        if (q?.[0]) { name = q[0].name || ''; price = q[0].nav ?? null }
      } else {
        const q = await sdk.quotes.cn([code])
        if (q?.[0]) { name = q[0].name || ''; price = q[0].price ?? null }
      }
      if (!name) {
        // 兜底：股票接口查空的代码，多半是基金（如 110022 在 fund 接口才有）
        try {
          const p = await sdk.fund.profile(code)
          name = p?.name || ''
        } catch (e) { /* 忽略 */ }
      }
      if (price != null && Number.isFinite(Number(price))) setFetchedPrice(Number(price))
      if (name) {
        setForm((f) => (
          f && String(f.code || '').replace(/\D/g, '') === code && !String(f.name || '').trim()
            ? { ...f, name }
            : f
        ))
        if (!quiet) show(`已获取：${name}`, 'success')
      } else {
        setNameFail(true)
      }
    } catch (e) {
      console.warn('[投资] 获取行情失败：', e?.message || e)
      setNameFail(true)
      if (!quiet) show('获取行情失败，请检查网络', 'error')
    } finally {
      setNameBusy(false)
    }
  }

  const onCodeChange = (v) => {
    setForm((f) => ({ ...f, code: v }))
    setNameFail(false)
    if (lookupTimer.current) clearTimeout(lookupTimer.current)
    const code = String(v || '').replace(/\D/g, '')
    // 粘进来的代码可能带空格/前后缀，取前 6 位数字判断
    if (code.length >= 6) {
      lookupTimer.current = setTimeout(() => lookupName(code.slice(0, 6), form.assetType), 400)
    }
  }

  const saveForm = () => {
    const code = form.code.trim()
    const name = form.name.trim()
    const price = parseFloat(form.price)
    const shares = parseFloat(form.shares) || 0
    if (!code) { show('请填写代码', 'error'); return }
    if (!name) { show('请填写名称', 'error'); return }
    if (!(price > 0)) { show('请填写有效的成交价', 'error'); return }
    // 新增时用「获取行情」拿到的当前价；编辑旧记录沿用原记录的当前价
    const currentPrice = (editing && editing !== 'new') ? editing.currentPrice : (fetchedPrice ?? null)
    const change = currentPrice && price ? ((currentPrice - price) / price * 100) : null
    const item = {
      id: (editing && editing !== 'new') ? editing.id : uid(),
      code, name, sellPrice: price, currentPrice, sellDate: form.date, type: form.direction,
      change, shares, amount: shares * price, assetType: form.assetType, updatedAt: Date.now(),
    }
    if (editing && editing !== 'new') {
      save(investments.map((i) => (i.id === editing.id ? item : i)))
      show('已更新', 'success')
    } else {
      save([...investments, item])
      show('已添加', 'success')
    }
    setEditing(null)
  }

  const doDelete = () => {
    if (!delTarget) return
    try { recordDelete(KEY, delTarget.id) } catch (e) { /* 同步异常不影响本地删除 */ }
    save(investments.filter((i) => i.id !== delTarget.id))
    setDelTarget(null)
    show('已删除', 'success')
  }

  // 刷新行情：照手机版 autoRefreshPrices 的取价方式，但改成手动触发 + 失败明确提示
  const refreshPrices = async () => {
    if (investments.length === 0) { show('还没有记录', 'error'); return }
    setRefreshing(true)
    try {
      const { StockSDK } = await import('stock-sdk')
      const sdk = new StockSDK()
      const next = await Promise.all(investments.map(async (inv) => {
        const code = String(inv.code || '').replace(/\D/g, '')
        if (!code) return inv
        try {
          const at = getAssetType(inv)
          const q = at === 'fund' ? await sdk.quotes.fund([code]) : await sdk.quotes.cn([code])
          const p = q?.[0] ? (at === 'fund' ? q[0].nav : q[0].price) : null
          if (!p) return inv
          const sp = inv.sellPrice
          return { ...inv, currentPrice: p, change: sp ? ((p - sp) / sp * 100) : null, updatedAt: Date.now() }
        } catch (e) { return inv }
      }))
      save(next)
      const got = next.filter((n, i) => n.currentPrice !== investments[i]?.currentPrice).length
      show(got > 0 ? `已更新 ${got} 条行情` : '行情暂无变化（或接口不可达）', got > 0 ? 'success' : 'error')
    } catch (e) {
      show('行情接口不可用（可能需要联网）', 'error')
    } finally {
      setRefreshing(false)
    }
  }

  // OCR 识别买入/卖出截图 → 预填表单（复用手机版 runOcr + parseOcrText）
  const onOcrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !form) return
    setOcrBusy(true)
    try {
      const text = await runOcr(file)
      const p = parseOcrText(text)
      setForm((f) => ({
        ...f,
        code: p.code || f.code,
        name: p.name || f.name,
        direction: p.type || f.direction,
        shares: p.shares != null ? String(p.shares) : f.shares,
        price: p.price != null ? String(p.price) : f.price,
        date: p.date || f.date,
        assetType: p.assetType || f.assetType,
      }))
      const missing = !p.price || !p.shares || !p.date
      show(missing ? '部分字段没识别出来，请手动补一下' : '已识别并填入', missing ? 'error' : 'success')
    } catch (err) {
      show('识别失败（需要联网加载 OCR 引擎）', 'error')
    } finally {
      setOcrBusy(false)
    }
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">投资跟踪</div>
          <div className="pcv-sub">
            股票 {stockCount} · 基金 {fundCount} · 买入 {buyCount} · 卖出 {sellCount}
          </div>
        </div>
        <div className="pcv-spacer" />
        <input
          className="pcv-input"
          style={{ width: 200 }}
          placeholder="搜索代码 / 名称"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <ResetButton active={keyword !== ''} onClick={() => setKeyword('')} inline />
        <button className="pcv-btn pcv-btn-ghost" onClick={refreshPrices} disabled={refreshing}>
          {refreshing ? '刷新中…' : '刷新行情'}
        </button>
        <button className="pcv-btn" onClick={openNew}>＋ 新增记录</button>
      </div>

      <div className="pcv-body pcv-body--fill">
        <div className="pcv-accountbar" style={{ padding: '0 0 8px', borderBottom: 'none' }}>
          <div className="pcv-seg pcv-seg--tabs">
            {TABS.map((t) => (
              <button key={t.key} className={activeTab === t.key ? 'on' : ''} onClick={() => { setActiveTab(t.key); setExpanded('') }}>
                <span>{t.label}</span>
                <span className="pcv-count">{t.key === 'stock' ? stockCount : fundCount}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pcv-card pcv-card--scroll" style={{ flex: 1, minHeight: 0 }}>
          <table className="pcv-table pcv-table--lg">
            <thead>
              <tr>
                {/* 定宽（px）改成百分比：窗口一宽，定宽表会在右边空出一大片，
                    而「名称」仍然被截断（用户反馈「列宽调宽」）。
                    现在各列按比例吃掉整行宽度，窗口越宽每列越宽；
                    百分比合计 100，操作列留 11%（约 112px，够放「编辑最新」不换行）。 */}
                <th style={{ width: '7.5%' }}>代码</th>
                <th style={{ width: '16%' }}>名称</th>
                <th style={{ width: '4%' }}>类型</th>
                <th style={{ width: '14.5%' }}>持仓（买/卖/净）</th>
                <th style={{ width: '5%' }}>份额</th>
                <th style={{ width: '9%' }}>成交额</th>
                <th style={{ width: '6.5%' }}>成交价</th>
                <th style={{ width: '6%' }}>现价</th>
                <th style={{ width: '6.5%' }}>最新涨跌</th>
                <th style={{ width: '8.5%' }}>最新日期</th>
                {/* 操作列 11% → 16.5%：改成按钮后「编辑 + 删除」约需 150px */}
                <th style={{ width: '16.5%' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={11} className="pcv-empty">当前筛选下没有记录</td>
                </tr>
              ) : shown.map((g) => {
                const st = TYPE_STYLE[g.assetType] || TYPE_STYLE.stock
                const open = expanded === g.code
                return (
                  <>
                    <tr key={g.code} style={{ cursor: 'pointer' }} onClick={() => setExpanded(open ? '' : g.code)}>
                      {/* 字号统一用表格默认 13px、文字统一黑色（#333a45）：
                          原来这里 12px + 灰色，和相邻列一对比就像「次要信息」，
                          但持仓/成交额/现价/日期都是要看的数据，不该被弱化。 */}
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#333a45', whiteSpace: 'nowrap' }}>{open ? '▾' : '▸'} {g.code}</td>
                      <td><span className="pcv-nametext" title={g.name}>{g.name || '—'}</span></td>
                      <td>
                        <span className="pcv-chip" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#333a45', whiteSpace: 'nowrap' }}>
                        {fmtNum(g.buyShares, 0)} / {fmtNum(g.sellShares, 0)} / <span style={{ color: g.netShares >= 0 ? '#333a45' : '#b96a66' }}>{fmtNum(g.netShares, 0)}</span>
                      </td>
                      {/* 份额 / 成交价是明细行才有的字段，父行留空（用 — 占位保持列对齐） */}
                      <td style={{ color: '#c9cdd4' }}>—</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#333a45', whiteSpace: 'nowrap' }}>
                        ¥{fmtNum(g.buyAmount)} / ¥{fmtNum(g.sellAmount)}
                      </td>
                      <td style={{ color: '#c9cdd4' }}>—</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums', color: '#333a45' }}>
                        {g.latest.currentPrice != null ? `¥${fmtNum(g.latest.currentPrice, 3)}` : <span style={{ color: '#c9cdd4' }}>—</span>}
                      </td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <span className="pcv-chip" style={pctStyle(g.change)}>{pctText(g.change)}</span>
                      </td>
                      <td style={{ color: '#333a45', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{g.latest.sellDate || '—'}</td>
                      <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                        {/* 打开的是**空白表单**（只认代码/名称），不再带入上一笔的份额与价格 */}
                        <button
                          className="pcv-btn pcv-btn-ghost"
                          style={{ padding: '5px 10px' }}
                          title="按这只基金再记一笔（份额/价格清空）"
                          onClick={() => openNewFrom(g.latest)}
                        >记一笔</button>
                      </td>
                    </tr>

                    {/* 展开：该代码下的每笔买卖 */}
                    {open && g.items.map((inv) => (
                      <tr key={inv.id} style={{ background: '#fafbfc' }}>
                        <td />
                        {/* 明细行只留名称：代码在上一行（父行）已经有，重复一遍还会把窄列撑成两行 */}
                        <td colSpan={2} style={{ paddingLeft: 18 }}>
                          {inv.name}
                        </td>
                        <td>
                          <span className="pcv-chip" style={inv._dir === 'sell' ? { background: '#eef4ef', color: '#5f8a74' } : { background: '#fdf1f6', color: '#b8517f' }}>
                            {inv._dir === 'sell' ? '卖出' : '买入'}
                          </span>
                        </td>
                        {/* 明细行的份额 / 成交额 / 成交价各占一列（原来「份 × 价 = 额」挤在一格里被截断） */}
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: '#333a45' }}>
                          {fmtNum(inv.shares, 0)}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: '#333a45', whiteSpace: 'nowrap' }}>
                          ¥{fmtNum(inv.amount)}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: '#333a45', whiteSpace: 'nowrap' }}>
                          ¥{fmtNum(inv.sellPrice, 3)}
                        </td>
                        {/* 现价 / 涨跌各占一列（每条记录用自己的 change，所以同一代码下每笔数字不同） */}
                        <td style={{ color: '#333a45', fontVariantNumeric: 'tabular-nums' }}>
                          {inv.currentPrice != null ? `¥${fmtNum(inv.currentPrice, 3)}` : '—'}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                          <span className="pcv-chip" style={pctStyle(inv.change)}>{pctText(inv.change)}</span>
                        </td>
                        <td style={{ color: '#333a45', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{inv.sellDate || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <button className="pcv-btn pcv-btn-ghost" style={{ padding: '5px 10px' }} onClick={() => openEdit(inv)}>编辑</button>
                          <button
                            className="pcv-btn pcv-btn-ghost pcv-btn-ghost--danger"
                            style={{ padding: '5px 10px', marginLeft: 6 }}
                            onClick={() => setDelTarget(inv)}
                          >删除</button>
                        </td>
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增 / 编辑记录 */}
      {editing && form && (
        <div className="pcv-overlay" onClick={() => setEditing(null)}>
          <div className="pcv-dialog" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div className="pcv-dialog-h">
              <span>{editing === 'new' ? '新增投资记录' : '编辑记录'}</span>
              <div className="pcv-spacer" />
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onOcrFile} />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => fileRef.current?.click()} disabled={ocrBusy}>
                {ocrBusy ? '识别中…' : '📷 识别截图'}
              </button>
              <button className="pcv-dialog-x" title="关闭" onClick={() => setEditing(null)}>×</button>
            </div>

            <div className="pcv-dialog-b">
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div className="pcv-field-label">代码 <span style={{ color: '#b96a66' }}>*</span></div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%' }}
                    placeholder="如 600519 / 110022"
                    value={form.code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    // 光标离开时立刻补查一次（防抖没触发、或粘贴后直接点别处都能兜住）
                    onBlur={(e) => {
                      if (lookupTimer.current) clearTimeout(lookupTimer.current)
                      lookupName(e.target.value, form.assetType)
                    }}
                    autoFocus
                  />
                </div>
                <div style={{ width: 130 }}>
                  <div className="pcv-field-label">资产类型</div>
                  <select
                    className="pcv-input"
                    style={{ width: '100%' }}
                    value={form.assetType}
                    onChange={(e) => setForm((f) => ({ ...f, assetType: e.target.value }))}
                  >
                    <option value="stock">股票</option>
                    <option value="fund">基金</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  {/* 与手机端一致的「🔍 获取行情」：点一下按代码取名称 + 当前价 */}
                  <button
                    className="pcv-btn pcv-btn-ghost"
                    style={{ height: 34, whiteSpace: 'nowrap' }}
                    disabled={nameBusy || String(form.code).replace(/\D/g, '').length < 6}
                    onClick={() => lookupName(form.code, form.assetType)}
                  >{nameBusy ? '获取中…' : '🔍 获取行情'}</button>
                </div>
              </div>

              <div className="pcv-field-label" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                名称 <span style={{ color: '#b96a66' }}>*</span>
                {/* 名称旁的查询状态 / 手动重查：代码填满 6 位会自动查一次 */}
                {nameBusy ? (
                  <span style={{ fontWeight: 400, color: '#8a8f98' }}>正在按代码查询名称…</span>
                ) : nameFail ? (
                  <span style={{ fontWeight: 400, color: '#b96a66' }}>没查到，请手动填写</span>
                ) : (
                  <button
                    type="button"
                    className="pcv-btn-text"
                    style={{ padding: 0, fontWeight: 400 }}
                    onClick={() => lookupName(form.code, form.assetType)}
                  >按代码查名称</button>
                )}
              </div>
              <input
                className="pcv-input"
                style={{ width: '100%' }}
                placeholder="如 贵州茅台 / 易方达蓝筹"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
              {/* 当前价卡片：与手机端「获取行情」后显示的那块一致，保存时会写进记录 */}
              {fetchedPrice != null && (
                <div style={{
                  marginTop: 8, padding: '8px 10px', borderRadius: 8,
                  background: '#f8fafc', border: '0.5px solid rgba(15,23,42,0.10)',
                  fontSize: 13, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>当前价</span>
                  <b style={{ color: '#b8517f', fontVariantNumeric: 'tabular-nums' }}>{fetchedPrice}</b>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9aa0a9' }}>保存时会一并记录</span>
                </div>
              )}

              <div className="pcv-field-label" style={{ marginTop: 16 }}>方向</div>
              <div className="pcv-catpick">
                <button className={form.direction === 'buy' ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, direction: 'buy' }))}>买入</button>
                <button className={form.direction === 'sell' ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, direction: 'sell' }))}>卖出</button>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <div style={{ flex: 1 }}>
                  <div className="pcv-field-label">份额</div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={form.shares}
                    onChange={(e) => setForm((f) => ({ ...f, shares: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="pcv-field-label">成交价 <span style={{ color: '#b96a66' }}>*</span></div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.000"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div style={{ width: 170 }}>
                  <div className="pcv-field-label">{form.direction === 'sell' ? '卖出日' : '买入日'}</div>
                  <input
                    className="pcv-input"
                    style={{ width: '100%' }}
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#9aa0a9', marginTop: 10, lineHeight: 1.6 }}>
                成交额按「份额 × 成交价」自动算。现价和涨跌需要点顶栏「刷新行情」拉到（离线环境下会提示不可用）。
              </div>
            </div>

            <div className="pcv-dialog-f">
              <div className="pcv-spacer" />
              <button className="pcv-btn pcv-btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="pcv-btn" onClick={saveForm}>{editing === 'new' ? '添加' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
        title="删除记录"
        message={delTarget ? `确定删除 ${delTarget.code} 这条${(delTarget.type || 'buy') === 'sell' ? '卖出' : '买入'}记录吗？` : ''}
        confirmText="删除"
        danger
      />
    </>
  )
}
