import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `植研加 睫毛胶水

我勒个豆！
植研加不愧是你啊
运动暴汗一整天到晚上还没掉
还是无甲醛 不辣眼
到底谁还没用上啊
👍

植研加！
你的权威我后知后觉
运动暴汗到刘海滴水
睫毛还是牢牢扒在眼睛上
还是无甲醛 不辣眼
求别停产 我会一直用
✅

男朋友说"眼妆好美"
我就明白这睫毛胶水没白用
假睫毛用它随便一刷
爆哭一整天都不会掉
无甲醛不辣眼
求别停产 我会一直用
✅

求别停产🥺！我会一直用
跟crush看电影
爆哭都没掉
我就知道！
植研加胶睫毛胶水我买对了
👍

闺蜜问我"眼睛怎么闪闪的"
我内心猛笑 那当然啦
不枉我用的植研加星空胶假睫毛胶水
自带细闪是我的小心机
👍

朋友问我是不是种睫毛了
我就知道这款
植研加假睫毛胶水选对了
无甲醛还粘得牢
新手随便涂涂都像妈生睫~
👍

#植研加 #植研加睫毛胶水 #睫毛胶水 #平价彩妆 #好物推荐`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} | ${c.content.slice(0,22).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/jiemao_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/jiemao_seed.json')
