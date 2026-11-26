// 年度备忘录的云端同步（复用工作台同一个 GitHub Gist，只碰备忘录这两个键）
//
// 为什么单独做一套：备忘录是「日期 → 条目数组」，没有 id / updatedAt，
// 走不了工作台那套按记录 LWW 的合并。这里改成**按天 LWW**：
//   localStorage.year_memo_mtime_v1 = { '2026-11-05': 1699999999999 } 记每天最后一次改动时间
//   同步时同一天取 mtime 更新的一份；两边时间相同（或旧数据没记时间）就合并去重，绝不丢条目。
//
// Gist 文件可能有两种格式，都要认：
//   ① 扁平：{ blogger_workbench_data_v1: …, year_memo_v1: … }（备份页上传的）
//   ② 包一层：{ data: { … }, meta: {…}, syncedAt }（双向同步引擎写的）

import { getStoredToken, markSynced, findLatestGist, uploadBackup, GIST_ID_KEY } from './cloudBackup'

export const MEMO_KEY = 'year_memo_v1'
export const MTIME_KEY = 'year_memo_mtime_v1'
export const MEMO_SYNC_AT = 'year_memo_sync_at'
const FILE_NAME = 'treasure-workbench-backup.json'
const API = 'https://api.github.com'

const normItem = (it) => {
  if (typeof it === 'string') return { t: it, done: false }
  if (it && typeof it === 'object') return { t: String(it.t || ''), done: !!it.done }
  return { t: '', done: false }
}
const itemsOf = (v) => (Array.isArray(v) ? v.map(normItem).filter((x) => x.t) : [])

export function loadLocal() {
  let memo = {}
  let mtime = {}
  try {
    const m = JSON.parse(localStorage.getItem(MEMO_KEY) || '{}')
    memo = m && typeof m === 'object' && !Array.isArray(m) ? m : {}
  } catch (e) {}
  try {
    const t = JSON.parse(localStorage.getItem(MTIME_KEY) || '{}')
    mtime = t && typeof t === 'object' ? t : {}
  } catch (e) {}
  return { memo, mtime }
}

function saveLocal(memo, mtime) {
  try { localStorage.setItem(MEMO_KEY, JSON.stringify(memo)) } catch (e) {}
  try { localStorage.setItem(MTIME_KEY, JSON.stringify(mtime)) } catch (e) {}
}

/** 某天被改动（新增/修改/删除/勾选）时打时间戳，同步靠它判断哪边更新 */
export function touchDay(date) {
  if (!date) return
  try {
    const raw = JSON.parse(localStorage.getItem(MTIME_KEY) || '{}') || {}
    raw[date] = Date.now()
    localStorage.setItem(MTIME_KEY, JSON.stringify(raw))
  } catch (e) {}
}

export function getLastSyncAt() {
  try { return localStorage.getItem(MEMO_SYNC_AT) || '' } catch (e) { return '' }
}

function setLastSyncAt() {
  const iso = new Date().toISOString()
  try { localStorage.setItem(MEMO_SYNC_AT, iso) } catch (e) {}
  return iso
}

/** 同一天两边都有内容的兜底合并：按文本去重，完成状态取「或」 */
function unionItems(a, b) {
  const map = new Map()
  for (const it of [...a, ...b]) {
    const k = it.t
    const ex = map.get(k)
    if (ex) ex.done = ex.done || it.done
    else map.set(k, { t: it.t, done: !!it.done })
  }
  return Array.from(map.values())
}

export function mergeMemo(local, remote) {
  const { memo: lm, mtime: lt } = local
  const rm = remote.memo || {}
  const rt = remote.mtime || {}
  const dates = new Set([
    ...Object.keys(lm), ...Object.keys(rm),
    ...Object.keys(lt), ...Object.keys(rt),
  ])
  const out = {}
  const outMt = {}
  let fromRemote = 0
  dates.forEach((d) => {
    const a = itemsOf(lm[d])
    const b = itemsOf(rm[d])
    const ta = Number(lt[d]) || 0
    const tb = Number(rt[d]) || 0
    let items
    if (ta > tb) items = a
    else if (tb > ta) { items = b; fromRemote++ }
    else if (!a.length) items = b
    else if (!b.length) items = a
    else items = unionItems(a, b)
    if (items.length) out[d] = items
    if (items.length) outMt[d] = Math.max(ta, tb) || 1
  })
  return { memo: out, mtime: outMt, fromRemote }
}

/**
 * 执行一次同步：拉云端 → 按天合并 → 写回云端 → 落本机
 * 返回 { memo, created?, fromRemote? }
 * 没配 Token 时抛错并带 code='NO_TOKEN'。
 */
export async function syncMemoNow() {
  const token = getStoredToken()
  if (!token) {
    const err = new Error('还没配置 GitHub Token')
    err.code = 'NO_TOKEN'
    throw err
  }
  const local = loadLocal()

  // 1) 找云端那份 Gist
  let gist = null
  let gistId = localStorage.getItem(GIST_ID_KEY) || ''
  if (gistId) {
    const r = await fetch(`${API}/gists/${gistId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (r.status === 401) throw new Error('Token 无效或已过期')
    if (r.ok) gist = await r.json()
    else if (r.status !== 404) throw new Error(`HTTP ${r.status}`)
  }
  if (!gist) {
    const latest = await findLatestGist(token)
    if (latest) { gist = latest; gistId = latest.id }
  }

  // 2) 云端还没有备份 → 直接把本机（含备忘录）整份传上去
  if (!gist) {
    await uploadBackup(token)
    const now = Date.now()
    const mtime = {}
    Object.keys(local.memo).forEach((d) => { mtime[d] = now })
    saveLocal(local.memo, mtime)
    setLastSyncAt()
    return { memo: local.memo, created: true }
  }

  const content = gist.files?.[FILE_NAME]?.content
  if (!content) throw new Error('云端备份里没有数据')
  let doc
  try { doc = JSON.parse(content) } catch (e) { throw new Error('云端备份内容解析失败') }
  const wrapped = doc && typeof doc === 'object' && doc.data && typeof doc.data === 'object' && !Array.isArray(doc.data) && ('syncedAt' in doc || 'meta' in doc)
  const store = wrapped ? doc.data : doc
  const remote = {
    memo: store[MEMO_KEY] && typeof store[MEMO_KEY] === 'object' ? store[MEMO_KEY] : {},
    mtime: store[MTIME_KEY] && typeof store[MTIME_KEY] === 'object' ? store[MTIME_KEY] : {},
  }

  // 3) 合并
  const merged = mergeMemo(local, remote)
  store[MEMO_KEY] = merged.memo
  store[MTIME_KEY] = merged.mtime

  // 4) 写回云端（只改文件内容里的这两个键，其它数据原样保留）
  const res = await fetch(`${API}/gists/${gistId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [FILE_NAME]: { content: JSON.stringify(doc) } } }),
  })
  if (res.status === 401) throw new Error('Token 无效或已过期')
  if (res.status === 404) throw new Error('Gist 已不存在，或 Token 缺少 gist 权限')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  // 5) 落本机
  saveLocal(merged.memo, merged.mtime)
  localStorage.setItem(GIST_ID_KEY, gistId)
  setLastSyncAt()
  markSynced()
  return { memo: merged.memo, fromRemote: merged.fromRemote }
}

/** 保存用户手填的 Token（和备份页共用同一份） */
export function saveToken(token) {
  try { localStorage.setItem('backup_github_token', (token || '').trim()) } catch (e) {}
}
