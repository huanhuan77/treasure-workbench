import { useMemo, useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
// 检测逻辑直接复用手机版的实现（已 export），不复制一份，避免两套判定漂移
import { scanText } from '../../pages/SensitiveCenterPage'
import { ResetButton } from '../components/ResetButton'

// 严重度配色：与手机版同口径（1 必改 / 2 建议改 / 3 注意）
const LEVEL = {
  1: { label: '必改', bg: '#fbeaea', fg: '#a9504b' },
  2: { label: '建议改', bg: '#faf1e3', fg: '#a97c46' },
  3: { label: '注意', bg: '#eef4ef', fg: '#5f8a74' },
}

// PC 版违禁词中心：词库 + 检测两个 Tab。
// 数据与判定全部复用 store 的 sensitiveWords / addSensitiveWord / deleteSensitiveWord
// 与手机版的 scanText，PC 侧只重写呈现。
export function PcSensitive() {
  const { sensitiveWords, addSensitiveWord, deleteSensitiveWord } = useStore()
  const { show } = useToast()
  const [tab, setTab] = useState('lib')
  const [input, setInput] = useState('')
  const [delWord, setDelWord] = useState(null)
  const [checkInput, setCheckInput] = useState('')
  const [result, setResult] = useState(null)
  const [keyword, setKeyword] = useState('')

  const shownWords = useMemo(() => {
    const kw = keyword.trim()
    return kw ? sensitiveWords.filter((w) => w.includes(kw)) : sensitiveWords
  }, [sensitiveWords, keyword])

  const addWord = () => {
    const w = input.trim()
    if (!w) { show('请输入卡审词', 'error'); return }
    if (sensitiveWords.includes(w)) { show('该卡审词已存在', 'error'); return }
    addSensitiveWord(w)
    setInput('')
    show('已添加卡审词', 'success')
  }

  const doDelete = () => {
    deleteSensitiveWord(delWord)
    setDelWord(null)
    show('已删除卡审词', 'success')
  }

  const check = () => {
    const text = checkInput.trim()
    if (!text) { show('请输入待检测文案', 'error'); return }
    const res = scanText(text, sensitiveWords)
    if (res.found.length === 0) show('未检测到违禁词', 'success')
    else show(`发现 ${res.found.length} 个潜在违禁词`, 'info')
    setResult(res)
  }

  return (
    <>
      <div className="pcv-bar">
        <div>
          <div className="pcv-title">违禁词</div>
          <div className="pcv-sub">词库管理 + 文案检测 · 共 {sensitiveWords.length} 个卡审词</div>
        </div>
        <div className="pcv-spacer" />
        <div className="pcv-seg">
          <button className={tab === 'lib' ? 'on' : ''} onClick={() => setTab('lib')}><span>词库</span></button>
          <button className={tab === 'check' ? 'on' : ''} onClick={() => setTab('check')}><span>违禁词检测</span></button>
        </div>
      </div>

      <div className="pcv-body">
        {tab === 'lib' ? (
          <>
            <div className="pcv-card" style={{ marginBottom: 14 }}>
              <div className="pcv-card-b" style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
                平台会审核贬低、歧视、违规类词汇，命中后可能被扣分 / 罚没佣金 / 封号。
                下面词库在生成话题和文案时会自动检测并替换。
              </div>
            </div>

            {/* 添加框、搜索框排在一起（原来用 spacer 把搜索框顶到最右，和添加区一左一右割裂） */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="pcv-input"
                style={{ width: 280 }}
                placeholder="输入要添加的卡审词，如：黑奴"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addWord() }}
              />
              <button className="pcv-btn" onClick={addWord}>添加</button>
              <span style={{ width: 1, height: 18, background: 'rgba(15,23,42,0.10)', margin: '0 6px' }} />
              <input
                className="pcv-input"
                style={{ width: 200 }}
                placeholder="搜索词库"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
              <ResetButton active={keyword !== ''} onClick={() => setKeyword('')} inline />
            </div>

            {sensitiveWords.length === 0 ? (
              <div className="pcv-card"><div className="pcv-empty">词库为空，添加你的第一个卡审词</div></div>
            ) : shownWords.length === 0 ? (
              <div className="pcv-card"><div className="pcv-empty">没有匹配「{keyword}」的词</div></div>
            ) : (
              <div className="pcv-card">
                <div className="pcv-card-b" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {shownWords.map((w) => (
                    <span key={w} className="pcv-chip" style={{ background: '#f5f6f8', color: '#4b5563', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 8px 5px 12px', fontSize: 13 }}>
                      {w}
                      <button className="pcv-x" title="删除该词" onClick={() => setDelWord(w)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="pcv-card" style={{ marginBottom: 14 }}>
              <div className="pcv-card-b">
                <div className="pcv-field-label">待检测文案</div>
                <textarea
                  className="pcv-input"
                  style={{ width: '100%', minHeight: 180, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }}
                  placeholder="粘贴要发布的文案，检测是否命中卡审词..."
                  value={checkInput}
                  onChange={(e) => setCheckInput(e.target.value)}
                />
                <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                  <button className="pcv-btn" onClick={check}>开始检测</button>
                  <button className="pcv-btn pcv-btn-ghost" onClick={() => { setCheckInput(''); setResult(null) }}>清空</button>
                </div>
              </div>
            </div>

            {result && (
              result.found.length === 0 ? (
                <div className="pcv-card"><div className="pcv-empty">没检测到违禁词 ✓</div></div>
              ) : (
                <div className="pcv-card">
                  <div className="pcv-card-h">
                    <span>命中 {result.stats.total} 个</span>
                    <div className="pcv-spacer" />
                    {[1, 2, 3].map((lv) => result.stats.byLevel[lv] > 0 && (
                      <span key={lv} className="pcv-chip" style={{ background: LEVEL[lv].bg, color: LEVEL[lv].fg }}>
                        {LEVEL[lv].label} {result.stats.byLevel[lv]}
                      </span>
                    ))}
                  </div>
                  <table className="pcv-table">
                    <thead>
                      <tr>
                        <th style={{ width: 140 }}>命中词</th>
                        <th style={{ width: 110 }}>严重度</th>
                        <th style={{ width: 110 }}>分类</th>
                        <th>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.found.map((f, i) => (
                        <tr key={`${f.w}-${i}`}>
                          <td className="pcv-name">{f.w}</td>
                          <td>
                            <span className="pcv-chip" style={{ background: LEVEL[f.level]?.bg || '#f3f4f6', color: LEVEL[f.level]?.fg || '#6b7280' }}>
                              {LEVEL[f.level]?.label || f.level}
                            </span>
                          </td>
                          <td style={{ color: '#4b5563' }}>{f.cat || '—'}</td>
                          <td style={{ color: '#6b7280' }}>{f.hint || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </>
        )}
      </div>

      <ConfirmModal
        open={!!delWord}
        onClose={() => setDelWord(null)}
        onConfirm={doDelete}
        title="删除卡审词"
        message={delWord ? `确定从词库删除「${delWord}」？` : ''}
        confirmText="删除"
      />
    </>
  )
}
