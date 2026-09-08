// 全屏「选择样品」页骨架（替代弹窗，iOS 键盘/状态栏下更稳）
// 仅供需要把"选样品弹窗"升级为整页选择的表单页复用。
// 本组件只负责布局骨架（头部/搜索区/计数操作行/内容滚动/底部确定），
// 列表项与勾选逻辑由调用方以 children 传入并自行维护状态。
export function SamplePickerPage({
  title = '选择样品',
  onBack,          // 返回表单
  query,
  onQueryChange,
  placeholder = '搜索样品名称…',
  count,           // 当前已勾选数量
  showBulk,        // 是否显示 全选/清空
  onSelectAll,
  onClear,
  children,        // 样品列表区
  confirmText,     // 确定按钮文案（含计数时调用方拼好）
  confirmDisabled,
  onConfirm,
}) {
  const backBtn = {
    width: '36px', height: '36px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    color: 'var(--text-main)', fontSize: '20px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }
  const fieldBox = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', padding: '13px 14px', borderRadius: '12px',
    background: '#fff', border: '1.5px solid rgba(0,0,0,0.08)',
    fontSize: '15px', color: 'var(--text-main)', cursor: 'pointer', boxSizing: 'border-box',
  }

  return (
    <div className="app-container scroll-lock-page" style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.5)' }}>
      {/* 全屏头部 */}
      <header style={{
        padding: 'calc(16px + var(--safe-top)) 16px 14px',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
        borderBottom: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        <button onClick={onBack} style={backBtn} aria-label="返回">‹</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.3 }}>{title}</h1>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>勾选后点下方「确定」写回表单，可多选</div>
        </div>
      </header>

      {/* 搜索 + 操作条（固定不随列表滚） */}
      <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
        <input
          autoFocus
          placeholder={placeholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          inputMode="search"
          name="q"
          style={{ ...fieldBox, borderColor: query ? 'rgba(244,114,182,0.6)' : 'rgba(0,0,0,0.08)' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: 'var(--text-sub)' }}>
          <span>已勾选 <b style={{ color: 'var(--primary)' }}>{count}</b> 个</span>
          {showBulk && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={onSelectAll}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >全选</button>
              <span style={{ color: '#d1d5db' }}>|</span>
              <button
                type="button"
                onClick={onClear}
                style={{ background: 'none', border: 'none', color: 'var(--text-sub)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
              >清空</button>
            </div>
          )}
        </div>
      </div>

      {/* 列表滚动区（底部留出固定确定栏高度） */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 16px calc(120px + var(--safe-bottom))',
        WebkitOverflowScrolling: 'touch',
      }}>
        {children}
      </div>

      {/* 底部固定确定栏 */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 300,
        maxWidth: '480px', margin: '0 auto',
        padding: '12px 16px calc(14px + var(--safe-bottom))',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      }}>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirmDisabled}
          style={{
            width: '100%', padding: '14px 0', borderRadius: '14px', border: 'none',
            background: confirmDisabled
              ? 'rgba(244,114,182,0.25)'
              : 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
            color: '#fff', fontSize: '16px', fontWeight: 700, cursor: confirmDisabled ? 'not-allowed' : 'pointer',
            boxShadow: confirmDisabled ? 'none' : '0 4px 14px rgba(244,114,182,0.3)',
          }}
        >{confirmText || '确定'}</button>
      </div>
    </div>
  )
}

export default SamplePickerPage
