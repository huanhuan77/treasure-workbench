import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { syncAll } from '../../utils/sync'
import {
  getStoredToken, TOKEN_KEY, GIST_ID_KEY, LAST_SYNC_KEY,
  markSynced, formatSyncTime, restoreBackup,
} from '../../utils/cloudBackup'
import { SyncStatusDialog } from '../components/SyncStatusDialog'

// PC 版「数据备份」页（用户要求：点「备份与同步」不再跳手机版页面）。
//   · 当前数据：各模块条数速览
//   · 云同步状态：上次同步 / Gist ID / GitHub Token
//   · 主操作：同步（双向合并）、恢复（覆盖本机）、查看同步诊断
// 同步/恢复的实现全部复用 utils/sync + utils/cloudBackup，与手机版同一套逻辑。
const readLocal = (key) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}
const countArr = (v) => (Array.isArray(v) ? v.length : 0)
const countObj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).length : 0)

export function PcBackup() {
  const { show } = useToast()
  const {
    products, samples, orders, transactions, todos, publishRecords, dramas, applySyncResult,
  } = useStore()

  const [token, setToken] = useState(() => getStoredToken())
  const [showToken, setShowToken] = useState(false)
  const [gistId, setGistId] = useState(() => localStorage.getItem(GIST_ID_KEY) || '')
  const [editingGist, setEditingGist] = useState(false)
  const [gistDraft, setGistDraft] = useState(gistId)
  const [syncing, setSyncing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  // 同步后会重渲染，这里存一份「上次同步时间」用于展示
  const [lastSync, setLastSync] = useState(() => localStorage.getItem(LAST_SYNC_KEY) || '')

  // 每个模块给一个**自己的主题色**（与左侧菜单同色系），卡片配色一眼能认出是哪一块
  const stats = useMemo(() => ([
    { label: '产品', value: countArr(products), color: '#2f7d93' },
    { label: '样品', value: countArr(samples), color: '#7a5ea8' },
    { label: '发布记录', value: countArr(publishRecords), color: '#3f6fa8' },
    { label: '出单记录', value: countArr(orders), color: '#4f8a6d' },
    { label: '收支', value: countArr(transactions), color: '#a97c46' },
    { label: '投资', value: countArr(readLocal('blogger_investments_v1')), color: '#4a7c59' },
    { label: '每日计划', value: countObj(readLocal('daily_plan_v1')), color: '#6b7280' },
    { label: '待办', value: countArr(todos), color: '#b8517f' },
    { label: '日记', value: countObj(readLocal('blogger_calendar_v1')), color: '#4f7f8f' },
    { label: '追剧', value: countArr(dramas), color: '#b96a66' },
    { label: '读书成长', value: countArr(readLocal('reading_growth_v1')?.items), color: '#8a6d3b' },
    { label: '品牌方', value: countArr(readLocal('brand_contacts_v1')), color: '#7a8a4f' },
  ]), [products, samples, orders, transactions, todos, publishRecords, dramas])

  const saveToken = () => {
    try {
      localStorage.setItem(TOKEN_KEY, token.trim())
      show(token.trim() ? 'Token 已保存' : 'Token 已清空', 'success')
    } catch (e) { show('保存失败：' + e.message, 'error') }
  }

  const saveGist = () => {
    try {
      localStorage.setItem(GIST_ID_KEY, gistDraft.trim())
      setGistId(gistDraft.trim())
      setEditingGist(false)
      show('Gist ID 已保存', 'success')
    } catch (e) { show('保存失败：' + e.message, 'error') }
  }

  const handleSync = async () => {
    const tk = getStoredToken()
    if (!tk) { show('请先填写 GitHub Token', 'error'); return }
    if (syncing) return
    setSyncing(true)
    try {
      const result = await syncAll(tk, localStorage.getItem(GIST_ID_KEY))
      if (result.gistId) {
        localStorage.setItem(GIST_ID_KEY, result.gistId)
        setGistId(result.gistId)
      }
      applySyncResult(result.merged['blogger_workbench_data_v1'])
      setLastSync(markSynced())
      show(result.hasChanges ? '✅ 同步完成：本机与云端已合并' : '✅ 已是最新，无需同步', 'success')
    } catch (e) {
      show('同步失败：' + e.message, 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleRestore = async () => {
    setConfirmRestore(false)
    const tk = getStoredToken()
    if (!tk) { show('请先填写 GitHub Token', 'error'); return }
    setRestoring(true)
    try {
      const { count } = await restoreBackup(tk)
      show(`已恢复 ${count} 个模块，正在刷新…`, 'success')
      setTimeout(() => window.location.reload(), 800)
    } catch (e) {
      show('恢复失败：' + e.message, 'error')
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">数据备份</div>
          <div className="pcv-sub">云同步到 GitHub Gist · 数据永不丢失</div>
        </div>
        <div className="pcv-spacer" />
        <button className="pcv-btn pcv-btn-ghost" onClick={() => setShowStatus(true)}>查看同步诊断</button>
        <button className="pcv-btn" disabled={syncing} onClick={handleSync}>
          {syncing ? '同步中…' : '🔄 同步'}
        </button>
        <button
          className="pcv-btn pcv-btn-ghost"
          disabled={restoring}
          onClick={() => setConfirmRestore(true)}
        >{restoring ? '恢复中…' : '📥 恢复'}</button>
      </div>

      <div className="pcv-body">
        {/* 当前数据 */}
        <div className="pcv-card" style={{ marginBottom: 14 }}>
          <div className="pcv-card-h"><span>当前数据</span></div>
          <div className="pcv-card-b">
            {/* 6 列 × 2 行：12 个模块刚好排满，不再出现第二行只剩两块的尴尬；
                每块用自己的主题色（淡色底 + 彩字 + 顶部色条），扫一眼能认出是哪个模块 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    position: 'relative', overflow: 'hidden',
                    background: `${s.color}0f`,      // 主题色 6% 淡底
                    border: `0.5px solid ${s.color}33`,
                    borderRadius: 10, padding: '10px 12px 11px',
                  }}
                >
                  {/* 顶部 3px 色条：模块身份标识 */}
                  <span style={{
                    position: 'absolute', left: 0, right: 0, top: 0, height: 3,
                    background: s.color, opacity: 0.85,
                  }} />
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{s.label}</div>
                  <div style={{
                    fontSize: 20, fontWeight: 700, color: s.color,
                    fontVariantNumeric: 'tabular-nums', lineHeight: 1.15,
                  }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 云同步状态 */}
        <div className="pcv-card" style={{ marginBottom: 14 }}>
          <div className="pcv-card-h">
            <span>云同步状态</span>
            <span style={{ fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>
              上次同步：{formatSyncTime(lastSync)}
            </span>
          </div>
          <div className="pcv-card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div className="pcv-field-label">Gist ID</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {editingGist ? (
                  <>
                    <input
                      className="pcv-input"
                      style={{ width: 360 }}
                      value={gistDraft}
                      placeholder="留空则由系统按 Token 自动查找/新建"
                      onChange={(e) => setGistDraft(e.target.value)}
                    />
                    <button className="pcv-btn" onClick={saveGist}>保存</button>
                    <button className="pcv-btn pcv-btn-ghost" onClick={() => { setGistDraft(gistId); setEditingGist(false) }}>取消</button>
                  </>
                ) : (
                  <>
                    <code style={{ fontSize: 12, color: gistId ? '#4b5563' : '#c9cdd4' }}>{gistId || '（尚未创建，首次同步时自动生成）'}</code>
                    <button className="pcv-btn-text" onClick={() => { setGistDraft(gistId); setEditingGist(true) }}>编辑</button>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="pcv-field-label">GitHub Token</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="pcv-input"
                  style={{ width: 420 }}
                  type={showToken ? 'text' : 'password'}
                  placeholder="ghp_…（需 gist 权限）"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <button className="pcv-btn pcv-btn-ghost" onClick={() => setShowToken((v) => !v)}>{showToken ? '隐藏' : '显示'}</button>
                <button className="pcv-btn" onClick={saveToken}>保存 Token</button>
              </div>
              <div style={{ fontSize: 11, color: '#9aa0a9', marginTop: 6, lineHeight: 1.7 }}>
                生成地址：GitHub → Settings → Developer settings → Personal access tokens，勾选 <b>gist</b> 权限。
                Token 只存在本机 localStorage，不会上传。
              </div>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="pcv-card">
          <div className="pcv-card-h"><span>说明</span></div>
          <div className="pcv-card-b" style={{ fontSize: 12, color: '#6b7280', lineHeight: 2 }}>
            <div>· <b>首次使用</b>：一台设备点「同步」创建云端备份，另一台填同一个 Token 后点「同步」即可打通。</div>
            <div>· <b>同步</b>：双向合并，两端各自新增的内容都会保留，不会互相覆盖；同一条记录被两边改过时，以最后修改时间为准。</div>
            <div>· <b>恢复</b>：用云端备份<strong>覆盖</strong>本机数据，只在新手机或数据损坏时使用，本机未同步的内容会丢失。</div>
            <div>· <b>自动同步</b>：进入 PC 版或切回本标签页时，距上次超过 5 分钟会自动同步一次（不弹提示）。</div>
          </div>
        </div>
      </div>

      {showStatus && <SyncStatusDialog onClose={() => setShowStatus(false)} />}

      <ConfirmModal
        open={confirmRestore}
        onClose={() => setConfirmRestore(false)}
        onConfirm={handleRestore}
        title="从云端恢复"
        message="会用云端备份覆盖本机全部数据（产品、样品、收支、投资、日记等），本机未上传的内容会丢失。恢复后页面会自动刷新，确定继续？"
        confirmText="覆盖并恢复"
        danger
      />
    </>
  )
}
