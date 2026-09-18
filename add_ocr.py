import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# 1. Add state for OCR
old_state = "  const [invAssetType, setInvAssetType] = useState('stock') // 新增时默认股票"
new_state = """  const [invAssetType, setInvAssetType] = useState('stock') // 新增时默认股票
  const [ocrLoading, setOcrLoading] = useState(false)
  const fileInputRef = useRef(null)"""
c = c.replace(old_state, new_state)

# 2. Add OCR parse function after autoDetectType/getAssetType area
# Insert before the component
ocr_func = '''
// 解析OCR识别文本，提取投资记录信息
function parseOcrText(text) {
  const result = {}
  const lines = text.split(/\\n+/).map(l => l.trim()).filter(Boolean)
  const joined = lines.join('\\n')

  // 判断买入/卖出
  if (joined.includes('卖出') || joined.includes('赎回') || joined.includes('卖出成功')) {
    result.type = 'sell'
  } else if (joined.includes('买入') || joined.includes('申购') || joined.includes('定投')) {
    result.type = 'buy'
  }

  // 基金代码：6位数字
  const codeMatch = joined.match(/(\\d{6})/)
  if (codeMatch) result.code = codeMatch[1]

  // 基金产品名
  const fundProduct = joined.match(/(?:卖出产品|买入产品)\\s*[:：]?\\s*(.+)/)
  if (fundProduct) result.name = fundProduct[1].trim()

  // 卖出份额
  const sellShares = joined.match(/(?:卖出份额|确认份额)\\s*[:：]?\\s*([\\d,.]+)/)
  if (sellShares) result.shares = sellShares[1].replace(/[,，]/g, '')

  // 买入金额
  const buyAmount = joined.match(/(?:买入金额)\\s*[:：]?\\s*([\\d,.]+)/)
  if (buyAmount) result.amount = buyAmount[1].replace(/[,，]/g, '')

  // 确认净值/价格
  const navMatch = joined.match(/(?:确认净值|成交价格|价格|成交价)\\s*[:：]?\\s*([\\d.]+)/)
  if (navMatch) result.price = navMatch[1]

  // 成交数量（股票）
  const qtyMatch = joined.match(/(?:成交数量|数量)\\s*[:：]?\\s*([\\-\\d,.]+)/)
  if (qtyMatch && !result.shares) result.shares = qtyMatch[1].replace(/[,，]/g, '')

  // 到账金额
  const arrivedMatch = joined.match(/(?:到账金额|发生金额|金额)\\s*[:：]?\\s*([\\d,.]+)/)
  if (arrivedMatch) result.arrivedAmount = arrivedMatch[1].replace(/[,，]/g, '')

  // 日期时间
  const dateMatch = joined.match(/(\\d{4}-\\d{2}-\\d{2})\\s*(?:\\d{2}:\\d{2})?/)
  if (dateMatch) result.date = dateMatch[1]

  // 判断类型：基金名含"基金"、"混合"、"ETF"、"联接"、"C"、"A"等
  if (result.name) {
    if (/基金|混合|ETF|联接|债券|货币|QDII|股票型|指数|\\b[AC]\\b/.test(result.name)) {
      result.assetType = 'fund'
    }
  }
  // ETF代码以15/51开头，判断为基金
  if (result.code && /^(15|51)/.test(result.code)) result.assetType = 'fund'

  // 如果有买入金额但没有价格，尝试反推
  if (result.amount && result.shares && !result.price) {
    result.price = (parseFloat(result.amount) / parseFloat(result.shares)).toFixed(4)
  }
  // 如果有到账金额和份额，反推卖出价
  if (result.type === 'sell' && result.arrivedAmount && result.shares && !result.price) {
    result.price = (parseFloat(result.arrivedAmount) / parseFloat(result.shares)).toFixed(4)
  }

  return result
}

async function runOcr(file) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('chi_sim')
  const { data } = await worker.recognize(file)
  await worker.terminate()
  return data.text
}
'''

# Insert before the component function
c = c.replace(
    "export function InvestmentPage() {",
    ocr_func + "\nexport function InvestmentPage() {"
)

# 3. Add OCR handler function inside component (after the fetchAndAdd area)
# Find a good place - after the state declarations, before the touch handlers
old_touch = "  // 下拉刷新"
new_handler = """  // 截图识别
  const handleOcrClick = () => {
    fileInputRef.current?.click()
  }
  const handleOcrFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrLoading(true)
    try {
      const text = await runOcr(file)
      const parsed = parseOcrText(text)
      if (parsed.code) setInvCode(parsed.code)
      if (parsed.name) setInvName(parsed.name)
      if (parsed.type) setInvType(parsed.type)
      if (parsed.assetType) setInvAssetType(parsed.assetType)
      if (parsed.price) setInvSellPrice(parsed.price)
      if (parsed.shares) setInvShares(parsed.shares)
      if (parsed.date) setInvSellDate(parsed.date)
      setToast('识别完成，请确认信息后保存')
    } catch(err) {
      console.error('OCR error:', err)
      setToast('识别失败，请手动输入')
    } finally {
      setOcrLoading(false)
      e.target.value = ''
    }
  }

  // 下拉刷新"""
c = c.replace(old_touch, new_handler)

# 4. Add hidden file input and OCR button in the modal
# Add the file input near the top of the modal content
old_modal_start = """      <Modal open={showAddInv} onClose={() => setShowAddInv(false)} title="📝 添加投资记录" center>
        <div style={{ boxSizing:'border-box' }}>
          {/* 资产类型选择 */}"""
new_modal_start = """      <Modal open={showAddInv} onClose={() => setShowAddInv(false)} title="📝 添加投资记录" center>
        <div style={{ boxSizing:'border-box' }}>
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={handleOcrFile} />
          <button onClick={handleOcrClick} disabled={ocrLoading} style={{
            width:'100%', boxSizing:'border-box', padding:'10px', marginBottom:'12px', borderRadius:'10px',
            border:'1.5px dashed #6366f1', background: ocrLoading ? '#eef2ff' : 'transparent',
            color:'#6366f1', fontSize:'13px', fontWeight:700, cursor: ocrLoading ? 'wait' : 'pointer',
          }}>
            {ocrLoading ? '⏳ 正在识别截图…' : '📷 截图识别（拍照/相册）'}
          </button>
          {/* 资产类型选择 */}"""
c = c.replace(old_modal_start, new_modal_start)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
