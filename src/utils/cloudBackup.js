// GitHub Gist 云备份（纯函数，不依赖 React，备份页与 PC 总览页共用）
//
// 数据全部在 localStorage，备份就是把下面这些 key 拼成一个 JSON 传到私密 Gist：
//   blogger_workbench_data_v1 / blogger_investments_v1 / blogger_calendar_v1 /
//   daily_plan_v1 / brand_contacts_v1 / reading_growth_v1
//
// 两个动作的区别（都不可撤销，调用方要给确认/提示）：
//   uploadBackup  —— 本机数据 **覆盖云端**
//   restoreBackup —— 云端数据 **覆盖本机**（写完需刷新页面才生效）
//
// Token 存在 localStorage.backup_github_token（用户在备份页手填，需 gist 权限）。
// Gist ID 缓存在 localStorage.backup_gist_id，避免每次都翻 Gist 列表。

export const KEYS = [
  'blogger_workbench_data_v1',
  'blogger_investments_v1',
  'blogger_calendar_v1',
  'daily_plan_v1',
  'brand_contacts_v1',
  'reading_growth_v1',
]

export const TOKEN_KEY = 'backup_github_token'
export const GIST_ID_KEY = 'backup_gist_id'
export const LAST_SYNC_KEY = 'backup_last_sync_at'

const FILE_NAME = 'treasure-workbench-backup.json'
const API = 'https://api.github.com'

/** 读出本机全部要备份的数据（单个 key 解析失败不影响其它） */
export function getAllData() {
  const backup = {}
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) backup[key] = JSON.parse(raw)
    } catch (e) { /* 坏数据跳过 */ }
  }
  return backup
}

/** 当前存的 Token（去空格），没有就返回空串 */
export function getStoredToken() {
  return (localStorage.getItem(TOKEN_KEY) || '').trim()
}

/** 记录同步时间，返回写入的 ISO 字符串 */
export function markSynced(iso = new Date().toISOString()) {
  localStorage.setItem(LAST_SYNC_KEY, iso)
  return iso
}

/** 把同步时间格式化成「刚刚 / N 分钟前 / N 小时前 / 月-日 时:分」 */
export function formatSyncTime(iso) {
  if (!iso) return '从未同步'
  const d = new Date(iso)
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000)
  if (diffMin < 1) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** 翻 Gist 列表找最新的备份（本地没缓存 gistId 时用）。找到会回写缓存。 */
export async function findLatestGist(token) {
  let page = 1
  let found = null
  while (!found && page <= 5) {
    const listRes = await fetch(`${API}/gists?per_page=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (listRes.status === 401) throw new Error('Token 无效或已过期')
    if (listRes.status === 403) throw new Error('GitHub API 请求次数超限，请稍后再试')
    if (!listRes.ok) throw new Error(`HTTP ${listRes.status}`)
    const gists = await listRes.json()
    if (!Array.isArray(gists) || gists.length === 0) break
    // API 返回按更新时间倒序，第一个命中的就是最新的
    found = gists.find((g) => g.files?.[FILE_NAME])
    page++
  }
  if (found) localStorage.setItem(GIST_ID_KEY, found.id)
  return found
}

/**
 * 404 时给一句能照着做的解释：GitHub 对「没权限」和「不存在」都回 404，
 * 靠 GET /user 的 x-oauth-scopes 头把两种情况分开（拿不到该头时返回空串，调用方用自己的兜底文案）。
 */
async function explain404(tk) {
  try {
    const r = await fetch(`${API}/user`, { headers: { Authorization: `Bearer ${tk}` } })
    if (r.status === 401) return 'Token 无效或已过期，请重新生成'
    if (!r.ok) return ''
    const scopes = r.headers.get('x-oauth-scopes')
    if (scopes == null) return ''
    if (!/\bgist\b/.test(scopes)) {
      return `当前 Token 的权限是 [${scopes || '无'}]，不含 gist。请用 classic token 重新生成并勾选 gist 权限（勾 repo 是没用的）`
    }
    return 'Token 有 gist 权限，但云端不存在这个 Gist（可能已被删除，或备份属于另一个账号）'
  } catch (e) {
    return ''
  }
}

/** 把本机数据覆盖上传到 Gist（有 gistId 走 PATCH，没有则新建 POST）。返回 gistId */
export async function uploadBackup(token) {
  const tk = (token || '').trim()
  if (!tk) throw new Error('缺少 GitHub Token')
  const content = JSON.stringify(getAllData(), null, 2)
  let gistId = localStorage.getItem(GIST_ID_KEY)

  const send = (id) => fetch(id ? `${API}/gists/${id}` : `${API}/gists`, {
    method: id ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${tk}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(id
      ? { files: { [FILE_NAME]: { content } } }
      : { description: '博主工作台数据备份', public: false, files: { [FILE_NAME]: { content } } }),
  })

  let res = await send(gistId)
  // 缓存的 Gist 已不存在（被删 / 换了账号）→ 丢掉缓存，重新建一个，别直接报 404
  if (res.status === 404 && gistId) {
    localStorage.removeItem(GIST_ID_KEY)
    gistId = null
    res = await send(null)
  }
  if (res.status === 401) throw new Error('Token 无效或已过期')
  if (res.status === 403) throw new Error('GitHub API 限流，或 Token 缺少 gist 权限')
  if (res.status === 404) {
    const hint = await explain404(tk)
    throw new Error(hint || 'Gist 不存在，或 Token 缺少 gist 权限（请改用带 gist scope 的 token，不是 repo）')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const result = await res.json()
  const nextId = gistId || result.id
  if (!gistId && result.id) localStorage.setItem(GIST_ID_KEY, result.id)
  markSynced()
  return { gistId: nextId }
}

/** 用云端备份覆盖本机数据。返回 { count, updatedAt, gistId }，调用方需刷新页面 */
export async function restoreBackup(token) {
  const tk = (token || '').trim()
  if (!tk) throw new Error('缺少 GitHub Token')

  // 优先用本地缓存的 gistId；取不到再翻列表
  let gist = null
  let usedId = localStorage.getItem(GIST_ID_KEY)
  if (usedId) {
    const res = await fetch(`${API}/gists/${usedId}`, { headers: { Authorization: `Bearer ${tk}` } })
    if (res.ok) gist = await res.json()
  }
  if (!gist) {
    const latest = await findLatestGist(tk)
    if (latest) {
      usedId = latest.id
      const res = await fetch(`${API}/gists/${usedId}`, { headers: { Authorization: `Bearer ${tk}` } })
      if (res.ok) gist = await res.json()
    }
  }
  if (!gist?.files?.[FILE_NAME]?.content) {
    const hint = await explain404(tk)
    throw new Error(hint || `未找到云端备份：Token 的 Gist 列表里没有 ${FILE_NAME}。请先在备份页填写 Gist ID，或先点「上传到云端」`)
  }
  if (usedId) localStorage.setItem(GIST_ID_KEY, usedId)

  const content = gist.files[FILE_NAME].content
  const updatedAt = gist.updated_at
  const backup = JSON.parse(content)
  let count = 0
  for (const [key, value] of Object.entries(backup)) {
    localStorage.setItem(key, JSON.stringify(value))
    count++
  }
  if (updatedAt) markSynced()
  return { count, updatedAt, gistId: usedId }
}
