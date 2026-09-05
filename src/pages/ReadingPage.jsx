import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { Modal, Field, inputStyle, btnPrimary, btnGhost, glassStyle, ConfirmModal } from '../components/Modal'
import { recordDelete } from '../utils/sync'

const STORAGE_KEY = 'reading_growth_v1'

// 分类：书籍和综艺各自独立
const BOOK_CATEGORIES = ['政治', '经济', '军事', '历史', '哲学', '心理', '传记', '其他']
const SHOW_CATEGORIES = ['访谈', '辩论', '职场', '文化', '纪实', '娱乐', '其他']
const CATEGORY_COLOR = {
  '政治': '#dc2626',
  '经济': '#d97706',
  '军事': '#7c3aed',
  '历史': '#059669',
  '哲学': '#0284c7',
  '心理': '#db2777',
  '传记': '#4f46e5',
  '访谈': '#ec4899',
  '辩论': '#ea580c',
  '职场': '#0d9488',
  '文化': '#a21caf',
  '纪实': '#64748b',
  '娱乐': '#f59e0b',
  '其他': '#6b7280',
}
function catsFor(type) { return type === '综艺' ? SHOW_CATEGORIES : BOOK_CATEGORIES }
// ★ type 判定三态：标准书分类→书籍；标准综艺分类→综艺；未知分类→信任存储的 type（兼容旧版自定义分类）
function deriveType(category, storedType) {
  if (BOOK_CATEGORIES.includes(category)) return '书籍'
  if (SHOW_CATEGORIES.includes(category)) return '综艺'
  return storedType === '综艺' ? '综艺' : '书籍'
}

// 状态
const STATUS = {
  want: { label: '想读', emoji: '📌', color: '#d1d5db' },
  reading: { label: '在读', emoji: '📖', color: '#f59e0b' },
  done: { label: '已读', emoji: '✅', color: '#10b981' },
}
const STATUS_ORDER = ['want', 'reading', 'done']

// 书籍搜索平台（默认微信读书，H5 在微信内会自动拉起小程序）
const LINK_PLATFORMS = {
  weread: { label: '微信读书', short: '微信读书', make: (t) => `https://weread.qq.com/web/search/books?keyword=${encodeURIComponent(t)}` },
  douban: { label: '豆瓣读书', short: '豆瓣', make: (t) => `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(t)}` },
  jd: { label: '京东', short: '京东', make: (t) => `https://search.jd.com/Search?keyword=${encodeURIComponent(t)}` },
  dangdang: { label: '当当', short: '当当', make: (t) => `http://search.dangdang.com/?key=${encodeURIComponent(t)}` },
}
function makeLink(platform, title) {
  const p = LINK_PLATFORMS[platform]
  if (!p || !title) return ''
  return p.make(title)
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const items = (parsed.items || []).map(i => {
        let category = i.category
        // 仅对「缺失」或旧版单字符串『综艺』做兜底，其余任何分类（含用户自定义/旧版分类）一律保留原值，绝不乱改名
        if (!category) category = '历史'
        else if (category === '综艺') category = '文化'
        // ★ type 完全由分类决定，彻底修复历史数据 type 字段被存错的问题
        const type = deriveType(category, i.type)
        return {
          ...i,
          type,
          category,
          note: i.note || '',
          watchWhere: i.watchWhere || '',
          link: i.link || '',
          linkPlatform: i.linkPlatform === 'douban' ? 'weread' : (i.linkPlatform || 'weread'),
        }
      })
      // 按「名称」迁移：同名→更新简介/分类；新名→追加（避免旧ID冲突导致漏加）
      const defaultItems = defaultSeed()
      const byTitle = new Map(items.map(i => [i.title, i]))
      defaultItems.forEach(d => {
        const exist = byTitle.get(d.title)
        if (exist) {
          // 内置条目(r开头)：以新数据为准覆盖；用户自建条目：保留笔记和内容
          const isSeed = /^r\d+$/.test(exist.id)
          byTitle.set(d.title, {
            ...exist,
            type: d.type,
            category: d.category,
            note: isSeed ? d.note : (exist.note || d.note),
            watchWhere: isSeed ? d.watchWhere || '' : (exist.watchWhere || d.watchWhere || ''),
            linkPlatform: exist.linkPlatform || d.linkPlatform || 'weread',
            link: exist.link || d.link || '',
            mynotes: exist.mynotes || '',
          })
        } else {
          byTitle.set(d.title, d)
        }
      })
      return { ...parsed, items: [...byTitle.values()] }
    }
  } catch (e) { console.warn('[reading] load失败', e) }
  // 默认内置推荐（带简介/观看平台/搜索链接）
  return { items: defaultSeed() }
}

function defaultSeed() {
  return [
    // 综艺（来自 @云边 视频的 8 部综艺推荐，按问题分组）
    { id: 'r1', title: '奇葩说', category: '辩论', type: '综艺', status: 'want', note: '不会吵架就看《奇葩说》：学会多角度思辨表达', watchWhere: '爱奇艺', createdAt: Date.now() },
    { id: 'r2', title: '非正式会谈', category: '访谈', type: '综艺', status: 'want', note: '格局太小就看《非正式会谈》：拓宽眼界认知', watchWhere: '哔哩哔哩', createdAt: Date.now() },
    { id: 'r3', title: '圆桌派', category: '文化', type: '综艺', status: 'want', note: '思维混乱就看《圆桌派》：理清逻辑，沉淀思考', watchWhere: '优酷 / 看理想', createdAt: Date.now() },
    { id: 'r4', title: '超级演说家', category: '辩论', type: '综艺', status: 'want', note: '不敢发言就看《超级演说家》：锻炼当众表达能力', watchWhere: '腾讯视频 / 哔哩哔哩', createdAt: Date.now() },
    { id: 'r5', title: '十三邀', category: '访谈', type: '综艺', status: 'want', note: '情商偏低就看《十三邀》：读懂人性，学会共情', watchWhere: '哔哩哔哩 / 腾讯视频', createdAt: Date.now() },
    { id: 'r6', title: '生命之旅', category: '文化', type: '综艺', status: 'want', note: '容易内耗就看《生命之旅》：和解自己，治愈内耗', watchWhere: '哔哩哔哩', createdAt: Date.now() },
    { id: 'r7', title: '局部', category: '文化', type: '综艺', status: 'want', note: '审美普通就看《局部》：培养独特审美品味', watchWhere: '哔哩哔哩 / 看理想 / 优酷', createdAt: Date.now() },
    { id: 'r8', title: '朗读者', category: '文化', type: '综艺', status: 'want', note: '文笔不好就看《朗读者》：积累文字，丰富语感', watchWhere: '央视一套 / 腾讯视频', createdAt: Date.now() },
      { id: 'r9', title: '毛选', category: '政治', type: '书籍', status: 'want', note: '看懂时事新闻，看透世界运行规则', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r10', title: '论中国', category: '政治', type: '书籍', status: 'want', note: '看懂中国的大战略', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r11', title: '中国历代政治得失', category: '政治', type: '书籍', status: 'want', note: '从历史讲透中国为什么是现在这样', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r12', title: '置身事内', category: '政治', type: '书籍', status: 'want', note: '理解中国地方政府运作', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r13', title: '资治通鉴', category: '政治', type: '书籍', status: 'want', note: '两千年的治国理政智慧', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r14', title: '纳瓦尔宝典', category: '经济', type: '书籍', status: 'want', note: '搞懂财富逻辑，做理性财务决策', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r15', title: '原则', category: '经济', type: '书籍', status: 'want', note: '达里奥的人生/工作/决策原则', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r16', title: '大道', category: '经济', type: '书籍', status: 'want', note: '巴菲特导师芒格的智慧集', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r17', title: '穷查理宝典', category: '经济', type: '书籍', status: 'want', note: '芒格的投资思维与多元思维模型', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r18', title: '小岛经济学', category: '经济', type: '书籍', status: 'want', note: '用小岛故事讲清经济学原理', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r19', title: '孙子兵法', category: '军事', type: '书籍', status: 'want', note: '两千年前的战略智慧，规划人生、破局成长', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r20', title: '全景二战', category: '军事', type: '书籍', status: 'want', note: '全景式看二战全程', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r21', title: '终结所有和平的和平', category: '军事', type: '书籍', status: 'want', note: '理解大国兴衰背后的逻辑', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r22', title: '海权的胜利', category: '军事', type: '书籍', status: 'want', note: '理解海洋对一个国家的意义', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r23', title: '战争史', category: '军事', type: '书籍', status: 'want', note: '从古到今人类战争的脉络', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r24', title: '人类简史', category: '历史', type: '书籍', status: 'want', note: '从认知革命讲到科技革命，看懂人类怎么走到今天', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r25', title: '史记', category: '历史', type: '书籍', status: 'want', note: '司马迁的史学巅峰之作', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r26', title: '年代四部曲', category: '历史', type: '书籍', status: 'want', note: '伊恩·莫里斯的人类文明长卷', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r27', title: '全球通史', category: '历史', type: '书籍', status: 'want', note: '从史前到现代的世界史教科书', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r28', title: '万历十五年', category: '历史', type: '书籍', status: 'want', note: '大历史观代表作，从一年看大明兴衰', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r29', title: '阳明心学', category: '哲学', type: '书籍', status: 'want', note: '向内思辨，稳住内心内核', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r30', title: '道德经', category: '哲学', type: '书籍', status: 'want', note: '东方哲学源头五千言', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r31', title: '理想国', category: '哲学', type: '书籍', status: 'want', note: '柏拉图的政治哲学奠基之作', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r32', title: '沉思录', category: '哲学', type: '书籍', status: 'want', note: '古罗马皇帝写给自己的话，焦虑时翻一翻', linkPlatform: 'weread', createdAt: Date.now() },
      { id: 'r33', title: '新哲人', category: '哲学', type: '书籍', status: 'want', note: '当代哲学入门，跟随日常问题思考', linkPlatform: 'weread', createdAt: Date.now() },
  ]
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function ReadingPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const [data, setData] = useState(loadData)
  const [typeFilter, setTypeFilter] = useState('全部')  // 全部 / 综艺 / 书籍
  const [catFilter, setCatFilter] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('全部')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)  // 编辑弹窗
  const [delId, setDelId] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  // 综艺/书籍判定（deriveType）：标准分类优先，未知分类信任存储的 type
  const isShowItem = (i) => deriveType(i.category, i.type) === '综艺'
  const allItems = (data.items || []).map(i => ({
    ...i,
    type: deriveType(i.category, i.type),
    category: i.category || '历史',
  }))
  const items = allItems
  const total = items.length
  const done = items.filter(i => i.status === 'done').length
  const progress = total > 0 ? Math.round(done / total * 100) : 0

  // 统计（按当前类型的分类）——分类按钮根据实际数据动态生成，保证「有什么分类就显示什么按钮，点哪个都能正确过滤」
  const currentCats = (() => {
    const pool = typeFilter === '综艺' ? items.filter(isShowItem)
      : typeFilter === '书籍' ? items.filter(i => !isShowItem(i))
      : items
    const present = [...new Set(pool.map(i => i.category).filter(Boolean))]
    const std = typeFilter === '综艺' ? SHOW_CATEGORIES
      : typeFilter === '书籍' ? BOOK_CATEGORIES
      : [...SHOW_CATEGORIES, ...BOOK_CATEGORIES]
    return [...std.filter(c => present.includes(c)), ...present.filter(c => !std.includes(c)).sort()]
  })()
  const catStats = {}
  currentCats.forEach(c => { catStats[c] = items.filter(i => i.category === c).length })

  const filtered = items.filter(i => {
    if (typeFilter === '综艺' && !isShowItem(i)) return false
    if (typeFilter === '书籍' && isShowItem(i)) return false
    if (typeFilter !== '全部' && typeFilter !== '综艺' && typeFilter !== '书籍' && i.type !== typeFilter) return false
    if (catFilter !== '全部' && i.category !== catFilter) return false
    if (statusFilter !== '全部' && i.status !== statusFilter) return false
    return true
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  const save = (newItems) => setData({ ...data, items: newItems })

  const toggleStatus = (id) => {
    const cur = items.find(i => i.id === id)
    const order = STATUS_ORDER
    const next = order[(order.indexOf(cur.status) + 1) % order.length]
    save(items.map(i => i.id === id ? { ...i, status: next } : i))
  }

  return (
    <div className="app-container">
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(16px + var(--safe-top)) 16px 12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>📚 读书成长</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-sub)' }}>自我提升综艺 + 开智必读书单</p>
        </div>
      </div>

      {/* 进度卡片 */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ ...glassStyle, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>读书进度</span>
            <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>{done}/{total} 项 · {progress}%</span>
          </div>
          <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', background: 'linear-gradient(135deg,#f472b6,#8b5cf6)', width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>

      {/* 类型筛选：综艺 / 读书 */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 16px 8px' }}>
        {[
          { key: '全部', label: '📚 全部' },
          { key: '综艺', label: '🎬 综艺' },
          { key: '书籍', label: '📖 读书' },
        ].map(t => (
          <button key={t.key} onClick={() => setTypeFilter(t.key)} style={{
            flex: 1, padding: '8px 0', borderRadius: '10px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
            background: typeFilter === t.key ? 'linear-gradient(135deg,#8b5cf6,#ec4899)' : 'rgba(255,255,255,0.5)',
            color: typeFilter === t.key ? '#fff' : 'var(--text-sub)',
            border: typeFilter === t.key ? 'none' : '1px solid rgba(255,255,255,0.6)',
            boxShadow: typeFilter === t.key ? '0 4px 12px rgba(139,92,246,0.25)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* 分类筛选（综艺和读书分类不同） */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 16px 8px', overflowX: 'auto' }}>
        {['全部', ...currentCats].map(c => (
          <button key={c} onClick={() => setCatFilter(c)} style={{
            padding: '6px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap',
            background: catFilter === c ? 'linear-gradient(135deg,#f472b6,#ec4899)' : 'rgba(255,255,255,0.5)',
            color: catFilter === c ? '#fff' : 'var(--text-sub)',
            border: catFilter === c ? 'none' : '1px solid rgba(255,255,255,0.6)',
          }}>{c}{c !== '全部' ? ` ${catStats[c] || 0}` : ''}</button>
        ))}
      </div>

      {/* 状态筛选 */}
      <div style={{ display: 'flex', gap: '6px', padding: '0 16px 12px' }}>
        {['全部', ...STATUS_ORDER].map(s => {
          const active = statusFilter === s
          const activeColor = s === '全部' ? 'rgba(244,114,182,0.85)' : STATUS[s].color
          return (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '5px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              background: active ? activeColor : 'rgba(255,255,255,0.5)',
              color: active ? '#fff' : 'var(--text-sub)',
              border: active ? 'none' : '1px solid rgba(255,255,255,0.6)',
            }}>{s === '全部' ? '全部状态' : STATUS[s].emoji + ' ' + STATUS[s].label}</button>
          )
        })}
      </div>

      {/* 列表 */}
      <div style={{ padding: '4px 16px calc(90px + var(--safe-bottom))' }}>
        {filtered.length === 0 ? (
          <div style={{ ...glassStyle, textAlign: 'center', padding: '40px 20px', color: 'var(--text-sub)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📚</div>
            <p style={{ fontSize: '14px', margin: 0 }}>暂无内容，点击右下角 + 添加</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(item => {
              const st = STATUS[item.status] || STATUS.want
              const color = CATEGORY_COLOR[item.category] || '#6b7280'
              return <ReadingCard
                key={item.id}
                item={item}
                st={st}
                color={color}
                onToggleStatus={() => toggleStatus(item.id)}
                onNotes={() => navigate(`/reading/${item.id}/notes`)}
                onEdit={() => setEditItem(item)}
                onDelete={() => setDelId(item.id)}
              />
            })}
          </div>
        )}
      </div>

      {/* 添加按钮 */}
      <button onClick={() => setShowAdd(true)} style={{
        position: 'fixed', right: '20px', bottom: 'calc(100px + var(--safe-bottom))',
        width: '56px', height: '56px', borderRadius: '50%', border: 'none',
        background: 'linear-gradient(135deg, #f472b6, #8b5cf6)', color: '#fff',
        fontSize: '28px', boxShadow: '0 8px 20px rgba(244,114,182,0.35)', cursor: 'pointer', zIndex: 20,
      }}>+</button>

      {/* 添加 / 编辑弹窗 */}
      <Modal
        open={showAdd || !!editItem}
        onClose={() => { setShowAdd(false); setEditItem(null) }}
        title={editItem ? '编辑' : '添加书籍/综艺'}
        footer={
          <div style={{ display: 'flex', gap: '10px' }}>
            <button style={btnGhost} onClick={() => { setShowAdd(false); setEditItem(null) }}>取消</button>
            <button style={{ ...btnPrimary, flex: 1 }} onClick={() => {
              const nameEl = document.getElementById('reading-name')
              const catEl = document.getElementById('reading-cat')
              const typeEl = document.getElementById('reading-type')
              const statusEl = document.getElementById('reading-status')
              const watchEl = document.getElementById('reading-watch')
              const linkPlatEl = document.getElementById('reading-linkplat')
              const noteEl = document.getElementById('reading-note')
              const title = (nameEl?.value || '').trim()
              if (!title) { show('请输入名称', 'error'); return }
              const type = typeEl?.value || '书籍'
              const category = catEl?.value || '其他'
              const base = {
                title,
                type,
                category,
                note: (noteEl?.value || '').trim(),
                watchWhere: type === '综艺' ? (watchEl?.value || '').trim() : '',
                linkPlatform: type === '书籍' ? (linkPlatEl?.value || 'douban') : '',
              }
              const link = type === '书籍' ? makeLink(base.linkPlatform, title) : ''
              if (editItem) {
                save(items.map(i => i.id === editItem.id ? { ...i, ...base, status: statusEl?.value || i.status, link } : i))
                show('已更新', 'success')
              } else {
                save([{ id: uid(), ...base, status: statusEl?.value || 'want', link, createdAt: Date.now() }, ...items])
                show('已添加', 'success')
              }
              setShowAdd(false); setEditItem(null)
            }}>{editItem ? '保存' : '添加'}</button>
          </div>
        }
      >
        <Field label="名称" required>
          <input id="reading-name" style={inputStyle} placeholder="例如：政治学通识 / 圆桌派" defaultValue={editItem?.title || ''} autoFocus />
        </Field>
        <Field label="类型">
          <select id="reading-type" style={inputStyle} defaultValue={editItem?.type || '书籍'} onChange={(e) => {
            const cat = document.getElementById('reading-cat')
            const newType = e.target.value
            if (cat) {
              const opts = catsFor(newType)
              if (!opts.includes(cat.value)) cat.value = newType === '综艺' ? '文化' : '历史'
            }
          }}>
            <option value="书籍">📖 读书</option>
            <option value="综艺">🎬 综艺</option>
          </select>
        </Field>
        <Field label="分类">
          <select id="reading-cat" style={inputStyle} defaultValue={editItem?.category || '历史'}>
            {(catsFor(editItem?.type || '书籍')).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        {editItem && (
          <Field label="状态">
            <select id="reading-status" style={inputStyle} defaultValue={editItem.status}>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS[s].emoji} {STATUS[s].label}</option>)}
            </select>
          </Field>
        )}
        {(() => {
          const isType = (editItem?.type || '书籍') === '综艺'
          return (
            <Field label={isType ? '在哪里看' : '搜索平台'}>
              {isType ? (
                <input id="reading-watch" style={inputStyle} placeholder="例如：腾讯视频 / 爱奇艺 / B站" defaultValue={editItem?.watchWhere || ''} />
              ) : (
                <select id="reading-linkplat" style={inputStyle} defaultValue={editItem?.linkPlatform || 'douban'}>
                  {Object.entries(LINK_PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              )}
            </Field>
          )
        })()}
        <Field label="备注（选填）">
          <textarea id="reading-note" style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="一句话推荐/心得" defaultValue={editItem?.note || ''} />
        </Field>
      </Modal>

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={() => { recordDelete('reading_growth_v1', delId); save(items.filter(i => i.id !== delId)); show('已删除', 'success') }}
        title="删除"
        message="确定删除这项吗？"
        confirmText="删除"
        danger
      />
    </div>
  )
}

function ReadingCard({ item, st, color, onToggleStatus, onNotes, onEdit, onDelete }) {
  const [swiped, setSwiped] = useState(false)
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
      {/* 左滑操作按钮 */}
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '6px' }}>
        <button onClick={() => { setSwiped(false); onEdit() }} style={{
          width: '60px', height: '72%', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          background: '#6366f1', color: '#fff',
        }}>✎<br/>编辑</button>
        <button onClick={() => { setSwiped(false); onDelete() }} style={{
          width: '60px', height: '72%', border: 'none', borderRadius: '10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          background: '#ef4444', color: '#fff',
        }}>×<br/>删除</button>
      </div>

      {/* 卡片主体 */}
      <div
        onTouchStart={(e) => { const t = e.touches[0]; e.currentTarget.dataset.swipeStart = `${t.clientX},${t.clientY}`; e.currentTarget.dataset.swiping = 'false' }}
        onTouchMove={(e) => { const t = e.touches[0]; const s = (e.currentTarget.dataset.swipeStart || '').split(',').map(Number); if (!s[0]) return; const dx = t.clientX - s[0]; const dy = t.clientY - s[1]; if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) e.currentTarget.dataset.swiping = 'true' }}
        onTouchEnd={(e) => { if (e.currentTarget.dataset.swiping === 'true') { setSwiped(prev => !prev); e.currentTarget.dataset.swiping = 'false' } }}
        style={{
          ...glassStyle, padding: '12px 14px', borderLeft: `3px solid ${color}`,
          transition: 'transform 0.2s ease',
          transform: swiped ? 'translateX(-140px)' : 'translateX(0)',
          position: 'relative', zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>{item.type === '综艺' ? '🎬' : '📖'}</span>
          <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>{item.title}</span>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: `${color}1a`, color, fontWeight: 600 }}>{item.category}</span>
        </div>
        {item.note && <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.5 }}>{item.note}</p>}
        {item.type === '综艺' && item.watchWhere && (
          <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#6366f1', fontWeight: 600 }}>📍 观看：{item.watchWhere}</p>
        )}
        {item.mynotes && (
          <div style={{ margin: '8px 0 0', padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,251,235,0.8)', border: '1px solid rgba(217,119,6,0.2)', fontSize: '12px', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            <span style={{ fontWeight: 700, color: '#d97706' }}>📝 我的笔记：</span>{item.mynotes}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button onClick={e => { e.stopPropagation(); onToggleStatus() }} style={{
            padding: '5px 12px', borderRadius: '999px', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            background: st.color, color: '#fff',
          }}>{st.emoji} {st.label}</button>
          <button onClick={e => { e.stopPropagation(); onNotes() }} style={{
            padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(217,119,6,0.3)', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            background: item.mynotes ? 'rgba(254,243,199,0.9)' : 'rgba(255,255,255,0.6)', color: '#d97706',
          }}>📝 {item.mynotes ? '编辑笔记' : '写笔记'}</button>
          {item.type === '书籍' && (item.linkPlatform || item.link) && (() => {
            const url = item.link || makeLink(item.linkPlatform, item.title)
            if (!url) return null
            const plat = LINK_PLATFORMS[item.linkPlatform]
            return (
              <a href={url} onClick={e => e.stopPropagation()} style={{
                padding: '5px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                background: 'rgba(13,148,136,0.1)', color: '#0d9488', border: '1px solid rgba(13,148,136,0.25)',
              }}>🔍 {plat ? plat.short : '搜索'}</a>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
