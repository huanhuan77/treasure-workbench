import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `绵绵的羊 小莓好湿巾

求大数据把这条推给热恋期的女生
记住了❤️主动为你考虑清洁的男生
一定比只知道买小雨伞的靠谱
要分清"对他好"和"对你好"的区别
爱人如养花
爱你的人会主动照顾你为你考虑…
✅

一代人有一代人的鸡蛋要抢😂
哈哈啊哈哈
这个价跟白捡有什么区别！
👍

钱没了可以再赚
但是绵绵的羊小莓好湿巾
十几块就到手 2 盒 20 片🥰
要是错过就真的没有了啊闺蜜们
✅

在乎女生需求的品牌真的很加分
绵绵的羊你真的..😭
这个女生清洁湿巾
并不是只能和男朋友在一起的时候用！！
来姨妈时用它
清洁干掉的污渍
或者清洁日常分泌物都好用
淡淡的蔓越莓清香
很干净很卫生
👍

下周异地恋见面
准备这么多应该够吧🥰
✅

#绵绵的羊#湿巾 #清洁湿巾 #女生必备 #清洁卫生`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} | ${c.content.slice(0,24).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/mianmian_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/mianmian_seed.json')
