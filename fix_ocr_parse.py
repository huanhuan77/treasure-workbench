import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

old_parse = """// 解析OCR识别文本，提取投资记录信息
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
}"""

new_parse = r"""// 解析OCR识别文本，提取投资记录信息
function parseOcrText(text) {
  const result = {}
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
  const joined = lines.join('\n')

  // 判断买入/卖出（宽松匹配）
  if (/卖|赎回|卖出成功/.test(joined)) {
    result.type = 'sell'
  } else if (/买|申购|定投/.test(joined)) {
    result.type = 'buy'
  }

  // 基金/股票代码：6位数字
  const codeMatch = joined.match(/(\d{6})/)
  if (codeMatch) result.code = codeMatch[1]

  // 基金产品名
  const fundProduct = joined.match(/(?:卖出产品|买入产品)\s*[:：]?\s*(.+)/)
  if (fundProduct) result.name = fundProduct[1].trim()

  // 卖出份额
  const sellShares = joined.match(/(?:卖出份额|确认份额|份额)\s*[:：]?\s*([\d,.]+)/)
  if (sellShares) result.shares = sellShares[1].replace(/[,，]/g, '')

  // 买入金额
  const buyAmount = joined.match(/(?:买入金额)\s*[:：]?\s*([\d,.]+)/)
  if (buyAmount) result.amount = buyAmount[1].replace(/[,，]/g, '')

  // 确认净值/成交价格
  const navMatch = joined.match(/(?:确认净值|成交价格|成交价|价格)\s*[:：]?\s*([\d.]+)/)
  if (navMatch) result.price = navMatch[1]

  // 成交数量（股票）
  const qtyMatch = joined.match(/(?:成交数量|数量)\s*[:：]?\s*(-?[\d,.]+)/)
  if (qtyMatch && !result.shares) result.shares = qtyMatch[1].replace(/[,，]/g, '').replace(/^-/, '')

  // 到账金额/发生金额/金额
  const arrivedMatch = joined.match(/(?:到账金额|发生金额|金额)\s*[:：]?\s*([\d,.]+)/)
  if (arrivedMatch) result.arrivedAmount = arrivedMatch[1].replace(/[,，]/g, '')

  // 日期时间（多种格式）
  const dateMatch = joined.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/)
  if (dateMatch) result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}`

  // 如果标签匹配失败，从行里直接提取数字
  if (!result.price || !result.shares) {
    // 找所有小数（3-4位小数通常是价格）
    const allDecimals = joined.match(/\b\d+\.\d{3,4}\b/g) || []
    // 找所有整数或带逗号的数（通常是数量/金额）
    const allInts = joined.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d{2,6}\b/g) || []

    if (!result.price && allDecimals.length > 0) {
      result.price = allDecimals[0]
    }
    if (!result.shares && allInts.length > 0) {
      // 排除代码和日期
      const filtered = allInts.filter(n => {
        const clean = n.replace(/[,，]/g, '')
        return clean !== result.code && !result.date?.includes(clean) && !/^\d{4}$/.test(clean)
      })
      if (filtered.length > 0) result.shares = filtered[0].replace(/[,，]/g, '')
    }
  }

  // 判断类型
  if (result.name) {
    if (/基金|混合|ETF|联接|债券|货币|QDII|股票型|指数|[AC]\b/.test(result.name)) {
      result.assetType = 'fund'
    }
  }
  if (result.code && /^(15|51|11|12|00|16|50)/.test(result.code)) result.assetType = 'fund'

  // 反推价格
  if (result.amount && result.shares && !result.price) {
    result.price = (parseFloat(result.amount) / parseFloat(result.shares)).toFixed(4)
  }
  if (result.type === 'sell' && result.arrivedAmount && result.shares && !result.price) {
    result.price = (parseFloat(result.arrivedAmount) / parseFloat(result.shares)).toFixed(4)
  }

  // 保留原始OCR文本用于调试
  result._raw = text
  return result
}"""

c = c.replace(old_parse, new_parse)

# Also improve the OCR handler to show raw text if parsing is incomplete
old_handler = """      const text = await runOcr(file)
      const parsed = parseOcrText(text)
      if (parsed.code) setInvCode(parsed.code)
      if (parsed.name) setInvName(parsed.name)
      if (parsed.type) setInvType(parsed.type)
      if (parsed.assetType) setInvAssetType(parsed.assetType)
      if (parsed.price) setInvSellPrice(parsed.price)
      if (parsed.shares) setInvShares(parsed.shares)
      if (parsed.date) setInvSellDate(parsed.date)
      alert('识别完成，请确认信息后保存')"""

new_handler = """      const text = await runOcr(file)
      const parsed = parseOcrText(text)
      if (parsed.code) setInvCode(parsed.code)
      if (parsed.name) setInvName(parsed.name)
      if (parsed.type) setInvType(parsed.type)
      if (parsed.assetType) setInvAssetType(parsed.assetType)
      if (parsed.price) setInvSellPrice(parsed.price)
      if (parsed.shares) setInvShares(parsed.shares)
      if (parsed.date) setInvSellDate(parsed.date)
      // 如果识别不全，显示原始文本帮助调试
      const missing = !parsed.price || !parsed.shares || !parsed.date
      if (missing) {
        alert('识别到部分信息，请检查并手动补全。\n\n原始识别文本：\n' + text.substring(0, 500))
      } else {
        alert('识别完成，请确认信息后保存')
      }"""

c = c.replace(old_handler, new_handler)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
