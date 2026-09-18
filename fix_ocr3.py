import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Replace the code matching logic to be more aggressive about excluding date-related numbers
old = """  // 基金/股票代码：6位数字，不能是更大数字的一部分
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

new = """  // 基金/股票代码：6位数字，不能是更大数字的一部分
  const codeMatches = joined.match(/(?<![\\d.,])(\\d{6})(?![\\d.])/g) || []
  // 排除日期相关数字（202607、202609、202601等年份月份组合）和年份
  const validCodes = codeMatches.filter(m => {
    if (/^20\\d{4}$/.test(m)) return false // 202607, 202609 等
    if (/^19\\d{4}$/.test(m)) return false // 199xxx 等
    // 排除日期中的数字
    const dateDigits = result.date ? result.date.replace(/-/g, '') : ''
    if (m === dateDigits) return false
    if (dateDigits.startsWith(m)) return false
    return true
  })
  if (validCodes.length > 0) result.code = validCodes[0]"""

c = c.replace(old, new)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
