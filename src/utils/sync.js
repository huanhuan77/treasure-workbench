// 双向同步引擎：基于 GitHub Gist 的 read-merge-write 同步
// 核心：记录级合并（LWW：最后修改胜出）+ 软删除(tombstone)传播
// 数据结构：Gist 文件 = { data: { [key]: value }, meta: { [moduleKey]: { [id]: deletedAt } }, syncedAt }

// 参与同步的数据键（与 BackupPage 一致）
export const SYNC_KEYS = [
  'blogger_workbench_data_v1',
  'blogger_investments_v1',
  'blogger_calendar_v1',
  'daily_plan_v1',
  'brand_contacts_v1',
  'reading_growth_v1',
]

export const GIST_ID_KEY = 'backup_gist_id'
export const LAST_SYNC_KEY = 'backup_last_sync_at'
const TOMBSTONE_KEY = 'blogger_sync_meta_v1'
const WORD_TIME_KEY = 'blogger_sync_word_times_v1'
const GIST_FILENAME = 'treasure-workbench-backup.json'

// ── 时间工具 ──────────────────────────────────────────────
// 记录时间戳：优先 updatedAt，兜底 createdAt；都没有返回 0
function getTime(obj) {
  if (!obj || typeof obj !== 'object') return 0
  return Number(obj.updatedAt) || Number(obj.createdAt) || 0
}

// ── 本地读写 ──────────────────────────────────────────────
function getAllLocal() {
  const out = {}
  for (const key of SYNC_KEYS) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) out[key] = JSON.parse(raw)
    } catch (e) {}
  }
  return out
}

export function getLocalMeta() {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY)
    if (raw) return JSON.parse(raw) || {}
  } catch (e) {}
  return {}
}

// 删除时记录 tombstone（由 store 的删除操作调用）
export function recordDelete(moduleKey, id) {
  if (!moduleKey || !id) return
  const meta = getLocalMeta()
  meta[moduleKey] = meta[moduleKey] || {}
  meta[moduleKey][id] = Date.now()
  try { localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(meta)) } catch (e) {}
}

// 重新添加/恢复时清除 tombstone（防止"删了又加"被同步吞掉）
export function clearDelete(moduleKey, id) {
  if (!moduleKey || !id) return
  const meta = getLocalMeta()
  if (meta[moduleKey] && meta[moduleKey][id]) {
    delete meta[moduleKey][id]
    if (!Object.keys(meta[moduleKey]).length) delete meta[moduleKey]
    try { localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(meta)) } catch (e) {}
  }
}

export function clearLocalMeta() {
  try { localStorage.removeItem(TOMBSTONE_KEY) } catch (e) {}
}

// 敏感词添加时间记录（区分"老词该删"与"删除后重新添加"）
export function setWordTime(word, t) {
  if (!word) return
  try {
    const wt = JSON.parse(localStorage.getItem(WORD_TIME_KEY) || '{}')
    wt[word] = t
    localStorage.setItem(WORD_TIME_KEY, JSON.stringify(wt))
  } catch (e) {}
}

function getWordTimes() {
  try {
    return JSON.parse(localStorage.getItem(WORD_TIME_KEY) || '{}') || {}
  } catch (e) { return {} }
}

// ── Gist 读写 ─────────────────────────────────────────────
async function fetchGist(token, gistId) {
  if (!gistId) return null
  const res = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (res.status === 404) return null
  if (res.status === 401) throw new Error('Token 无效或已过期')
  if (res.status === 403) throw new Error('GitHub API 请求次数超限，请稍后再试')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

async function saveGist(token, gistId, payload) {
  const url = gistId
    ? `https://api.github.com/gists/${gistId}`
    : 'https://api.github.com/gists'
  const method = gistId ? 'PATCH' : 'POST'
  const body = gistId ? {
    files: { [GIST_FILENAME]: { content: JSON.stringify(payload) } },
  } : {
    description: '博主工作台数据备份',
    public: false,
    files: { [GIST_FILENAME]: { content: JSON.stringify(payload) } },
  }
  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const result = await res.json()
  return result.id
}

// ── 合并核心 ──────────────────────────────────────────────
// 数组按 id 合并（LWW），并应用 tombstone（删除 vs 修改：修改晚于删除则保留）
// 无 id 记录：按内容生成稳定 key，避免同步时被丢弃
function stableKey(item) {
  const sig = JSON.stringify(item)
  let h = 5381
  for (let i = 0; i < sig.length; i++) h = ((h << 5) + h + sig.charCodeAt(i)) | 0
  return 's:' + Math.abs(h).toString(36) + '_' + sig.length
}

function mergeArrayById(localArr, remoteArr, tombstones = {}) {
  const map = new Map()
  const push = (item) => {
    if (!item || typeof item !== 'object') return
    const id = item.id || stableKey(item)
    const t = getTime(item)
    const ex = map.get(id)
    if (!ex || t > ex.time) map.set(id, { item, time: t })
  }
  ;(localArr || []).forEach(push)
  ;(remoteArr || []).forEach(push)
  for (const [id, delTime] of Object.entries(tombstones)) {
    const ex = map.get(id)
    if (!ex) continue            // 两侧都无此记录 → tombstone 冗余，清理阶段处理
    if (ex.time <= delTime) map.delete(id)  // 记录未被改新 → 执行删除
    // 修改晚于删除 → 保留记录，tombstone 在 cleanup 阶段失效
  }
  return Array.from(map.values()).map((e) => e.item)
}

// 敏感词数组合并：
//  本地词 → 看添加时间：老词被 tombstone 删除传播；删除后重新添加的（时间晚于删除）保留
//  云端词 → tombstone 若为"本端最近同步之后的新删除"则阻止复活，否则信任对端数据直通
function mergeWords(localArr, remoteArr, tombstones = {}, wordTimes = {}, lastSync = 0) {
  const out = []
  const seen = new Set()
  for (const w of localArr || []) {
    if (typeof w !== 'string' || seen.has(w)) continue
    seen.add(w)
    const delTime = tombstones[w]
    if (delTime) {
      const addedAt = wordTimes[w] || 0
      if (addedAt > delTime) out.push(w)   // 删除后重新添加 → 保留
      continue                              // 老词 → 删除传播
    }
    out.push(w)
  }
  for (const w of remoteArr || []) {
    if (typeof w !== 'string' || seen.has(w)) continue
    seen.add(w)
    const delTime = tombstones[w]
    if (delTime && delTime > lastSync) continue  // 本端最近同步之后发起的删除 → 不复活
    out.push(w)
  }
  return out
}

// 产品数组合并：按 id LWW，同时嵌套合并每项的 copies 数组
function mergeProducts(localArr, remoteArr, tombstones = {}) {
  const lp = localArr || []
  const rp = remoteArr || []
  const map = new Map()
  const push = (p) => {
    if (!p || !p.id) return
    const t = getTime(p)
    const ex = map.get(p.id)
    if (!ex || t > ex.time) map.set(p.id, { item: p, time: t })
  }
  lp.forEach(push)
  rp.forEach(push)
  for (const [id, delTime] of Object.entries(tombstones)) {
    const ex = map.get(id)
    if (ex && ex.time <= delTime) map.delete(id)
  }
  const result = []
  for (const e of map.values()) {
    const p = e.item
    const lv = lp.find((x) => x && x.id === p.id)
    const rv = rp.find((x) => x && x.id === p.id)
    let copies
    if (lv && rv) {
      copies = mergeArrayById(lv.copies || [], rv.copies || [], tombstones)
    } else {
      copies = (lv ? lv.copies : rv ? rv.copies : []) || []
    }
    result.push({ ...p, copies })
  }
  return result
}

// 对象：逐键合并（值递归）；两侧对象带时间戳 → LWW；数组 → mergeArrayById
function mergeObject(localObj, remoteObj, tombstones = {}) {
  if (!localObj || typeof localObj !== 'object') return remoteObj == null ? localObj : remoteObj
  if (!remoteObj || typeof remoteObj !== 'object') return localObj
  const result = { ...localObj }
  for (const key of Object.keys(remoteObj)) {
    if (key === 'id') continue
    const lv = localObj[key]
    const rv = remoteObj[key]
    if (Array.isArray(lv) || Array.isArray(rv)) {
      result[key] = mergeArrayById(Array.isArray(lv) ? lv : [], Array.isArray(rv) ? rv : [], tombstones)
    } else if (lv && rv && typeof lv === 'object' && typeof rv === 'object') {
      const lt = getTime(lv), rt = getTime(rv)
      if (lt || rt) {
        result[key] = rt > lt ? rv : lv
      } else {
        result[key] = mergeObject(lv, rv, tombstones)
      }
    } else {
      // 标量：remote 覆盖（云端视为合并结果）
      result[key] = (rv !== undefined && rv !== null) ? rv : lv
    }
  }
  return result
}

// savingsData 特殊合并：monthlyGoal 跟随整体时间戳新侧；records 逐月 LWW；investments 按 id
function mergeSavings(local, remote, tombstones = {}) {
  const l = local || {}
  const r = remote || {}
  const base = getTime(l) >= getTime(r) ? l : r
  return {
    monthlyGoal: base.monthlyGoal != null ? base.monthlyGoal : (l.monthlyGoal ?? 6000),
    records: mergeObject(l.records || {}, r.records || {}, tombstones),
    investments: mergeArrayById(l.investments || [], r.investments || [], tombstones),
    updatedAt: Math.max(getTime(l), getTime(r), Date.now()),
  }
}

// 日历/每日计划：{ date: value } 键级合并；支持 date 级删除（tombstone 的日期格式 key）
// 与 tasks 级 tombstone 共存：日期格式 key → 删除当天记录；其他 → tasks 数组按 id
const IS_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/
function mergeByDate(local, remote, tombstones = {}, tasksField) {
  if (!local || typeof local !== 'object') return remote
  if (!remote || typeof remote !== 'object') return local
  const result = { ...local }
  for (const [date, rv] of Object.entries(remote)) {
    const lv = local[date]
    if (lv === undefined) {
      result[date] = rv
    } else if (tasksField && rv && lv && typeof rv === 'object' && typeof lv === 'object') {
      result[date] = {
        ...lv,
        ...rv,
        tasks: mergeArrayById(lv.tasks || [], rv.tasks || [], tombstones),
      }
    } else if (rv && lv && typeof rv === 'object' && typeof lv === 'object') {
      result[date] = { ...lv, ...rv }
    } else {
      result[date] = rv
    }
  }
  // 应用 date 级 tombstone（删除某天的记录）
  for (const [id, delTime] of Object.entries(tombstones)) {
    if (!IS_DATE_KEY.test(id)) continue
    const lv = result[id]
    if (lv === undefined) continue
    // 记录在删除之后又被修改 → 保留
    if (lv && typeof lv === 'object' && getTime(lv) > delTime) continue
    delete result[id]
  }
  return result
}

// 各模块合并入口
function mergeModule(key, localVal, remoteVal, tombstones, wordTimes, lastSync) {
  if (localVal == null) return remoteVal == null ? null : remoteVal
  if (remoteVal == null) return localVal
  const t = (tombstones && tombstones[key]) || {}
  switch (key) {
    case 'blogger_workbench_data_v1':
      return {
        products: mergeProducts(localVal.products, remoteVal.products, t),
        samples: mergeArrayById(localVal.samples, remoteVal.samples, t),
        transactions: mergeArrayById(localVal.transactions, remoteVal.transactions, t),
        savingsData: mergeSavings(localVal.savingsData, remoteVal.savingsData, t),
        sensitiveWords: mergeWords(localVal.sensitiveWords, remoteVal.sensitiveWords, t, wordTimes, lastSync),
      }
    case 'blogger_investments_v1':
      return mergeArrayById(localVal, remoteVal, t)
    case 'blogger_calendar_v1':
      return mergeByDate(localVal, remoteVal, t, null)
    case 'daily_plan_v1':
      return mergeByDate(localVal, remoteVal, t, 'tasks')
    case 'brand_contacts_v1':
      return mergeArrayById(localVal, remoteVal, t)
    case 'reading_growth_v1':
      return { ...localVal, items: mergeArrayById(localVal.items, remoteVal.items, t) }
    default:
      return remoteVal
  }
}

// tombstone 合并（只取时间新者，不做清理）
function mergeMetaRaw(localMeta, remoteMeta) {
  const local = localMeta || {}
  const remote = remoteMeta || {}
  const result = {}
  const modules = new Set([...Object.keys(local), ...Object.keys(remote)])
  for (const m of modules) {
    const lt = local[m] || {}
    const rt = remote[m] || {}
    const tomb = {}
    const ids = new Set([...Object.keys(lt), ...Object.keys(rt)])
    for (const id of ids) tomb[id] = Math.max(lt[id] || 0, rt[id] || 0)
    if (Object.keys(tomb).length) result[m] = tomb
  }
  return result
}

// tombstone 清理：记录仍在数据中（修改胜出）或超过 90 天 → 移除
function cleanupTombstones(meta, mergedData) {
  const ninetyDays = 90 * 24 * 3600 * 1000
  const result = {}
  for (const [m, tomb] of Object.entries(meta || {})) {
    const modData = mergedData[m]
    const kept = {}
    for (const [id, delTime] of Object.entries(tomb)) {
      if (findRecord(modData, id)) continue       // 记录还活着 → tombstone 失效
      if (Date.now() - delTime > ninetyDays) continue  // 超过 90 天 → 清理
      kept[id] = delTime
    }
    if (Object.keys(kept).length) result[m] = kept
  }
  return result
}

// 在模块数据中递归查找 id 是否存活
function findRecord(modData, id) {
  if (!modData) return false
  if (Array.isArray(modData)) {
    return modData.some((item) => item && (item.id === id || findRecord(item, id)))
  }
  if (typeof modData === 'object') {
    return Object.values(modData).some((v) => findRecord(v, id))
  }
  return false
}

// ── 同步主流程 ────────────────────────────────────────────
// 返回 { merged, meta, gistId, hasChanges }
export async function syncAll(token, gistId, { forcePush = false } = {}) {
  if (!token) throw new Error('未配置 Token')
  // 1. 拉取云端
  let remoteData = null
  let remoteMeta = null
  let resolvedGistId = gistId || null
  if (!forcePush && resolvedGistId) {
    const gist = await fetchGist(token, resolvedGistId)
    if (gist?.files?.[GIST_FILENAME]?.content) {
      try {
        const parsed = JSON.parse(gist.files[GIST_FILENAME].content)
        if (parsed && parsed.data && parsed.meta) {
          remoteData = parsed.data
          remoteMeta = parsed.meta
        } else {
          remoteData = parsed  // 兼容旧格式（直接是各键值）
          remoteMeta = {}
        }
      } catch (e) {}
    }
  }

  const localData = getAllLocal()
  const localMeta = getLocalMeta()
  const wordTimes = getWordTimes()

  let merged = {}
  let mergedMeta = {}
  let hasChanges = false

  if (remoteData) {
    // 2. read-merge-write
    // tombstone 语义：
    //  - 记录删除 vs 修改 → mergeArrayById/mergeProducts 内"修改晚于删除则保留"
    //  - 敏感词删除 vs 重新添加 → wordTimes（本端）+ lastSync 区分新旧 tombstone
    let lastSync = 0
    try { const t = new Date(localStorage.getItem(LAST_SYNC_KEY)); if (!isNaN(t.getTime())) lastSync = t.getTime() } catch (e) {}
    mergedMeta = mergeMetaRaw(localMeta, remoteMeta)
    for (const key of SYNC_KEYS) {
      merged[key] = mergeModule(key, localData[key], remoteData[key], mergedMeta, wordTimes, lastSync)
    }
    mergedMeta = cleanupTombstones(mergedMeta, merged)
    // 敏感词 tombstone 清理：合并结果里存在该词（重新添加）→ tombstone 失效
    const words = merged['blogger_workbench_data_v1']?.sensitiveWords
    if (Array.isArray(words)) {
      const mainTomb = mergedMeta['blogger_workbench_data_v1']
      if (mainTomb) {
        for (const w of words) { if (mainTomb[w]) delete mainTomb[w] }
        if (!Object.keys(mainTomb).length) delete mergedMeta['blogger_workbench_data_v1']
      }
      // wordTimes 只保留合并结果中仍存在的词（被删除传播的词清掉记录）
      const kept = new Set(words)
      let wtChanged = false
      for (const w of Object.keys(wordTimes)) {
        if (!kept.has(w)) { delete wordTimes[w]; wtChanged = true }
      }
      if (wtChanged) {
        try { localStorage.setItem(WORD_TIME_KEY, JSON.stringify(wordTimes)) } catch (e) {}
      }
    }
    hasChanges = JSON.stringify(merged) !== JSON.stringify(localData) ||
                 JSON.stringify(mergedMeta) !== JSON.stringify(localMeta)
  } else {
    // 云端不存在：直接推送本地（首次同步）
    merged = localData
    mergedMeta = localMeta
    hasChanges = true
  }

  // 3. 写本地（主数据由 store 的 applySyncResult 负责，这里只写其他键 + meta）
  writeLocalOthers(merged, mergedMeta)
  // 4. 推送云端
  const payload = { data: merged, meta: mergedMeta, syncedAt: new Date().toISOString() }
  const savedId = await saveGist(token, resolvedGistId, payload)
  if (savedId) {
    localStorage.setItem(GIST_ID_KEY, savedId)
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
  }

  return { merged, meta: mergedMeta, gistId: savedId, hasChanges }
}

// 写非主数据键（主数据由 store state 管理）
function writeLocalOthers(merged, mergedMeta) {
  for (const key of SYNC_KEYS) {
    if (key === 'blogger_workbench_data_v1') continue
    if (merged[key] !== undefined) {
      try { localStorage.setItem(key, JSON.stringify(merged[key])) } catch (e) {}
    }
  }
  if (mergedMeta) {
    try { localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(mergedMeta)) } catch (e) {}
  }
}
