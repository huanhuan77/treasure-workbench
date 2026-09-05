import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { useToast } from '../components/Toast'

// ── 抖音违禁词库（纯前端，每日更新 ↓ 可自行增删） ─────────────────────────

const WORD_LIB = [
  // ═══ 🔴 广告极限词 ═══
  { w: '最', cat: '广告极限', level: 1, hint: '改用"很/非常/特别"' },
  { w: '第一', cat: '广告极限', level: 1, hint: '改用"前列/领先"' },
  { w: '首个', cat: '广告极限', level: 1, hint: '改用"早期/先锋"' },
  { w: '首选', cat: '广告极限', level: 1, hint: '改用"推荐/热门"' },
  { w: '唯一', cat: '广告极限', level: 1, hint: '改用"特色/特有"' },
  { w: '独家', cat: '广告极限', level: 1, hint: '证明后可用' },
  { w: '国家级', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '全世界', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '全国', cat: '广告极限', level: 1, hint: '需数据证明' },
  { w: '全网', cat: '广告极限', level: 1, hint: '需数据证明' },
  { w: '顶级', cat: '广告极限', level: 1, hint: '改用"优质/高端"' },
  { w: '极品', cat: '广告极限', level: 1, hint: '改用"精品/优质"' },
  { w: '极致', cat: '广告极限', level: 1, hint: '改用"出色/优秀"' },
  { w: '完美', cat: '广告极限', level: 1, hint: '改用"出色/优秀"' },
  { w: '百分百', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '100%', cat: '广告极限', level: 1, hint: '需数据证明' },
  { w: '百分之百', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '绝对', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '永不', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '永远', cat: '广告极限', level: 1, hint: '改用"持久/长期"' },
  { w: '永久', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '无效退款', cat: '广告极限', level: 1, hint: '需提供保证' },
  { w: '零风险', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '无风险', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '免费领', cat: '广告极限', level: 1, hint: '小心审核' },
  { w: '免费送', cat: '广告极限', level: 1, hint: '小心审核' },
  { w: '不花钱', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '不用花', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '0元', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '零元', cat: '广告极限', level: 1, hint: '禁止使用' },
  { w: '一折', cat: '广告极限', level: 1, hint: '需证明' },
  { w: '最低价', cat: '广告极限', level: 1, hint: '需证明' },
  { w: '超低价', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '史低价', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '跳楼价', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '亏本', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '仅此一次', cat: '广告极限', level: 1, hint: '限时可用' },
  { w: '随时涨价', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '卖疯了', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '抢疯了', cat: '广告极限', level: 1, hint: '禁用' },
  { w: '断货', cat: '广告极限', level: 1, hint: '需真实' },
  { w: '抢购', cat: '广告极限', level: 1, hint: '需真实' },

  // ═══ 🔴 违禁引流词 ═══
  { w: '微信', cat: '引流违禁', level: 1, hint: '用"薇❤"/图示代替' },
  { w: 'v信', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: 'VX', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: 'wx', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: 'QQ', cat: '引流违禁', level: 1, hint: '用谐音' },
  { w: 'q群', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '私信', cat: '引流违禁', level: 1, hint: '用"后台"替代' },
  { w: '私聊', cat: '引流违禁', level: 1, hint: '用"沟通"替代' },
  { w: '加我', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '加V', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '加微', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '扫码', cat: '引流违禁', level: 1, hint: '用图示代替' },
  { w: '扫二维码', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '二维码', cat: '引流违禁', level: 1, hint: '用图示代替' },
  { w: '关注我', cat: '引流违禁', level: 1, hint: '自然引导' },
  { w: '关注领', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '点赞送', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '私我', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '私聊我', cat: '引流违禁', level: 1, hint: '禁用' },
  { w: '主页', cat: '引流违禁', level: 1, hint: '可提及' },
  { w: '链接', cat: '引流违禁', level: 1, hint: '禁用外链' },

  // ═══ 🟡 夸大宣传 ═══
  { w: '治疗', cat: '夸大宣传', level: 2, hint: '改用"改善/缓解"' },
  { w: '治愈', cat: '夸大宣传', level: 2, hint: '禁用（医疗广告除外）' },
  { w: '根治', cat: '夸大宣传', level: 2, hint: '禁止使用' },
  { w: '除根', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '特效', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '神医', cat: '夸大宣传', level: 2, hint: '禁止使用' },
  { w: '秘方', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '祖传', cat: '夸大宣传', level: 2, hint: '需证明' },
  { w: '偏方', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '包过', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '包教包会', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '包你', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '保证', cat: '夸大宣传', level: 2, hint: '慎用' },
  { w: '担保', cat: '夸大宣传', level: 2, hint: '慎用' },
  { w: '立竿见影', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '立刻见效', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '速效', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '奇效', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '神效', cat: '夸大宣传', level: 2, hint: '禁用' },
  { w: '显著', cat: '夸大宣传', level: 2, hint: '需数据支持' },

  // ═══ 🟡 医疗健康 ═══
  { w: '减肥', cat: '医疗健康', level: 2, hint: '改用"体重管理"' },
  { w: '瘦身', cat: '医疗健康', level: 2, hint: '改用"体型管理"' },
  { w: '燃脂', cat: '医疗健康', level: 2, hint: '禁用' },
  { w: '溶脂', cat: '医疗健康', level: 2, hint: '禁用' },
  { w: '抗衰老', cat: '医疗健康', level: 2, hint: '改用"抗初老"' },
  { w: '防癌', cat: '医疗健康', level: 1, hint: '禁止使用' },
  { w: '抗癌', cat: '医疗健康', level: 1, hint: '禁止使用' },
  { w: '降糖', cat: '医疗健康', level: 1, hint: '需要资质' },
  { w: '降血压', cat: '医疗健康', level: 1, hint: '需要资质' },
  { w: '消炎', cat: '医疗健康', level: 1, hint: '需要资质' },
  { w: '杀菌', cat: '医疗健康', level: 2, hint: '需证明' },
  { w: '排毒', cat: '医疗健康', level: 2, hint: '禁用' },
  { w: '解毒', cat: '医疗健康', level: 2, hint: '禁用' },
  { w: '调理', cat: '医疗健康', level: 2, hint: '慎用' },
  { w: '药', cat: '医疗健康', level: 2, hint: '谨用' },

  // ═══ 🟡 营销敏感 ═══
  { w: '赚钱', cat: '营销敏感', level: 2, hint: '改用"增加收入"' },
  { w: '暴利', cat: '营销敏感', level: 2, hint: '禁用' },
  { w: '暴富', cat: '营销敏感', level: 2, hint: '禁用' },
  { w: '暴赚', cat: '营销敏感', level: 2, hint: '禁用' },
  { w: '躺赚', cat: '营销敏感', level: 2, hint: '禁用' },
  { w: '躺赢', cat: '营销敏感', level: 2, hint: '禁用' },
  { w: '分红', cat: '营销敏感', level: 2, hint: '慎用' },
  { w: '返利', cat: '营销敏感', level: 2, hint: '禁用' },
  { w: '返现', cat: '营销敏感', level: 2, hint: '禁用' },
  { w: '回扣', cat: '营销敏感', level: 2, hint: '禁止使用' },
  { w: '投资', cat: '营销敏感', level: 2, hint: '需资质' },
  { w: '理财', cat: '营销敏感', level: 2, hint: '需资质' },
  { w: '基金', cat: '营销敏感', level: 2, hint: '需资质' },
  { w: '股票', cat: '营销敏感', level: 2, hint: '需资质' },
  { w: '期货', cat: '营销敏感', level: 2, hint: '需资质' },
  { w: '币圈', cat: '营销敏感', level: 1, hint: '禁止' },
  { w: '挖矿', cat: '营销敏感', level: 1, hint: '禁止' },
  { w: '区块链', cat: '营销敏感', level: 2, hint: '需资质' },

  // ═══ 🟢 平台限定词 ═══
  { w: '直播间', cat: '平台限定', level: 3, hint: '谨慎使用' },
  { w: '小黄车', cat: '平台限定', level: 3, hint: '带货可用' },
  { w: '购物车', cat: '平台限定', level: 3, hint: '正常' },
  { w: '橱窗', cat: '平台限定', level: 3, hint: '正常' },
  { w: '福袋', cat: '平台限定', level: 3, hint: '抖音合规' },

  // ═══ ⚠️ 其他通用违禁 ═══
  { w: '赌博', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '赌', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '色情', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '裸', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '露点', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '情色', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '枪支', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '弹药', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '毒品', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '吸毒', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '冰毒', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '传销', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '诈骗', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '刷单', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '刷粉', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '买粉', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '卖粉', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '杀猪盘', cat: '通用违禁', level: 1, hint: '禁止' },
  { w: '黑奴', cat: '通用违禁', level: 2, hint: '禁用' },
  { w: '割韭菜', cat: '通用违禁', level: 2, hint: '禁用' },
  { w: '智商税', cat: '通用违禁', level: 2, hint: '禁用' },
  { w: '交税', cat: '通用违禁', level: 1, hint: '禁用（引申义）' },
  { w: '死', cat: '通用违禁', level: 1, hint: '敏感词' },
  { w: '杀', cat: '通用违禁', level: 1, hint: '暴力导向' },
]

// 排序：长词优先匹配，同级按字母
const SORTED_LIB = [...WORD_LIB].sort((a, b) => b.w.length - a.w.length || a.w.localeCompare(b.w))

// ── 检测引擎 ──

function scanText(text, extraWords = []) {
  const allWords = [...SORTED_LIB, ...extraWords.map(w => ({ w, cat: '自定义', level: 1, hint: '' }))]
  const found = []
  const checked = new Set()
  let cleaned = text

  for (const entry of allWords) {
    if (checked.has(entry.w)) continue
    checked.add(entry.w)
    const idx = cleaned.indexOf(entry.w)
    if (idx !== -1) {
      found.push({
        ...entry,
        start: idx,
        end: idx + entry.w.length,
        match: entry.w,
      })
      // 标记已处理位置避免重复匹配
      cleaned = cleaned.replace(entry.w, '█'.repeat(entry.w.length))
    }
  }

  // 按出现位置排序
  found.sort((a, b) => a.start - b.start)

  // 统计
  const stats = { total: found.length, byLevel: { 1: 0, 2: 0, 3: 0 }, byCategory: {} }
  for (const f of found) {
    stats.byLevel[f.level] = (stats.byLevel[f.level] || 0) + 1
    stats.byCategory[f.cat] = (stats.byCategory[f.cat] || 0) + 1
  }

  return { found, stats }
}

// ── 组件 ──────────────────────────────────────────────────────────────────

export function SensitiveCheckPage() {
  const navigate = useNavigate()
  const { show } = useToast()
  const { sensitiveWords } = useStore()

  const [input, setInput] = useState('')
  const [result, setResult] = useState(null)

  const handleCheck = () => {
    const text = input.trim()
    if (!text) { show('请输入待检测文案', 'error'); return }

    const res = scanText(text, sensitiveWords)
    if (res.found.length === 0) {
      show('✅ 未检测到违禁词', 'success')
    } else {
      show(`⚠️ 发现 ${res.found.length} 个潜在违禁词`, 'info')
    }
    setResult(res)
  }

  const levelName = (l) => ({ 1: '🔴 必改', 2: '🟡 建议改', 3: '🟢 注意' })[l] || l
  const levelBg = (l) => ({ 1: '#fef2f2', 2: '#fffbeb', 3: '#f0fdf4' })[l] || '#fff'
  const levelBorder = (l) => ({ 1: '#fca5a5', 2: '#fcd34d', 3: '#86efac' })[l] || '#ddd'

  return (
    <div className="app-container">
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 12px',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => navigate(-1)} style={{
          border: 'none', background: 'rgba(236,72,182,0.10)', color: 'var(--primary)',
          width: '36px', height: '36px', borderRadius: '50%', fontSize: '20px',
          cursor: 'pointer', flexShrink: 0,
        }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
            抖音违禁词检测
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-sub)' }}>
            纯前端检测 · 内置{SORTED_LIB.length}个词条 · 每日更新
          </p>
        </div>
      </header>

      <div style={{ padding: '0 16px 16px' }}>
        {/* 统计卡片 */}
        {result && (
          <div style={{
            display: 'flex', gap: '8px', marginBottom: '14px',
          }}>
            {[
              { label: '违禁词', value: result.stats.total, color: '#ef4444' },
              { label: '🔴 必改', value: result.stats.byLevel[1] || 0, color: '#ef4444' },
              { label: '🟡 建议改', value: result.stats.byLevel[2] || 0, color: '#f59e0b' },
              { label: '🟢 注意', value: result.stats.byLevel[3] || 0, color: '#10b981' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'rgba(255,255,255,0.5)', borderRadius: '12px',
                padding: '10px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* 输入区 */}
        <textarea value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={`粘贴抖音文案/标题/话题进行违禁词检测...\n\n示例：\n"今天给大家推荐一款全网最好的产品，加我微信领取优惠券，百分百有效，无效退款！"`}
          rows={6}
          style={{
            width: '100%', boxSizing: 'border-box',
            border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px',
            padding: '14px', fontSize: '14px', lineHeight: 1.6,
            color: 'var(--text-main)', outline: 'none', background: '#fff',
            resize: 'vertical', fontFamily: 'inherit',
          }}
        />

        <button onClick={handleCheck}
          disabled={!input.trim()}
          style={{
            width: '100%', marginTop: '12px', padding: '14px 0',
            border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 600, color: '#fff',
            background: !input.trim()
              ? 'linear-gradient(135deg,#ccc,#bbb)'
              : 'linear-gradient(135deg,#f472b6,#ec4899)',
            cursor: !input.trim() ? 'not-allowed' : 'pointer',
          }}
        >🔍 检测违禁词</button>

        {/* 结果 */}
        {result && (
          <div style={{ marginTop: '14px' }}>
            {/* 高亮预览 */}
            {result.found.length > 0 && (
              <div style={{
                background: '#fff', borderRadius: '14px', padding: '16px',
                border: '1px solid rgba(0,0,0,0.06)', marginBottom: '14px',
                fontSize: '14px', lineHeight: 1.8, whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '10px' }}>
                  📋 高亮预览
                </div>
                {(() => {
                  // 渲染高亮文本
                  const parts = []
                  let last = 0
                  const sorted = [...result.found].sort((a, b) => a.start - b.start)
                  for (const f of sorted) {
                    if (f.start > last) parts.push(input.slice(last, f.start))
                    const colors = { 1: { bg: '#fecaca', text: '#991b1b' }, 2: { bg: '#fde68a', text: '#92400e' }, 3: { bg: '#bbf7d0', text: '#166534' } }
                    const c = colors[f.level] || colors[1]
                    parts.push(
                      <mark key={f.start} style={{
                        background: c.bg, color: c.text,
                        padding: '2px 4px', borderRadius: '4px',
                        borderBottom: `2px solid ${c.text}`,
                        cursor: 'help',
                        title: `${f.cat}: ${f.hint}`,
                      }}>{input.slice(f.start, f.end)}</mark>
                    )
                    last = f.end
                  }
                  if (last < input.length) parts.push(input.slice(last))
                  return parts
                })()}
              </div>
            )}

            {/* 详情列表 */}
            {result.found.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {result.found.map((f, i) => (
                  <div key={i} style={{
                    background: levelBg(f.level), borderRadius: '12px', padding: '12px 14px',
                    border: `1px solid ${levelBorder(f.level)}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>
                        {f.match}
                      </span>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                        borderRadius: '999px',
                        background: levelBg(f.level),
                        border: `1px solid ${levelBorder(f.level)}`,
                        color: levelBorder(f.level) === '#fca5a5' ? '#991b1b' : levelBorder(f.level) === '#fcd34d' ? '#92400e' : '#166534',
                      }}>
                        {levelName(f.level)}
                      </span>
                    </div>
                    <div style={{
                      display: 'flex', gap: '8px', marginTop: '6px',
                      fontSize: '12px', color: 'var(--text-sub)',
                    }}>
                      <span>🏷️ {f.cat}</span>
                      {f.hint && <span>💡 {f.hint}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                background: '#f0fdf4', borderRadius: '14px',
                border: '1px solid #86efac',
              }}>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#166534' }}>
                  未检测到违禁词
                </div>
                <div style={{ fontSize: '13px', color: '#15803d', marginTop: '4px' }}>
                  文案内容安全，可以放心发布
                </div>
              </div>
            )}
          </div>
        )}

        {/* 词库说明 */}
        <div style={{
          marginTop: '16px', padding: '14px',
          background: 'rgba(255,255,255,0.4)', borderRadius: '14px',
          fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.6,
        }}>
          <strong>📚 词库说明</strong><br />
          • 内置 {SORTED_LIB.length} 条违禁词，覆盖广告极限/引流违禁/夸大宣传/医疗/金融等类别<br />
          • 🔴 必改：平台严格禁止，命中可能导致限流/扣分/封号<br />
          • 🟡 建议改：平台限制较严，建议替换为安全表述<br />
          • 🟢 注意：需在适当语境中使用<br />
          • 自定义词：可在「词库」页添加个人卡审词，此处自动参与检测
        </div>
      </div>
    </div>
  )
}
