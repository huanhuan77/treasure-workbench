// 筛选条最右的「重置」按钮（除总览外，PC 各页共用）
//
// 口径（用户确认）：只清「搜索关键词 + 筛选项」，不动 Tab / 视图切换
// （追剧的电视剧/综艺、投资的股票/基金、敏感词的功能 tab、攒钱的年份、日历的年月等）。
//
// 用法：
//   const [keyword, setKeyword] = useState('')
//   const [filter, setFilter] = useState('all')
//   const hasFilter = keyword !== '' || filter !== 'all'
//   const resetFilters = () => { setKeyword(''); setFilter('all') }
//   <ResetButton active={hasFilter} onClick={resetFilters} />
//
// 组件自带 .pcv-spacer，放在筛选行末尾即自动靠右。
export function ResetButton({ active, onClick, label = '重置', inline = false }) {
  return (
    <>
      {!inline && <div className="pcv-spacer" />}
      <button
        className="pcv-btn-text"
        disabled={!active}
        onClick={onClick}
        style={{
          // .pcv-accountbar button 会把按钮画成胶囊，这里用行内样式覆盖成文字按钮：
          // 「重置」是动作而不是筛选项，不该长得像旁边的胶囊。
          background: 'transparent',
          border: 'none',
          padding: '4px 6px',
          color: active ? '#b8517f' : '#c9cdd4',
          cursor: active ? 'pointer' : 'default',
        }}
      >
        {label}
      </button>
    </>
  )
}
