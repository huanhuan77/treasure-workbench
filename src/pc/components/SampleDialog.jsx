import { useState } from 'react'
import { useStore } from '../../store'
import { useToast } from '../../components/Toast'
import { ConfirmModal } from '../../components/Modal'
import { CATEGORIES } from '../../utils/categories'
import { ACCOUNTS, ACCOUNT_COLOR } from '../../utils/accounts'
import { isShotSample } from '../../utils/sampleStatus'
import { todayStr, addDays, toDateInput } from '../../utils/helpers'

// PC 版「新增/编辑样品」对话框。
// 用户要求：PC 上的按钮操作都走弹窗、不跳页面；弹窗要是 PC 风格。
//
// 原来这里是直接套手机版的共用组件 SampleForm（自带手机版 Modal：粉色渐变按钮、
// 大圆角、居中小卡），在浅灰工作台的 PC 界面里一眼就是「手机的东西」。
// 现在改成和另外三个 PC 弹窗（ProductDialog / CopyDialog / PublishDialog）
// 同一套 pcv- 外壳（.pcv-overlay/.pcv-dialog/.pcv-dialog-f），只换外壳、不换口径。
//
// 口径：以手机版 SampleForm 为准（它只服务「编辑」），**新增**态回补手机版
// NewSamplePage 的规则 —— 见下面「与手机版的有意差异」。
//   - 名称：编辑时只读；新增时可填
//   - 分类：新增必填；归属账号：新增必填
//   - 关联产品：**已按用户要求去掉**（手机版 SampleForm / NewSamplePage 里都有这一项）
//   - 佣金默认 5 = 「不显示」，界面上要把 5 显示成空
//   - 截止日期 = 收货日期 +15 天；用户一旦手改过截止日期就不再联动（deadlineTouched）
//   - 状态三选一映射到 archived / isShot 两个布尔
//   - 保存时必须带 account = accounts[0]，兼容只读 account 的老逻辑
//
// ⚠️ 与手机版的有意差异（都跟用户报备过，不是随手加的）：
//   1. 删除从 window.confirm 换成 ConfirmModal —— 与另三个 PC 弹窗一致
//   2. 新增时名称可编辑 —— 手机版 SampleForm 里它是只读的，那是因为手机版新增走
//      NewSamplePage 整页、根本不走 SampleForm。PC 新增走的就是这个弹窗，
//      照抄只读会让「新增样品」永远保存不了
//   3. 新增时校验归属账号非空 —— 取自 NewSamplePage
//   4. 多账号提示文案改成「归属 N 个账号，物流与拍摄共享，发布/出单按账号独立统计」——
//      SampleForm 原文是「将拆分为 N 条样品」，但 store 的 addSample 实际是
//      **合并成一条实体**（源码注释：归属账号多选 → 合并为一条实体），
//      NewSamplePage 的文案才是对的那个
//   5. 去掉「关联产品」字段（用户要求）。
//      ⚠️ 只是不给编辑入口：form.productId 仍在 state 里、保存时原样带出，
//      已有样品存过的关联不会被清掉，也不会丢数据。
const STATUS_OPTS = [
  { v: 'unshot', label: '未拍' },
  { v: 'shot', label: '已拍' },
  { v: 'archived', label: '已放弃' },
]

export function SampleDialog({ sample, onClose, onSaved }) {
  const { addSample, updateSample, deleteSample } = useStore()
  const { show } = useToast()

  const isNew = !sample

  const [form, setForm] = useState({
    name: sample?.name || '',
    account: sample?.account || (Array.isArray(sample?.accounts) && sample.accounts[0]) || '',
    accounts: Array.isArray(sample?.accounts) && sample.accounts.length
      ? sample.accounts
      : (sample?.account ? [sample.account] : []),
    logistics: sample?.logistics || (sample?.status === 'un_arrived' ? 'un_arrived' : 'arrived'),
    isShot: sample?.isShot ?? isShotSample(sample),
    receiveDate: sample?.receiveDate || todayStr(),
    deadline: sample?.deadline || (sample ? '' : addDays(todayStr(), 15)),
    remark: sample?.remark || '',
    commission: sample?.commission || 5,
    productId: sample?.productId || '',
    category: sample?.category || '',
    archived: sample?.archived || sample?.status === 'abandoned' || false,
  })
  const [deadlineTouched, setDeadlineTouched] = useState(!!sample?.deadline)
  const [delOpen, setDelOpen] = useState(false)

  const toggleAccount = (a) => {
    setForm((f) => ({
      ...f,
      accounts: f.accounts.includes(a) ? f.accounts.filter((x) => x !== a) : [...f.accounts, a],
    }))
  }

  const setStatus = (v) => {
    if (v === 'archived') setForm((f) => ({ ...f, archived: true, isShot: false }))
    else if (v === 'shot') setForm((f) => ({ ...f, archived: false, isShot: true }))
    else setForm((f) => ({ ...f, archived: false, isShot: false }))
  }

  const onReceiveChange = (v) => {
    setForm((f) => {
      const next = { ...f, receiveDate: v }
      if (!deadlineTouched && v) next.deadline = addDays(v, 15)
      return next
    })
  }

  const save = () => {
    if (!form.name.trim()) { show('请输入样品名称', 'error'); return }
    if (isNew && !form.category) { show('请选择分类', 'error'); return }
    // 新增必须有归属账号：没账号的样品在列表里既没有发布/出单统计、也无法补记发布。
    // 口径来自手机版 NewSamplePage（SampleForm 那条老路径不校验，但那条路已经不走新增了）。
    if (isNew && form.accounts.length === 0) { show('请选择归属账号', 'error'); return }
    const f = { ...form, name: form.name.trim(), account: form.accounts[0] || '', accounts: [...form.accounts] }
    const newId = isNew ? addSample(f) : null
    if (isNew) show('样品已添加', 'success')
    else { updateSample(sample.id, f); show('已保存', 'success') }
    onClose()
    // 保存成功后让列表「重新请求一次」：清掉可能把这条挡住的筛选 + 强制重算 + 定位高亮。
    // （addSample 会返回新 id，部分实现没有返回值，这里只在拿到 id 时透传）
    if (typeof onSaved === 'function') onSaved(newId || sample?.id || '')
  }

  const doDelete = () => {
    deleteSample(sample.id)
    setDelOpen(false)
    onClose()
    show('已删除', 'success')
  }

  return (
    <>
      <div className="pcv-overlay" onClick={onClose}>
        <div className="pcv-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="pcv-dialog-h">
            <span>{isNew ? '添加样品' : '编辑样品'}</span>
            <div className="pcv-spacer" />
            <button className="pcv-dialog-x" title="关闭" onClick={onClose}>×</button>
          </div>

          <div className="pcv-dialog-b">
            {/* 名称：**新增与编辑都可改**（用户要求，之前编辑态是只读灰底）。
                改完保存即可；与样品列表里「点名字直接改」写的是同一个字段 name。 */}
            <div className="pcv-field-label">产品名称 <span style={{ color: '#b96a66' }}>*</span></div>
            <input
              className="pcv-input"
              style={{ width: '100%' }}
              placeholder="例如：补水喷雾"
              value={form.name}
              autoFocus={isNew}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            />

            {/* 分类/关联产品/佣金在手机版是**新增和编辑都显示**的（statusMode 才隐藏），
                这里不要按 isNew 包起来 —— 只有「分类」的必填标记跟 isNew 走。 */}
            <div className="pcv-field-label" style={{ marginTop: 18 }}>
              分类 {isNew && <span style={{ color: '#b96a66' }}>*</span>}
            </div>
            <div className="pcv-catpick">
              {CATEGORIES.map((c) => (
                <button key={c} className={form.category === c ? 'on' : ''} onClick={() => setForm((f) => ({ ...f, category: c }))}>{c}</button>
              ))}
            </div>

            <div className="pcv-field-label" style={{ marginTop: 18 }}>
              {isNew ? '归属账号（可多选，选几个账号就是几条样品）' : '归属账号（可多选）'}
            </div>
            {/* 选中态改成**账号主题色实底 + 白字**（用户反馈「选中和未选中分不清」）：
                原来未选中反而用了深色描边+深色字，看起来比选中的淡粉底更重。
                现在未选中一律中性灰（白底细灰边），只有选中才上色，对比一眼可辨。 */}
            <div className="pcv-catpick">
              {ACCOUNTS.map((a) => {
                const on = form.accounts.includes(a)
                const col = (ACCOUNT_COLOR[a] || {}).c || '#b8517f'
                return (
                  <button
                    key={a}
                    className={on ? 'on' : ''}
                    onClick={() => toggleAccount(a)}
                    style={on
                      ? { background: col, borderColor: col, color: '#fff', fontWeight: 700 }
                      : { background: '#fff', borderColor: 'rgba(15,23,42,0.16)', color: '#6b7280' }}
                  >
                    {a}{on ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
            {/* 多账号提示文案已去掉（用户要求）：账号按钮上本来就有 ✓ 选中态，
                那段粉色说明反而把表单撑高、和下面的字段抢视线。 */}

            {/* 「关联产品」字段按用户要求去掉（截图圈的就是这一项）。
                注意 form.productId 仍然在 state 里、保存时原样带出去 ——
                只是不给编辑入口，这样已有样品里存过的关联不会被清掉。 */}

            <div className="pcv-field-label" style={{ marginTop: 18 }}>佣金（%）</div>
            <input
              className="pcv-input"
              type="number"
              // 180 = 弹窗里其他单行输入（日期等）的统一宽度。
              // 原来 120px 太窄，placeholder「5（默认不显示）」会被数字上下箭头挤掉尾巴。
              style={{ width: 180 }}
              // 5 是「不显示」的默认值，界面上要显示成空，否则用户以为填了 5
              value={form.commission === 5 ? '' : form.commission}
              placeholder="5（默认不显示）"
              onChange={(e) => {
                const v = e.target.value === '' ? 5 : parseInt(e.target.value, 10)
                setForm((f) => ({ ...f, commission: isNaN(v) ? 5 : v }))
              }}
            />

            <div className="pcv-field-label" style={{ marginTop: 18 }}>状态</div>
            <div className="pcv-seg" style={{ display: 'flex', width: '100%' }}>
              {STATUS_OPTS.map((it) => {
                const active = form.archived
                  ? it.v === 'archived'
                  : (it.v === 'shot' ? !!form.isShot : it.v === 'unshot' ? !form.isShot : false)
                return (
                  <button
                    key={it.v}
                    className={active ? 'on' : ''}
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setStatus(it.v)}
                  >{it.label}</button>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
              <div style={{ flex: 1 }}>
                <div className="pcv-field-label">收货时间</div>
                <input
                  className="pcv-input"
                  style={{ width: '100%' }}
                  type="date"
                  value={toDateInput(form.receiveDate)}
                  onChange={(e) => onReceiveChange(e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div className="pcv-field-label">截止时间（默认收货 +15 天）</div>
                <input
                  className="pcv-input"
                  style={{ width: '100%' }}
                  type="date"
                  value={toDateInput(form.deadline)}
                  onChange={(e) => { setDeadlineTouched(true); setForm((f) => ({ ...f, deadline: e.target.value })) }}
                />
              </div>
            </div>

            <div className="pcv-field-label" style={{ marginTop: 18 }}>备注</div>
            <textarea
              className="pcv-input"
              style={{ width: '100%', minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="备注信息"
              value={form.remark}
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
            />
          </div>

          <div className="pcv-dialog-f">
            {!isNew && (
              <button
                className="pcv-btn pcv-btn-ghost"
                style={{ color: '#b96a66', borderColor: 'rgba(185, 106, 102, 0.35)' }}
                onClick={() => setDelOpen(true)}
              >删除</button>
            )}
            <div className="pcv-spacer" />
            <button className="pcv-btn pcv-btn-ghost" onClick={onClose}>取消</button>
            <button className="pcv-btn" onClick={save}>保存</button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onConfirm={doDelete}
        title="删除样品"
        message="确定删除该样品吗？此操作不可撤销。"
        confirmText="删除"
      />
    </>
  )
}
