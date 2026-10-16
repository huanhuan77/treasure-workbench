import { useState, useEffect } from 'react'

// 桌面端断点：≥768px 启用 PC 版式（左侧边栏、多列网格、紧凑表格）。
// ⚠️ 必须与 index.css 里所有 @media (min-width: 768px) 的块保持一致，
// 否则会出现「导航已经是侧边栏、内容还按手机宽度排」这类错位。
export const DESKTOP_QUERY = '(min-width: 768px)'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY)
    const onChange = (e) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}
