import { useLocation, useRoutes } from 'react-router-dom'

// 需要保活的「列表/筛选页」：不含带 :param 的详情页和表单页，
// 避免隐藏页在 re-render 时读到错误的路由参数导致异常。
const KEEP_ALIVE = {
  '/': 'dashboard',
  '/products': 'products',
  '/samples': 'samples',
  '/orders': 'orders',
  '/savings': 'savings',
  '/finance': 'finance',
  '/publish-records': 'publish-records',
  '/publish-reminders': 'publish-reminders',
  '/dramas': 'dramas',
  '/reading': 'reading',
  '/brands': 'brands',
  '/todos': 'todos',
  '/daily': 'daily',
  '/calendar': 'calendar',
}

// 跨渲染缓存：cacheKey -> 上一次渲染的 element（保持挂载以保留状态/滚动）
const aliveMap = new Map()

// 替换 <Routes>：对 KEEP_ALIVE 内的页面做保活（常驻挂载 + display 切换显隐），
// 其余页面（详情/表单/带参数的）按原逻辑即时挂载、切换即卸载。
export function KeepAliveRoutes({ routes }) {
  const location = useLocation()
  const element = useRoutes(routes)
  const key = KEEP_ALIVE[location.pathname]
  if (key) aliveMap.set(key, element)
  return (
    <>
      {[...aliveMap.entries()].map(([k, el]) => (
        <div key={k} aria-hidden={k !== key} style={{ display: k === key ? 'block' : 'none' }}>
          {el}
        </div>
      ))}
      {!key && element}
    </>
  )
}
