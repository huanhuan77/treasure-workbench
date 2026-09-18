import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Fix code matching: exclude numbers that are part of larger amounts/decimals
# Also fix date and improve price/shares extraction
old_code = """  // 基金/股票代码：6位数字
  const codeMatch = joined.match(/(\\d{6})/)
  if (codeMatch) result.code = codeMatch[1]"""

new_code = """  // 基金/股票代码：6位数字，不能是更大数字的一部分
  // 排除小数（价格）和金额中的数字
  const codeMatches = joined.match(/(?<![\\d.,])(\\d{6})(?![\\d.])/g) || []
  // 排除明显是日期的（如202607、202609等）和金额
  const validCodes = codeMatches.filter(m => {
    const n = parseInt(m)
    if (n >= 200000 && n <= 209912) return false // 年份范围
    if (n === parseInt(result.date?.replace(/-/g,''))) return false
    return true
  })
  if (validCodes.length > 0) result.code = validCodes[0]"""

c = c.replace(old_code, new_code)

# Fix date: normalize to YYYY-MM-DD
old_date = """  // 日期时间（多种格式）
  const dateMatch = joined.match(/(\\d{4})[-\\/.](\\d{1,2})[-\\/.](\\d{1,2})/)
  if (dateMatch) result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}`"""

new_date = """  // 日期时间（多种格式：2026-07-06, 2026/7/6, 2026.07.06, 2026年7月6日）
  let dateMatch = joined.match(/(\\d{4})[-\\/.](\\d{1,2})[-\\/.](\\d{1,2})/)
  if (!dateMatch) dateMatch = joined.match(/(\\d{4})年(\\d{1,2})月(\\d{1,2})日/)
  if (dateMatch) result.date = `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}`"""

c = c.replace(old_date, new_date)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
