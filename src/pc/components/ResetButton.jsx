// 「重置」按钮（除总览外，PC 各页共用）
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
// 位置：**紧跟在筛选组后面**（用户要求「所有页面都改」）。
// 早期版本会在前面插一根 .pcv-spacer 把按钮顶到行末，窗口一宽就孤零零漂在右边、
// 和它要清空的筛选离得老远，所以现在默认不占位。
// 保留 inline 参数只是为了兼容旧写法（传不传都一样）。
export function ResetButton({ active, onClick, label = '重置' }) {
  return (
    <button
      className="pcv-reset"
      disabled={!active}
      onClick={onClick}
      title="清空搜索与筛选项"
    >
      {/* 环形箭头图标：比纯文字更像「恢复默认」，也与旁边的文字按钮区分开 */}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-8 8s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
      </svg>
      {label}
    </button>
  )
}
