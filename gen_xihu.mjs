import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const raw = `洁比兔 洗护液

可惜你不是热恋期
不懂这个的含金量
"战斗前"用它
香香甜甜的柑橘味
crush恨不得抱着啃
被子里都是甜丝丝的
✅

可惜你不是热恋期
不懂洁比兔洗护液的含金量
洗完香香的
生理性喜欢buff叠满
男朋友黏人程度10000000%
✅

昨晚我坐在他腿上
他突然凑过来闻我
当时我心一紧
结果他说我好香
谢谢你洁比兔
甜甜的恋爱也轮到我了🥰
✅

原来生理性喜欢
也可以作弊
就这个洁比兔益生菌洗护液
淡淡蔓越莓香
男朋友问怎么还喷香水
真连香水钱都省了
✅

啊啊啊啊啊！！
洁比兔你真牛
恋爱期每天都在用的
益生菌洗护液
每天晚上用它洗一洗
不仅干净还很好闻
那天老公竟然问
"你怎么到处都是香香的"
这个味道用一次都会爱上！！
✅

男朋友不知道
我们女孩子心里要有点数啊！！
运动完女生是不能直接用清水冲的
真的建议我们女孩子
都让对象去买这个
洁比兔家的益生菌洗护液
每一瓶里面都含有100亿益生菌
刚刚用它洗完清清爽爽真的巨舒服！！

一个烫知识!!
私处护理不能只用清水清洁
就这个洁比兔益生菌洗护液
一瓶里面
就有100亿益生菌
守护着我们女生
温和不刺激
用完安全感拉满!
✅

你一句"有点味儿"
我赶紧下单洁比兔蔓越莓洗液
随便洗洗
就是甜甜的蔓越莓味
男友也忍不住夸
这个真的有点东西..

他突然躺我腿上 
我下意识想躲
结果他说:宝宝你好香
谢谢洁比兔
终于不用再尴尬了!
洗完香香润润 清爽又自信~
👍

你说我睡过的被子好香
我再也没换过
闻一次 爱一辈子

#洁比兔 #女生必备 #卫生清洁 #亲测分享 #好物推荐`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} topic=${JSON.stringify(c.topics)} | ${c.content.slice(0,20).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/xihu_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/xihu_seed.json')
