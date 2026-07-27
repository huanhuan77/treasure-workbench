// 可复用的攒钱计划触发按钮
export function SavingsButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer',
      padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '32px', height: '32px', flexShrink: 0,
    }}>
      💰
    </button>
  )
}
