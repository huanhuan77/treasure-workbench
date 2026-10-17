// 追剧状态（全局统一）：key 与 store.jsx 的 dramas[].status 对应
export const DRAMA_STATUS = [
  { key: 'want', label: '想看', c: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  { key: 'watching', label: '在看', c: '#db2777', bg: 'rgba(219,39,119,0.10)' },
  { key: 'done', label: '看完', c: '#059669', bg: 'rgba(5,150,105,0.10)' },
  { key: 'dropped', label: '放弃', c: '#94a3b8', bg: 'rgba(148,163,184,0.16)' },
]

function norm(s) {
  return (s || '').replace(/[《》\s]/g, '').toLowerCase()
}

// ── 联网查询（Wikidata，支持浏览器跨域 origin=*） ──
// 内置剧名库已下线，年份 / 主演统一联网补全。失败或查不到返回 null。
const WD = 'https://www.wikidata.org/w/api.php'
const TV_HINT = /电视剧|连续剧|网剧|剧集|情景剧/

async function wdJson(url, timeout = 8000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function lookupDramaOnline(rawName) {
  const q = (rawName || '').trim()
  if (!q) return null
  // 1) 搜索实体
  const sData = await wdJson(
    `${WD}?action=wbsearchentities&search=${encodeURIComponent(q)}&language=zh&format=json&origin=*&limit=6`
  )
  const list = (sData && sData.search) || []
  if (!list.length) return null
  // 优先取「电视剧」类且名称接近的；否则取第一个
  const ent =
    list.find((x) => TV_HINT.test(x.description || '') && norm(x.label || '') === norm(q)) ||
    list.find((x) => TV_HINT.test(x.description || '')) ||
    list.find((x) => norm(x.label || '') === norm(q)) ||
    list[0]
  if (!ent || !ent.id) return null
  // 2) 读取结构化字段：P577=首播时间，P161=主演
  const eData = await wdJson(
    `${WD}?action=wbgetentities&ids=${ent.id}&props=claims&format=json&origin=*`
  )
  const claims = (eData && eData.entities && eData.entities[ent.id] && eData.entities[ent.id].claims) || {}
  let year = ''
  const p577 = claims.P577
  if (p577 && p577[0]) {
    const t = p577[0].mainsnak && p577[0].mainsnak.datavalue && p577[0].mainsnak.datavalue.value
    if (t && t.time) {
      const m = /^\+?(\d{4})/.exec(t.time)
      if (m) year = m[1]
    }
  }
  let cast = ''
  const p161 = claims.P161
  if (p161 && p161.length) {
    const ids = p161
      .slice(0, 10)
      .map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id)
      .filter(Boolean)
    if (ids.length) {
      const lData = await wdJson(
        `${WD}?action=wbgetentities&ids=${ids.join('|')}&props=labels&languages=zh&format=json&origin=*`
      )
      const ents = (lData && lData.entities) || {}
      const names = ids
        .map((id) => (ents[id] && ents[id].labels && (ents[id].labels.zh || ents[id].labels.en || {}).value))
        .filter(Boolean)
      cast = names.join(' / ')
    }
  }
  if (!year && !cast) return null
  return { name: q, year, cast }
}
