// 样品状态枚举与状态工具集
//
// 数据模型（两轴版，2026-09 重构）：
//   样品 = 一个实体，可归属多个账号。
//   - logistics（物流，样品级共享）：un_arrived 未到货 / arrived 已到货
//   - isShot（拍摄，样品级共享 bool）：视频拍一次就够，跟账号无关
//   - archived（归档/放弃，样品级 bool）：不做了，不占状态链
//   - countsByAccount（按账号独立统计）：{ 账号: { publishCount, orderCount, lastPublishAt } }
//     「发布」只看数字：某账号 publishCount>0 即该账号已发，无需独立"已发布"开关。
//   - status（代表态，由上两轴推导，兼容老 key）：un_arrived 未到货 / arrived 待拍 /
//     shot 已拍未发 / published 已发布 / abandoned 已放弃(归档)
//   - execByAccount 保留为兼容字段（老数据/自动放弃机制仍写入），但 UI 不再编辑/展示。

// 物流状态（共享）
export const LOGISTICS_STATUS = {
  un_arrived: { key: 'un_arrived', label: '未到货', icon: '🚚', color: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },
  arrived: { key: 'arrived', label: '待拍', icon: '📦', color: '#f97316', bg: 'rgba(249,115,22,0.16)' },
}

// 执行状态（保留兼容：老数据迁移与自动放弃机制仍用 key，UI 不再按账号编辑）
export const EXEC_STATUS = {
  shot: { key: 'shot', label: '已拍未发', icon: '🎬', color: '#06b6d4', bg: 'rgba(6,182,212,0.16)' },
  published: { key: 'published', label: '已发布', icon: '✅', color: '#16a34a', bg: 'rgba(22,163,74,0.16)' },
  abandoned: { key: 'abandoned', label: '已放弃', icon: '🚫', color: '#9ca3af', bg: 'rgba(156,163,175,0.16)' },
}

// 全部 5 态（兼容老代码按 key 取色/取文案）
export const SAMPLE_STATUS = {
  ...LOGISTICS_STATUS,
  ...EXEC_STATUS,
}
// 展示顺序：物流在前，执行在后
export const SAMPLE_STATUS_ORDER = [
  'un_arrived',
  'arrived',
  'shot',
  'published',
  'abandoned',
]
export const SAMPLE_STATUS_LIST = SAMPLE_STATUS_ORDER.map((k) => ({ key: k, ...SAMPLE_STATUS[k] }))

export function statusLabel(status) {
  return SAMPLE_STATUS[status]?.label || status || '未到货'
}
export function statusColor(status) {
  return SAMPLE_STATUS[status]?.color || '#94a3b8'
}
export function statusBg(status) {
  return SAMPLE_STATUS[status]?.bg || 'rgba(148,163,184,0.16)'
}

// ── 兼容旧数据：老样品只有 account（字符串），新样品有 accounts（数组）──
export function getAccounts(s) {
  if (Array.isArray(s?.accounts) && s.accounts.length) return s.accounts
  return s?.account ? [s.account] : []
}

// 物流状态（实体级共享）：未到货 / 已到货未拍摄
export function getLogistics(s) {
  if (s && (s.logistics === 'un_arrived' || s.logistics === 'arrived')) return s.logistics
  const st = s?.status
  if (st === 'un_arrived') return 'un_arrived'
  if (st === 'arrived') return 'arrived'
  // 已到货（拍摄/发布/放弃 都已到货）
  return 'arrived'
}

// 全部账号的执行状态 map：{ 账号: shot|published|abandoned|null }
// null 表示仍处于物流阶段（未到货或已到货还没拍）
export function getExecByAccount(s) {
  const accounts = getAccounts(s)
  const raw = (s && s.execByAccount && typeof s.execByAccount === 'object') ? s.execByAccount : null
  const out = {}
  for (const a of accounts) {
    if (raw && raw[a] && EXEC_STATUS[raw[a]]) out[a] = raw[a]
    else {
      // 兼容：老单账号样品把执行状态存在顶层 status 上
      const st = s?.status
      if (EXEC_STATUS[st] && a === (s?.account || accounts[0])) out[a] = st
      else out[a] = null
    }
  }
  return out
}

// 单个账号的执行状态（null/undefined = 仍在物流阶段）
export function getExecStatus(s, account) {
  const m = getExecByAccount(s)
  const v = m[account]
  return v && EXEC_STATUS[v] ? v : null
}

// 单个账号的统计：发布条数 / 出单数 / 最近发布
export function getCounts(s, account) {
  if (s && s.countsByAccount && s.countsByAccount[account]) {
    const c = s.countsByAccount[account]
    return {
      publishCount: Number(c.publishCount) || 0,
      orderCount: Number(c.orderCount) || 0,
      lastPublishAt: c.lastPublishAt || '',
    }
  }
  // 兼容：老单账号样品把统计存在顶层
  return {
    publishCount: Number(s?.publishCount) || 0,
    orderCount: Number(s?.orderCount) || 0,
    lastPublishAt: s?.lastPublishAt || '',
  }
}

// ── 两轴核心判定（兼容老数据：无显式字段时从 execByAccount / 顶层 status / 统计推导）──

// 是否归档（放弃）：显式 archived 优先；老数据=全部账号都 abandoned 或老顶层 status 为 abandoned
export function isArchivedSample(s) {
  if (!s || typeof s !== 'object') return false
  if (typeof s.archived === 'boolean') return s.archived
  const exec = (s.execByAccount && typeof s.execByAccount === 'object') ? s.execByAccount : {}
  const vals = Object.values(exec).filter(Boolean)
  if (vals.length && vals.every((v) => v === 'abandoned')) return true
  return s.status === 'abandoned'
}

// 是否已拍摄（样品级共享）：显式 isShot 优先；老数据=任一账号 shot/published、
// 或老顶层 status 为 shot/published、或已有任何发布记录
export function isShotSample(s) {
  if (!s || typeof s !== 'object') return false
  if (typeof s.isShot === 'boolean') return s.isShot
  const exec = (s.execByAccount && typeof s.execByAccount === 'object') ? s.execByAccount : {}
  const vals = Object.values(exec).filter(Boolean)
  if (vals.some((v) => v === 'shot' || v === 'published')) return true
  const st = s.status
  if (st === 'shot' || st === 'published') return true
  if ((Number(s.publishCount) || 0) > 0) return true
  const cb = s.countsByAccount
  if (cb && Object.values(cb).some((c) => (Number(c?.publishCount) || 0) > 0)) return true
  return false
}

// 是否已发布过（任一账号发布条数 > 0）
export function hasPublished(s) {
  if (!s || typeof s !== 'object') return false
  if ((Number(s.publishCount) || 0) > 0) return true
  const cb = s.countsByAccount
  return !!(cb && Object.values(cb).some((c) => (Number(c?.publishCount) || 0) > 0))
}

// 顶层 status 代表值（两轴推导，供筛选/提醒/标签使用）
// 规则只有一条链：已放弃(归档) > 未到货 > 待拍(未拍) > 已拍未发 > 已发布
export function getTopStatus(s) {
  if (isArchivedSample(s)) return 'abandoned'
  if (getLogistics(s) === 'un_arrived') return 'un_arrived'
  if (!isShotSample(s)) return 'arrived'
  return hasPublished(s) ? 'published' : 'shot'
}

// 顶层聚合：publishCount 合计 / orderCount 合计 / lastPublishAt 最新
export function getAggregateCounts(s) {
  const exec = getExecByAccount(s)
  let pub = 0, ord = 0
  let latest = ''
  for (const a of Object.keys(exec)) {
    const c = getCounts(s, a)
    pub += c.publishCount
    ord += c.orderCount
    if (c.lastPublishAt && c.lastPublishAt > latest) latest = c.lastPublishAt
  }
  return { publishCount: pub, orderCount: ord, lastPublishAt: latest }
}

// 重新计算样品顶层 status（在修改 execByAccount / logistics 后调用）
export function recomputeTopStatus(s) {
  return getTopStatus(s)
}

// 不可变地设置某账号的执行状态，并同步顶层 status
export function setExecStatus(s, account, execKey) {
  if (!EXEC_STATUS[execKey] || !s || typeof s !== 'object') return s
  const accounts = [...getAccounts(s)]          // 克隆，避免污染原数组
  const execByAccount = { ...(s.execByAccount || {}) }
  const countsByAccount = { ...(s.countsByAccount || {}) }
  const c = countsByAccount[account]
  if (!c) {
    // 新账号：补一个 0 起点计数条目（不覆盖已有同名账号）
    countsByAccount[account] = { publishCount: 0, orderCount: 0, lastPublishAt: '' }
  }
  if (!accounts.includes(account)) accounts.push(account)
  execByAccount[account] = execKey
  const next = {
    ...s,
    account: accounts[0] || '',
    accounts,
    execByAccount,
    countsByAccount,
    status: recomputeTopStatus({ ...s, accounts, execByAccount }),
  }
  // 从放弃改回其它状态 → 视为该账号已人工处理，之后不再被自动放弃改回
  if (s.autoAbandonedByAccount && s.autoAbandonedByAccount[account] && execKey !== 'abandoned') {
    const dismiss = { ...(s.abandonDismissedByAccount || {}) }
    dismiss[account] = true
    next.abandonDismissedByAccount = dismiss
  }
  return next
}

// 不可变地设置物流状态
export function setLogistics(s, key) {
  if (!LOGISTICS_STATUS[key]) return s
  return { ...s, logistics: key, status: recomputeTopStatus({ ...s, logistics: key }) }
}

// 设置拍摄状态（样品级共享）：拍过就是拍过，跟账号无关
export function setShot(s, bool) {
  if (!s || typeof s !== 'object') return s
  const next = { ...s, isShot: !!bool }
  // 同步兼容字段：execByAccount 各账号非 published 的 shot 与 isShot 对齐（published 不动，发布过必然拍过）
  const execByAccount = { ...(s.execByAccount || {}) }
  for (const a of Object.keys(execByAccount)) {
    if (execByAccount[a] === 'shot' && !bool) execByAccount[a] = null
    if (!execByAccount[a] && bool) execByAccount[a] = 'shot'
  }
  next.execByAccount = execByAccount
  next.status = recomputeTopStatus(next)
  return next
}

// 设置归档（放弃）：不占状态链，随时可恢复
export function setArchived(s, bool) {
  if (!s || typeof s !== 'object') return s
  const next = { ...s, archived: !!bool }
  next.status = recomputeTopStatus(next)
  return next
}

// 把样品规整为新的完整结构（合并迁移 / 新建 / 安全兜底都用它）
export function normalizeSample(s) {
  if (!s || typeof s !== 'object') return s
  const accounts = getAccounts(s)
  const logistics = getLogistics(s)
  const execByAccount = { ...getExecByAccount(s) }
  const countsByAccount = {}
  for (const a of accounts) {
    if (s.countsByAccount && s.countsByAccount[a]) {
      const c = s.countsByAccount[a]
      countsByAccount[a] = {
        publishCount: Number(c.publishCount) || 0,
        orderCount: Number(c.orderCount) || 0,
        lastPublishAt: c.lastPublishAt || '',
      }
    } else {
      // 兼容：老单账号样品从顶层取
      countsByAccount[a] = {
        publishCount: Number(s.publishCount) || 0,
        orderCount: Number(s.orderCount) || 0,
        lastPublishAt: s.lastPublishAt || '',
      }
    }
  }
  const agg = getAggregateCounts({ ...s, accounts, execByAccount, countsByAccount })
  const shot = isShotSample({ ...s, accounts, execByAccount, countsByAccount, publishCount: agg.publishCount })
  const archived = isArchivedSample(s)
  return {
    ...s,
    account: accounts[0] || '',
    accounts,
    category: s.category || '',   // 分类（与产品分类同口径，选填）
    logistics,
    isShot: shot,                 // 拍摄（样品级共享）
    archived,                     // 归档/放弃（样品级）
    execByAccount,
    countsByAccount,
    publishCount: agg.publishCount,
    orderCount: agg.orderCount,
    lastPublishAt: agg.lastPublishAt,
    status: recomputeTopStatus({ accounts, logistics, execByAccount, isShot: shot, archived, publishCount: agg.publishCount, countsByAccount }),
    isArrived: logistics === 'arrived',
  }
}

// 样品是否匹配某个筛选 key（用于 SamplesPage 状态分组卡）
// 口径：以「互斥代表态」getTopStatus 归类 —— 每个样品只属于一个状态分组，
// 保证 5 张卡之和 = 样品总数、且「卡片数字 = 点它后列表条数」。
// 代表态判定：未到货 > (执行态: 已发布 > 已拍摄 > 放弃) > 到货未拍。
export function sampleMatchesFilter(s, filterKey) {
  if (!filterKey || filterKey === 'all') return true
  return getTopStatus(s) === filterKey
}

// 返回样品各账号中被「系统自动放弃」且用户未手动解除的账号列表（按账号粒度）
export function getAutoAbandonedAccounts(s) {
  if (!s || !s.autoAbandoned) return []
  const exec = s.execByAccount || {}
  const auto = s.autoAbandonedByAccount || {}
  const dismiss = s.abandonDismissedByAccount || {}
  return getAccounts(s).filter((a) => exec[a] === 'abandoned' && auto[a] && !dismiss[a])
}

// 统计各状态下样品数量。口径与 sampleMatchesFilter 一致：以互斥代表态 getTopStatus 归类，
// 每个样品只 +1，保证 5 张卡之和 = 过滤后样品总数（不再因多账号不同状态而重复计数）。
export function computeStatusStats(samples, accountFilter) {
  const stats = {}
  for (const k of SAMPLE_STATUS_ORDER) stats[k] = 0
  const list = accountFilter && accountFilter !== 'all'
    ? (samples || []).filter((s) => getAccounts(s).includes(accountFilter))
    : (samples || [])
  for (const s of list) {
    const p = getTopStatus(s)
    if (stats[p] != null) stats[p]++
  }
  return stats
}
