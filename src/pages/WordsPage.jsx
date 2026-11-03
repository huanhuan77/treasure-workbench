import { useState, useEffect, useMemo } from 'react'

const WORDS = [
  { w: "abundant", ph: "/əˈbʌndənt/", pos: "adj.", m: "丰富的，充裕的",
    ex: "The region has abundant natural resources.", cn: "该地区自然资源丰富。",
    tip: "abound（充满）+ ant → 充满的 → 丰富的。" },
  { w: "accelerate", ph: "/əkˈseləreɪt/", pos: "v.", m: "加速，促进",
    ex: "The car accelerated to overtake the truck.", cn: "汽车加速超过卡车。",
    tip: "ac（加强）+ celer（快）+ ate → 加快。反义 decelerate 减速。" },
  { w: "compromise", ph: "/ˈkɒmprəmaɪz/", pos: "v./n.", m: "妥协，折中；危及",
    ex: "We had to compromise on the price.", cn: "我们不得不在价格上妥协。",
    tip: "com（共同）+ promise（承诺）→ 各让一步 → 妥协。" },
  { w: "dilemma", ph: "/dɪˈlemə/", pos: "n.", m: "进退两难的困境",
    ex: "She faced the dilemma of choosing between career and family.", cn: "她面临事业与家庭的两难。",
    tip: "di（两个）+ lemma（假设）→ 两个假设都不好 → 两难。" },
  { w: "eliminate", ph: "/ɪˈlɪmɪneɪt/", pos: "v.", m: "消除，排除；淘汰",
    ex: "The team was eliminated in the first round.", cn: "该队在第一轮被淘汰。",
    tip: "e（出）+ limin（门槛）+ ate → 扫地出门 → 消除。" },
  { w: "genuine", ph: "/ˈdʒenjuɪn/", pos: "adj.", m: "真的；真诚的",
    ex: "Her smile looked genuine.", cn: "她的微笑看起来很真诚。",
    tip: "词根 gen（出生/基因）→ 原生的 → 真的。反义 artificial。" },
  { w: "hierarchy", ph: "/ˈhaɪərɑːki/", pos: "n.", m: "等级制度，层级",
    ex: "There is a strict hierarchy in the company.", cn: "公司里有严格的等级制度。",
    tip: "hier（神圣）+ archy（统治）→ 神圣的统治秩序 → 等级。" },
  { w: "inevitable", ph: "/ɪnˈevɪtəbl/", pos: "adj.", m: "不可避免的",
    ex: "Change is inevitable in life.", cn: "生活中变化是不可避免的。",
    tip: "in（不）+ evit（避免）+ able → 不能避免的。" },
  { w: "perspective", ph: "/pəˈspektɪv/", pos: "n.", m: "视角，观点；透视法",
    ex: "Try to see it from a different perspective.", cn: "试着从不同角度看这件事。",
    tip: "per（贯穿）+ spect（看）+ ive → 看透 → 视角。" },
  { w: "substantial", ph: "/səbˈstænʃl/", pos: "adj.", m: "大量的；结实的；实质的",
    ex: "The building is a substantial structure.", cn: "这座建筑结构坚固。",
    tip: "sub（下面）+ stan（站）+ tial → 站得住的 → 结实的。" },
  { w: "ambiguous", ph: "/æmˈbɪɡjuəs/", pos: "adj.", m: "模棱两可的，含糊的",
    ex: "His ambiguous reply made her unsure what to do.", cn: "他模棱两可的回复让她拿不定主意。",
    tip: "ambi（两个）+ gu（驱动）+ ous → 两种走向都可解释 → 含糊。" },
  { w: "cautious", ph: "/ˈkɔːʃəs/", pos: "adj.", m: "小心的，谨慎的",
    ex: "Be cautious when crossing the busy street.", cn: "过这条繁忙马路时要小心。",
    tip: "caut（小心，同 caution）+ ious → 处处留神。别和 curious（好奇）混。" },
  { w: "dedicate", ph: "/ˈdedɪkeɪt/", pos: "v.", m: "致力于，献身；献给",
    ex: "She dedicated her life to helping the poor.", cn: "她毕生致力于帮助穷人。",
    tip: "de（加强）+ dic（宣告）+ ate → 公开宣告投入 → 奉献。" },
  { w: "evident", ph: "/ˈevɪdənt/", pos: "adj.", m: "明显的，明白的",
    ex: "It was evident that she had been crying.", cn: "很明显她刚哭过。",
    tip: "e（出）+ vid（看）+ ent → 一眼看出 → 明显。名词 evidence。" },
  { w: "fragile", ph: "/ˈfrædʒaɪl/", pos: "adj.", m: "易碎的；脆弱的",
    ex: "The fragile packages must be handled with care.", cn: "这些易碎包裹必须轻拿轻放。",
    tip: "frag（打碎，同 fraction）+ ile（易…的）→ 容易碎的。" },
  { w: "hesitate", ph: "/ˈhezɪteɪt/", pos: "v.", m: "犹豫，踌躇",
    ex: "Don't hesitate to call me if you need help.", cn: "需要帮忙就尽管打电话，别犹豫。",
    tip: "haes（粘，同 adhesive）+ itate → 脚粘住迈不开 → 犹豫。" },
  { w: "immense", ph: "/ɪˈmens/", pos: "adj.", m: "巨大的，广大的",
    ex: "The project requires an immense amount of time.", cn: "这个项目需要极其多的时间。",
    tip: "im（不）+ mens（测量，同 measure）→ 大到没法测量。" },
  { w: "justify", ph: "/ˈdʒʌstɪfaɪ/", pos: "v.", m: "证明…正当；为…辩护",
    ex: "Nothing can justify such rudeness.", cn: "无论什么理由都不能为这种粗鲁开脱。",
    tip: "just（正当）+ ify（使…）→ 使显得正当。名词 justification。" },
  { w: "prominent", ph: "/ˈprɒmɪnənt/", pos: "adj.", m: "突出的，杰出的；显著的",
    ex: "She is a prominent scientist in her field.", cn: "她是所在领域杰出的科学家。",
    tip: "pro（向前）+ min（突出）+ ent → 向前伸出来 → 显眼。" },
  { w: "vanish", ph: "/ˈvænɪʃ/", pos: "v.", m: "突然消失，绝迹",
    ex: "The magician made the rabbit vanish.", cn: "魔术师让兔子消失了。",
    tip: "van（空，同 empty、vain）+ ish → 变得空空如也 → 消失。" },
]

const STORE_KEY = 'cet_words_done_v1'
const TYPES = ['cn2en', 'en2cn', 'cloze', 'listen']

function pickN(arr, n) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, Math.min(n, a.length))
}

function speak(text) {
  if (!('speechSynthesis' in window)) { alert('当前浏览器不支持语音朗读'); return }
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'; u.rate = 0.9
  window.speechSynthesis.speak(u)
}

const spkSvg = (size = 18) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M3 9v6h4l5 5V4L7 9H3z" />
    <path d="M16 8a5 5 0 0 1 0 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)
const checkSvg = (size = 16) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const cardStyle = {
  background: '#fff', border: '1px solid #fce7f3', borderRadius: 14,
  padding: '16px 16px 14px', marginBottom: 12, boxShadow: '0 1px 2px rgba(244,114,182,0.06)',
}
const btnBase = {
  appearance: 'none', border: '1px solid #fbcfe8', background: '#fff',
  color: 'var(--text-main)', padding: '7px 14px', borderRadius: 999,
  fontSize: 13, cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
}

export function WordsPage() {
  const [doneArr, setDoneArr] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]') } catch { return [] }
  })
  const doneSet = useMemo(() => new Set(doneArr), [doneArr])
  const [order, setOrder] = useState(() => [...WORDS])
  const [onlyUndone, setOnlyUndone] = useState(false)
  const [quiz, setQuiz] = useState(null)

  const save = (arr) => {
    setDoneArr(arr)
    localStorage.setItem(STORE_KEY, JSON.stringify(arr))
  }
  const toggleDone = (w) => {
    const next = doneSet.has(w) ? doneArr.filter(x => x !== w) : [...doneArr, w]
    save(next)
  }

  const visible = onlyUndone ? order.filter(it => !doneSet.has(it.w)) : order
  const pct = Math.round(doneSet.size / WORDS.length * 100)

  const startQuiz = () => {
    const words = pickN([...WORDS], 20)
    const questions = words.map(w => ({
      target: w,
      type: TYPES[Math.floor(Math.random() * TYPES.length)],
      others: pickN(WORDS.filter(x => x.w !== w.w), 3),
    }))
    setQuiz({ questions, index: 0, score: 0, wrong: [], answers: new Array(questions.length).fill(null), done: false })
  }
  const quitQuiz = () => setQuiz(null)

  useEffect(() => {
    if (!quiz || quiz.done) return
    const q = quiz.questions[quiz.index]
    if (q && q.type === 'listen' && quiz.answers[quiz.index] === null) {
      const t = setTimeout(() => speak(q.target.w), 350)
      return () => clearTimeout(t)
    }
  }, [quiz])

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(20px + var(--safe-top)) 4px 100px' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>四六级单词卡片</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: 12, marginTop: 4 }}>
          点喇叭发音 · 学过打勾 · 20 题随机测验
        </p>
      </div>

      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        margin: '14px 0 16px', opacity: quiz ? 0.4 : 1, pointerEvents: quiz ? 'none' : 'auto',
        transition: 'opacity .2s',
      }}>
        <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={() => {
            window.speechSynthesis?.cancel()
            order.forEach(it => {
              const u = new SpeechSynthesisUtterance(it.w)
              u.lang = 'en-US'; u.rate = 0.85
              window.speechSynthesis.speak(u)
            })
          }}>顺序朗读</button>
        <button style={btnBase} onClick={() => setOrder(pickN([...WORDS], WORDS.length))}>打乱顺序</button>
        <button style={{ ...btnBase, ...(onlyUndone ? { background: 'var(--primary-light)', borderColor: 'var(--primary)', color: 'var(--primary-dark)' } : {}) }}
          onClick={() => setOnlyUndone(v => !v)}>{onlyUndone ? '显示全部' : '只看未学'}</button>
        <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={startQuiz}>开始测试</button>
        {quiz && !quiz.done && (
          <button style={{ ...btnBase, borderColor: 'var(--danger)', color: 'var(--danger)' }}
            onClick={quitQuiz}>退出测试</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-sub)' }}>共 {visible.length} 词</span>
      </div>

      <div style={{ height: 6, background: '#fce7f3', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', background: 'var(--primary)', width: pct + '%', transition: 'width .3s' }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 14 }}>
        已学 {doneSet.size} / {WORDS.length} 个 · {pct}%
      </div>

      {!quiz ? (
        <div>
          {visible.map(it => {
            const isDone = doneSet.has(it.w)
            return (
              <div key={it.w} style={{ ...cardStyle, ...(isDone ? { opacity: 0.55 } : {}) }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => toggleDone(it.w)} title="标记已学"
                    style={{
                      width: 24, height: 24, border: '2px solid #fbcfe8', borderRadius: 6,
                      cursor: 'pointer', background: isDone ? 'var(--primary)' : '#fff',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', flexShrink: 0, marginTop: 2, padding: 0,
                    }}>
                    <span style={{ opacity: isDone ? 1 : 0 }}>{checkSvg()}</span>
                  </button>
                  <span style={{
                    fontSize: 22, fontWeight: 700,
                    textDecoration: isDone ? 'line-through' : 'none',
                    textDecorationColor: 'var(--primary)',
                  }}>{it.w}</span>
                  <button onClick={() => speak(it.w)} title="朗读单词"
                    style={{
                      width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
                      background: 'var(--primary-light)', color: 'var(--primary-dark)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                    }}>{spkSvg(16)}</button>
                  <span style={{ color: 'var(--text-sub)', fontSize: 14, fontFamily: 'Georgia, serif' }}>{it.ph}</span>
                  <span style={{
                    display: 'inline-block', fontSize: 11, color: 'var(--primary-dark)',
                    background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 6, marginTop: 3,
                  }}>{it.pos}</span>
                </div>
                <div style={{ fontSize: 15, marginTop: 6 }}>{it.m}</div>
                <div style={{
                  marginTop: 10, padding: '10px 12px', background: '#fdfafb',
                  borderLeft: '3px solid var(--primary)', borderRadius: '0 8px 8px 0', fontSize: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <button onClick={() => speak(it.ex)}
                      style={{
                        width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: '#fce7f3', color: 'var(--primary-dark)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                      }}>{spkSvg(13)}</button>
                    <span>{it.ex}</span>
                  </div>
                  <div style={{ color: 'var(--text-sub)', fontSize: 13, marginTop: 4, marginLeft: 34 }}>{it.cn}</div>
                </div>
                <div style={{
                  marginTop: 10, padding: '8px 12px', background: '#fff7ed',
                  border: '1px dashed #fed7aa', borderRadius: 8, fontSize: 13, color: '#9a3412',
                }}><b>记忆提示：</b>{it.tip}</div>
              </div>
            )
          })}
        </div>
      ) : (
        <QuizView quiz={quiz} setQuiz={setQuiz} quitQuiz={quitQuiz} />
      )}
    </div>
  )
}

function QuizView({ quiz, setQuiz, quitQuiz }) {
  const q = quiz.questions[quiz.index]
  const w = q.target
  const answered = quiz.answers[quiz.index]

  let head = null, opts = [], correctVal = ''
  if (q.type === 'cn2en') {
    head = (
      <>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{w.m}</div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13, margin: '4px 0 14px' }}>{w.pos} {w.ph}</div>
        <Tag>题型：根据中文选英文</Tag>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.w
  } else if (q.type === 'en2cn') {
    head = (
      <>
        <div style={{ fontSize: 19, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{w.w}</div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13, margin: '4px 0 14px' }}>{w.pos} {w.ph}</div>
        <Tag>题型：根据英文选中文释义</Tag>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.m
  } else if (q.type === 'cloze') {
    const blankEx = w.ex.replace(new RegExp('\\b' + w.w + '\\b'), '______')
    head = (
      <>
        <Tag>题型：例句填空</Tag>
        <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.7, marginBottom: 6 }}>{blankEx}</div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13 }}>{w.cn}</div>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.w
  } else {
    head = (
      <>
        <Tag>题型：听发音选词义</Tag>
        <div>
          <button onClick={() => speak(w.w)}
            style={{
              width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'var(--primary)', color: '#fff', display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', margin: '6px 0',
            }}>{spkSvg(28)}</button>
        </div>
        <div style={{ color: 'var(--text-sub)', fontSize: 13 }}>点喇叭重听，选择正确释义</div>
      </>
    )
    opts = pickN([w, ...q.others], 4)
    correctVal = w.m
  }

  const isLast = quiz.index === quiz.questions.length - 1

  const pick = (val) => {
    if (answered) return
    const ok = val === correctVal
    const newAnswers = [...quiz.answers]
    newAnswers[quiz.index] = { picked: val, ok }
    setQuiz({
      ...quiz,
      answers: newAnswers,
      score: quiz.score + (ok ? 1 : 0),
      wrong: ok ? quiz.wrong : (quiz.wrong.find(x => x.w === w.w) ? quiz.wrong : [...quiz.wrong, w]),
    })
  }

  const goPrev = () => { if (quiz.index > 0) setQuiz({ ...quiz, index: quiz.index - 1 }) }
  const goNext = () => {
    if (!answered) return
    if (isLast) setQuiz({ ...quiz, done: true })
    else setQuiz({ ...quiz, index: quiz.index + 1 })
  }

  if (quiz.done) return <ResultView quiz={quiz} setQuiz={setQuiz} quitQuiz={quitQuiz} />

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 10 }}>
        第 {quiz.index + 1} / {quiz.questions.length} 题　·　当前得分 {quiz.score}
      </div>
      <div style={{ ...cardStyle, padding: '20px 16px' }}>
        {head}
        <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
          {opts.map(o => {
            const val = q.type === 'cn2en' || q.type === 'cloze' ? o.w : o.m
            let style = {
              padding: '12px 14px', border: '1.5px solid #fbcfe8', borderRadius: 10,
              background: '#fff', fontSize: 15, cursor: answered ? 'default' : 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
            }
            if (answered) {
              style.cursor = 'default'
              if (val === correctVal) style = { ...style, background: '#d1fae5', borderColor: '#10b981', color: '#065f46' }
              else if (answered.picked === val) style = { ...style, background: '#ffe4e6', borderColor: '#f43f5e', color: '#9f1239' }
              else style = { ...style, opacity: 0.5 }
            }
            return <button key={val} style={style} onClick={() => pick(val)} disabled={!!answered}>{val}</button>
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 14, minHeight: 22, color: answered ? (answered.ok ? '#10b981' : '#f43f5e') : 'transparent' }}>
          {answered ? (answered.ok ? '回答正确' : `正确答案：${w.w}（${w.m}）`) : '·'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
          <button style={{ ...btnBase, minWidth: 100, opacity: quiz.index === 0 ? 0.4 : 1 }}
            onClick={goPrev} disabled={quiz.index === 0}>上一题</button>
          <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)', minWidth: 100, opacity: answered ? 1 : 0.4 }}
            onClick={goNext} disabled={!answered}>{isLast ? '查看结果' : '下一题'}</button>
        </div>
      </div>
    </div>
  )
}

function Tag({ children }) {
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, color: 'var(--primary-dark)',
      background: 'var(--primary-light)', padding: '3px 10px', borderRadius: 6, marginBottom: 10,
    }}>{children}</span>
  )
}

function ResultView({ quiz, setQuiz, quitQuiz }) {
  const total = quiz.questions.length
  const score = quiz.score
  const passLine = Math.ceil(total * 0.8)
  const passed = score >= passLine
  let comment
  if (score === total) comment = '满分！全部掌握了'
  else if (passed) comment = `通过！及格线 ${passLine} 题，再巩固下错题就更稳`
  else comment = `未通过（需对 ${passLine} 题），先把错题看完再重考`

  return (
    <div style={{ ...cardStyle, padding: '30px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 42, fontWeight: 800, color: passed ? 'var(--primary)' : 'var(--danger)' }}>
        {score} / {total}
      </div>
      <div style={{ color: 'var(--text-sub)', margin: '8px 0 20px' }}>
        {passed ? '恭喜通过' : '未通过'}　·　{comment}
      </div>
      {quiz.wrong.length > 0 ? (
        <>
          <div style={{ textAlign: 'left', marginBottom: 12, fontWeight: 600 }}>错题回顾：</div>
          {quiz.wrong.map(w => (
            <div key={w.w} style={{
              textAlign: 'left', padding: '10px 12px', border: '1px solid #fce7f3',
              borderRadius: 10, marginBottom: 8, fontSize: 14, background: '#fdfafb',
            }}>
              <b>{w.w}</b> <span style={{ color: 'var(--text-sub)' }}>{w.ph}</span>{' '}
              <span style={{ color: '#10b981' }}>✓ {w.m}</span>
            </div>
          ))}
        </>
      ) : (
        <div style={{ color: 'var(--text-sub)', marginTop: 0 }}>没有错题，太稳了。</div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
        <button style={{ ...btnBase, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}
          onClick={quitQuiz}>返回单词表</button>
        <button style={btnBase} onClick={() => setQuiz(null)}>
          {passed ? '再来一组' : '重新考试'}
        </button>
      </div>
    </div>
  )
}
