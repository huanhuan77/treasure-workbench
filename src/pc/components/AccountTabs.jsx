import { ACCOUNTS, ACCOUNT_COLOR, maskAccount } from '../../utils/accounts'
import { useStore } from '../../store'

// PC 版账号 Tab（「记出单」与「记录发布」两个弹窗共用）。
// 全局「隐藏账号」选中后，账号名显示为星号（不筛掉，用户明确「是账号显示星号，不是筛选」）。
export function AccountTabs({ value, onChange, counts = {} }) {
  const { hiddenAccounts } = useStore()
  const list = ACCOUNTS
  return (
    <div className="pcv-acctabs">
      {list.map((a) => {
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
            <span>{maskAccount(a, hiddenAccounts)}</span>
            {cnt > 0 && (
              <span className="pcv-acctabs-cnt" style={on ? { background: col.c, color: '#fff' } : undefined}>{cnt}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
