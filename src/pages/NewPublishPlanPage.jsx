import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Selector } from 'antd-mobile'
import { useStore } from '../store'
import { useToast } from '../components/Toast'

const PUBLISH_KEY = 'daily_publish_plan_v1'

function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function getDateLabel(dateStr) {
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日 周${weekDays[d.getDay()]}`
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

const DATE_OPTS = [
  { offset: 0, label: '今天' },
  { offset: 1, label: '明天' },
  { offset: 2, label: '后天' },
  { offset: 3, label: '3天后' },
  { offset: 7, label: '1周后' },
]
const STATUS_OPTS = [
  { key: 'all', label: '全部' },
  { key: 'unpublished', label: '未发布' },
  { key: 'published', label: '已发布' },
  { key: 'hit', label: '爆单' },
]

export function NewPublishPlanPage() {
  const navigate = useNavigate()
  const { samples } = useStore()
  const { show } = useToast()
  const [pubAccount, setPubAccount] = useState('')
  const [pubStatus, setPubStatus] = useState('all')
  const [pubSampleIds, setPubSampleIds] = useState([])
  const [dateOffset, setDateOffset] = useState(1)  // 0=今天, 1=明天, 2=后天, 可调

  const publishDate = fmtDate(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + dateOffset))
  // 账号固定三个
  const accountOptions = ['广东刘亦菲', '晚梨不吃梨', '努力成为富婆']
  // 样品：排除「放弃」，可按 未发布/已发布/爆单 筛选，选账号后过滤该账号
  const sampleList = (samples || []).filter((s) => s.status !== 'abandoned' && (pubStatus === 'all' || s.status === pubStatus))
  const accountFiltered = pubAccount
    ? sampleList.filter((s) => s.account === pubAccount)
    : sampleList

  const handleAdd = () => {
    if (!pubAccount) { show('请选择账号', 'error'); return }
    if (pubSampleIds.length === 0) { show('请选择样品', 'error'); return }
    const chosen = sampleList.filter((x) => pubSampleIds.includes(x.id))
    if (chosen.length === 0) return
    let data = {}
    try { data = JSON.parse(localStorage.getItem(PUBLISH_KEY) || '{}') } catch { data = {} }
    const arr = data[publishDate] || []
    for (const s of chosen) {
      arr.push({ id: uid(), account: pubAccount, sampleId: s.id, productName: s.name, createdAt: Date.now() })
    }
    data[publishDate] = arr
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(data))
    window.dispatchEvent(new Event('publishPlanUpdated'))
    show(`已记录：${chosen.length} 个样品 → ${pubAccount}`, 'success')
    navigate(-1)
  }

  const sectionTitle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-sub)', marginBottom: '10px' }

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ padding: 'calc(16px + var(--safe-top)) 16px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate(-1)} style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>‹</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
          添加发布计划（{getDateLabel(publishDate)}）
        </h1>
      </header>

      <div style={{ padding: '16px 20px', flex: 1 }}>
        {/* 发布时间选择 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={sectionTitle}>发布时间</div>
          <Selector
            options={DATE_OPTS.map((d) => ({ label: d.label, value: String(d.offset) }))}
            value={[String(dateOffset)]}
            onChange={(v) => v.length && setDateOffset(Number(v[0]))}
            columns={5}
            showCheckMark={false}
          />
        </div>

        {/* 发布账号 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={sectionTitle}>发布账号</div>
          <Selector
            options={accountOptions.map((a) => ({ label: a, value: a }))}
            value={pubAccount ? [pubAccount] : []}
            onChange={(v) => setPubAccount(v[0] || '')}
            columns={1}
            showCheckMark={false}
          />
        </div>

        {/* 状态筛选 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={sectionTitle}>样品状态（筛选）</div>
          <Selector
            options={STATUS_OPTS.map((st) => ({ label: st.label, value: st.key }))}
            value={[pubStatus]}
            onChange={(v) => { setPubStatus(v[0] || 'all'); setPubSampleIds([]) }}
            columns={4}
            showCheckMark={false}
          />
        </div>

        {/* 选择样品 */}
        <div style={{ marginBottom: '24px' }}>
          <div style={sectionTitle}>
            {pubAccount ? `选择样品 · ${pubAccount}（共 ${accountFiltered.length} 个）` : `选择样品（共 ${sampleList.length} 个）`}
          </div>
          {accountFiltered.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#9ca3af', padding: '16px 0', textAlign: 'center' }}>
              {pubAccount ? '该账号暂无样品' : '暂无样品'}
            </div>
          ) : (
            <div style={{ maxHeight: '46vh', overflowY: 'auto', paddingBottom: '4px' }}>
              <Selector
                options={accountFiltered.map((s) => ({ label: s.name, value: s.id, description: s.account }))}
                value={pubSampleIds}
                onChange={setPubSampleIds}
                multiple
                columns={2}
                showCheckMark={false}
              />
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div style={{ padding: '12px 20px 24px', display: 'flex', gap: '12px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
        <button onClick={() => navigate(-1)} style={{
          flex: 1, padding: '14px 0', borderRadius: '12px',
          border: '1.5px solid rgba(0,0,0,0.1)', background: '#f9fafb',
          color: 'var(--text-sub)', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
        }}>取消</button>
        <button onClick={handleAdd} style={{
          flex: 2, padding: '14px 0', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg,#f472b6,#ec4899)',
          color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(244,114,182,0.3)',
        }}>添加</button>
      </div>
    </div>
  )
}
