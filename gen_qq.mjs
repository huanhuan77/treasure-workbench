import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `百草园 清清片

拜见清清片大王  啥原理不知道 总之少走30年弯路

也没人告诉我 这个清清片这么猛啊  那我之前走过的弯路都算什么

拜见清清片大王 小的出差就靠你了

时间：睡前 谁懂啊 💩一座小山的快乐

拜见清清片大王  时间：睡前 谁懂啊 💩一座小山的快乐

我滴老天奶呀
比德芙还丝滑
幸好在商场里
全清🈳了

时间:大餐后
结果:巨粑💩
总结:爽翻了!!😳

也就吃了两颗
三天的库存都给清了
爽翻了😎
清清片还挺权威的

我的老天奶!
是什么原理啊!
再也不用在厕所蹲到腿麻了

清清片你是要考研吗
清库存这么🐮
🚽都懵了

丝滑到怀疑人生
3天库存清了
给商场🚽整懵了

也就吃了2颗
3天的库存全给整出去了!!
清清片你还是太权威了

我勒个青天大老爷!!
这可是3天的库存啊
全出去了!爽

本来清清片已经够猛了
再加上东方🍂
谁懂啊
我妈以为我天天吃草
👍

替你们试过了
也就吃了两粒
要我说清库存还得是你
你真牛!
✅

下班之后
给身体来点"松绑"
💩到临头
是最踏实的小确幸
✅

夏天倒计时了
赶紧给自己安排上了清清片
➕干净饮食
一个月后
我将加入更权威的圈子!

谁懂啊
不知道的还以为
我荒野求生呢!
我将进入更权威的圈子

你永远可以相信
大馋丫头们的选品能力
只要它不停产我就一直回购
马上夏天了
我要把之前输的都赢回来‼️
👍

清清片你别太离谱
我妈以为没钱吃饭了
真的夯爆了!!
👍

你一句是不是断粮了?!
就知道我的努力没有白费
全绿的成分
你看看现在才啥价啊
👍

#清清片 #吃货必备 #好物推荐 #亲测分享 #百草园清清片`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c, i) => {
  console.log(`#${i + 1} hasOrder=${c.hasOrder} used=${c.used} topics=${JSON.stringify(c.topics)} | ${c.content.slice(0, 18).replace(/\n/g, ' ')}`)
})
writeFileSync('/tmp/qq_seed.json', JSON.stringify(copies, null, 2))
console.log('written /tmp/qq_seed.json')
