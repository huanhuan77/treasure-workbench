import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `DOBO 噗噗片

终于pu💩自由了
🌳植物更安心
再也不用带手机进 🚻了
比德芙还丝滑~
👍

时间：大餐后
结果：巨💩
总结：爽翻!!

西梅干?西梅软糖?
算了吧，我选它
三天的库存都给整🈳了
太爽了

算了跟你们解释不清楚!
就这个DOBO
跟风买的我也没想到这么惊喜
不好意思了朋友  
这个夏天我先赢了

NB!!
三天的库存清了
爽歪歪~

本来DOBO已经够猛了
再加上东方🍂
谁懂啊
我妈以为我天天吃草

抱一丝同学
下个月就30度了
我必须做最有种的女人

你一句是不是断粮了?!
就知道我的努力没有白费
全绿的成分
你看看现在才啥价啊
✅

距离夏天还有一个多月
原本只是跟风吃的 
Crush见面第一句
"你应该没有90吧"
我就知道这把稳了

DOBO你别太离谱
我妈以为我没钱吃饭了
真的夯爆了!!
✅

第一批受害者出現了
太太太筷了
我妈都以为我
在外吃不上🍚
👍

夜宵不让我吃
是不可能的	
还好我有清清片
酷酷炫的快乐啊
沒在怕的
✅

求求商战千万別停
一代人有一代人的鸡蛋要领
被资本喂得不知天地
为何物了

还好有饭搭子 
不然都体会不到 
放纵日的快乐
根本没在怕的
✅

真抱一丝啊	
马上就30度了
我要争气
做朋友圈最装的女人
✅

没想到控制不住
自己的嘴👄
饭前随便吃两片
还真有惊喜
✅

可惜你
"夏天不穿👗👙"
不懂燃燃片的含金量
我现在对谈恋爱没什么欲望
只想在夏天
SOU下来装一波大的!

夏日倒计时
还得是👟休
主打一个效率
这回👗我穿定了

拜见清清片大王
马上就30度了
小的📷，就靠您了
✅

我现在只有
一个重要的主线任务
sou下来装逼
sou下来装逼
sou下来装逼
✅`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} | ${c.content.slice(0,24).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/dobo_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/dobo_seed.json')
