// 复制文本到剪贴板。
// navigator.clipboard 只在「安全上下文」（https / localhost）可用，
// 用局域网 IP 之类的 http 地址打开时会直接抛错，所以保留 execCommand 兜底。
// 返回 Promise<boolean>，提示文案交给调用方决定。
export function copyText(text) {
  const legacy = () => {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-1000px'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ta.setSelectionRange(0, text.length)
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch (e) {
      return false
    }
  }

  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => legacy())
  }
  return Promise.resolve(legacy())
}
