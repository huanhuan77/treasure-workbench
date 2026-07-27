import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `褪黑素

坐了10小时飞机...
看到旁边帅哥睡的好香
问了一下才知道.....
原来是美国进口OLLY
一点都不带犹豫入...
晚上来了一粒 好家伙
熬夜党必备啊！牛啊！
👍

可惜你没试过
不然你根本不知道
维特健灵宁心的含金量
白天忙忙碌碌
晚上就想给自己一点松弛感
睡前那一刻
真的太治愈了
✅

成年人的一天
从⏰开始
也该有个温柔的结束
现在每天睡前
都会记得打卡维特健灵宁心
把照顾自己变成一种习惯
✅

宁心➕早点放下手机
慢慢找回属于自己的生活节奏
维特健灵宁心👍
一粒10h昏迷级
睡个好觉真的不难
👍

香港老品牌👍
晚上强制关机 睡爽了！！

牛的，一粒=10+⏰
没再半夜醒了

香港30年大品牌👍
晚上强制关机 睡爽了！
✅

我不想有坏情绪
我想早点睡…
世界上有两种快乐
开心的笑和睡个好觉
愿你两者皆
✅

#维特健灵 #宁心 #好好休息 #休息 #好物分享`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} | ${c.content.slice(0,24).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/tuimel_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/tuimel_seed.json')
