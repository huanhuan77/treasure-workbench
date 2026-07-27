import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `PH 地中海咖啡
这个世界什么都是假的
只有PH咖啡的权威是真的！
✅

"忍住，我把美食忍住"
加油，老己！
✅

拜见PH地中海黑咖！
马上40度☀️
小女子能不能穿上
漂亮👗👙📷就靠您了🙏

本来以为是智商税…
被闺蜜按头安利的PH地中海咖啡
喝了才知道
明星私藏的懒人好物是真的香！

自律入✅
代餐入✅
爱出片入✅
太快了🥹
✅

别再一天天的纠结
他爱不爱你
下个月就 30 度了
给我做💪硬气的女人
姐先冲了
👍

PH 你小子真有点东西
这速度真的绝！
难怪大半个娱乐圈都在喝
1 杯等于 1/8 个苹果
便捷包装，随时随地喝
✅

虽然夏日☀️的较量
已经开始了
但我一点也不慌张
我有它给我兜底
✅

我的老天
这 ph 地中海咖啡
真有点东西
太快了
妈妈以为我一个人
没有好好吃🍚
✅

算了
跟你们这些 2 位数的人
说不清楚
我先干为敬了
这个夏天我也要赢
✅

真抱一丝啊
下个月就 30 度了
我得争口气
做朋友圈坠装的女人
✅

咖啡机跟着我也是倒霉
ph 地中海黑咖的权威
我真的后知后觉！
下个周就 35 度了
接下来我要狠狠📷
✅

你永远可以相信
大馋丫头们的选品能力
只要它不停产我就一直回购
马上夏天了
我要把之前输的都赢回来‼️
👍

第一批受害者出现了
太太太筷了
我妈都以为我
在外吃不上🍚
👍

对不起了PH咖啡
5折券我抢到了
这个夏天我要惊艳所有人
👍

#PH地中海咖啡 #咖啡 #黑咖啡 #好喝不贵`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} topic=${c.topics.length>0?c.topics[0]:'(none)'} | ${c.content.slice(0,22).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/coffee_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/coffee_seed.json')
