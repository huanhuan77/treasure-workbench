import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { getStoredToken } from '../../utils/cloudBackup'
import { readRemoteBackup, SYNC_KEYS } from '../../utils/sync'

// 「同步诊断」：一眼看出云端与本机各模块差多少。
//
// 背景：数据存在各设备 localStorage，只有点同步才跟 GitHub Gist 合并一次。
// 出现「手机有、PC 没有」时，需要知道是「手机没推上去」还是「本机没拉下来」，
// 光看总条数看不出来，所以按模块并列本机 / 云端两个数字。
const COUNT_KEYS = [
  { key: 'products', label: '产品', main: true },
  { key: 'samples', label: '样品', main: true },
  { key: 'orders', label: '出单记录', main: true },
  { key: 'publishRecords', label: '发布记录', main: true },
  { key: 'transactions', label: '收支流水', main: true },
  { key: 'todos', label: '待办', main: true },
  { key: 'dramas', label: '追剧', main: true },
  { key: 'blogger_investments_v1', label: '投资记录' },
  { key: 'brand_contacts_v1', label: '品牌方' },
  { key: 'blogger_calendar_v1', label: '日历（有记录的天数）' },
  { key: 'daily_plan_v1', label: '每日计划（天数）' },
]

function countOf(key, val) {
  if (!val) return 0
  if (Array.isArray(val)) return val.length
  if (key === 'reading_growth_v1') return Array.isArray(val.items) ? val.items.length : 0
  if (typeof val === 'object') return Object.keys(val).length
  return 0
}

function localModule(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    return null
  }
}

export function SyncStatusDialog({ onClose }) {
  const navigate = useNavigate()
  const { products, samples, orders, publishRecords, transactions, todos, dramas } = useStore()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [remote, setRemote] = useState(null)

  const mainLocal = useMemo(() => ({
    products, samples, orders, publishRecords, transactions, todos, dramas,
  }), [products, samples, orders, publishRecords, transactions, todos, dramas])

  useEffect(() => {
    let alive = true
    const tk = getStoredToken()
    if (!tk) {
      setLoading(false)
      setError('本机还没配置 GitHub Token，先在「数据备份」页填好再来看诊断')
      return () => { alive = false }
    }
    readRemoteBackup(tk)
      .then((r) => { if (alive) { setRemote(r); setLoading(false) } })
      .catch((e) => { if (alive) { setError(e.message || '读取云端失败'); setLoading(false) } })
    return () => { alive = false }
  }, [])

  const rows = useMemo(() => {
    const remoteData = remote?.data || {}
    return COUNT_KEYS.map((m) => {
      const localVal = m.main ? mainLocal[m.key] : localModule(m.key)
      const remoteVal = m.main ? remoteData?.['blogger_workbench_data_v1']?.[m.key] : remoteData?.[m.key]
      return {
        ...m,
        local: countOf(m.key, localVal),
        remote: countOf(m.key, remoteVal),
      }
    })
  }, [mainLocal, remote])

  const diffCount = rows.filter((r) => r.local !== r.remote).length
  const syncedAt = remote?.updatedAt ? new Date(remote.updatedAt) : null

  return (
    <div className="pcv-overlay" onClick={onClose}>
      <div className="pcv-dialog" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="pcv-dialog-h">
          <span>同步诊断</span>
          <div className="pcv-spacer" />
          <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
        </div>

        <div className="pcv-dialog-b">
          <div style={{ fontSize: 12, color: '#8a8f98', lineHeight: 1.7, marginBottom: 12 }}>
            数据存在各设备本地，只有点「同步」才与云端 Gist 合并。
            <b>数字不一样 = 该端还没推/没拉</b>：先让有数据的那端点同步，再在这端点一次。
            <br />
            云端最近写入：{syncedAt ? syncedAt.toLocaleString('zh-CN', { hour12: false }) : '—'}
          </div>

          {loading ? (
            <div className="pcv-empty" style={{ padding: '28px 0' }}>读取云端中…</div>
          ) : error ? (
            <div className="pcv-empty" style={{ padding: '28px 0', color: '#b96a66' }}>{error}</div>
          ) : !remote?.data ? (
            <div className="pcv-empty" style={{ padding: '28px 0' }}>云端还没有备份文件 —— 先点一次「同步」创建</div>
          ) : (
            <table className="pcv-table">
              <thead>
                <tr>
                  <th>模块</th>
                  <th style={{ width: 90 }}>本机</th>
                  <th style={{ width: 90 }}>云端</th>
                  <th style={{ width: 110 }}>状态</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const same = r.local === r.remote
                  return (
                    <tr key={r.key}>
                      <td>{r.label}</td>
                      <td className="pcv-num" style={{ fontWeight: 400 }}>{r.local}</td>
                      <td className="pcv-num" style={{ fontWeight: 400, color: same ? '#4b5563' : '#b96a66' }}>{r.remote}</td>
                      <td>
                        {same ? (
                          <span style={{ fontSize: 12, color: '#8a8f98' }}>一致</span>
                        ) : r.local > r.remote ? (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#b1702c' }}>本机多 {r.local - r.remote}</span>
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#3f6fa8' }}>云端多 {r.remote - r.local}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {!loading && !error && remote?.data && (
            <div style={{ fontSize: 12, color: diffCount ? '#b1702c' : '#5f8a74', marginTop: 10 }}>
              {diffCount === 0
                ? '各模块条数都一致，两端数据已同步'
                : `有 ${diffCount} 个模块条数不一致：本机多的先点同步推上去，云端多的点同步拉下来`}
            </div>
          )}
        </div>

        <div className="pcv-dialog-f">
          <span style={{ fontSize: 11, color: '#9aa0a9' }}>
            共 {SYNC_KEYS.length} 个同步模块
          </span>
          <div className="pcv-spacer" />
          <button className="pcv-btn pcv-btn-ghost" onClick={() => { onClose(); navigate('/backup') }}>
            打开数据备份页
          </button>
          <button className="pcv-btn" style={{ marginLeft: 8 }} onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
