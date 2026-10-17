import { ACCOUNTS, ACCOUNT_COLOR } from '../../utils/accounts'

// PC 版账号 Tab（「记出单」与「记录发布」两个弹窗共用）。
// 视觉照手机版 NewOrderPage / NewPublishRecordPage 的账号 Tab：
// 白底圆角容器 + 三等分按钮，**选中态用该账号自己的主题色**（浅底 + 同色文字），
// 右侧带一个「这个账号已填几条」的计数气泡 —— 切 tab 时能一眼看出哪些账号填过了。
// 颜色是行内 style 打上去的（ACCOUNT_COLOR），所以 pc.css 里只管结构和未选中态。
export function AccountTabs({ value, onChange, counts = {} }) {
  return (
    <div className="pcv-acctabs">
      {ACCOUNTS.map((a) => {
        const on = value === a
        const col = ACCOUNT_COLOR[a] || { c: '#7c3aed', bg: 'rgba(124,58,237,0.12)' }
        const cnt = counts[a] || 0
        return (
          <button
            key={a}
            type="button"
            className={on ? 'on' : ''}
            style={on ? { background: col.bg, color: col.c } : undefined}
            onClick={() => onChange(a)}
          >
            <span>{a}</span>
            {cnt > 0 && (
              <span className="pcv-acctabs-cnt" style={on ? { background: col.c, color: '#fff' } : undefined}>{cnt}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
