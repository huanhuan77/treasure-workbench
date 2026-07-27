import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `olly 女维

露思的眼光还是太超前了
也没人告诉我女维这么🐮啊
这才几天
crush以为我住小韩了
👍

没人懂吗
人整体的光泽感
才是最显贵的
💇‍♀️👨‍🦲💅
✅

你一句"好美"
我就知道跟着露思买对了
随便吃吃
我勒个逗
闺蜜以为我背着她偷偷飞小韩了
👍

没早睡没擦粉
只是吃对东西了而已
太快了🥹
✅

你的一句"漂亮了"
就知道我的坚持没有白费
17合1成份巨顶
美国原装进口之前挺贵
现在活动一瓶30粒才啥价啊
✅

你一句"老钱风"
我就知道OLLY买对了
老钱的精髓就是
💇‍♀️💅👩‍🦲
✅

#olly #olly女维 #女性复合维生素 #olly懂你漂亮做自己   #olly懂你好好养自己`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} | ${c.content.slice(0,24).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/olly_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/olly_seed.json')
