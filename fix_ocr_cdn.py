import io
f = r'E:\treasure-workbench\src\pages\InvestmentPage.jsx'
with io.open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Replace runOcr to use CDN instead of npm import
old_ocr = """async function runOcr(file) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('chi_sim')
  const { data } = await worker.recognize(file)
  await worker.terminate()
  return data.text
}"""

new_ocr = """// Dynamically load tesseract.js from CDN
let _tesseractPromise = null
function loadTesseract() {
  if (_tesseractPromise) return _tesseractPromise
  _tesseractPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    s.onload = () => resolve(window.Tesseract)
    s.onerror = () => reject(new Error('Failed to load tesseract.js'))
    document.head.appendChild(s)
  })
  return _tesseractPromise
}

async function runOcr(file) {
  const Tesseract = await loadTesseract()
  const worker = await Tesseract.createWorker('chi_sim')
  const { data } = await worker.recognize(file)
  await worker.terminate()
  return data.text
}"""

c = c.replace(old_ocr, new_ocr)

with io.open(f, 'w', encoding='utf-8', newline='') as fh:
    fh.write(c)
print('OK')
