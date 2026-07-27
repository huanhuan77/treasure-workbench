import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `珀芙研 修护霜小样

要不是只能买一单
我能给你薅破产
珀芙研真有你的
小样正装量拿出来卖！！
✅

用过珀芙研的姐妹们
都知道他家修护霜什么价
现在小样正装量
才这个价格
你告诉我真的不薅嘛！！

一代人有一代人的鸡蛋要抢
啊哈哈啊哈哈哈～
珀芙研真🐮
这个价和白捡有什么区别！
✅

四条腿的男人好找
珀芙研10支修护小样
只要这个价
快点来薅！🥺
✅👍

彩票中奖可以错过
但是10支修护霜100g
这个价格
我是真不确定还能多
恨不得找我闺蜜帮我来囤
✅

对象一抓一大把
珀芙研修护霜小样
错过就没了
修护维稳一把好手
敏肌直接锁死
✅

珀芙研！！
还得是你啊
放大招了
10 支小样正装量
到手只要这个价格
真的太香了
👍

对象一抓一大把
但珀芙研修护霜小样
真不是天天有
10支体验装
到手才这个价格
姐妹们别犹豫
这种活动错过可真要等下次了
👍

别怪我没提醒你
珀芙研修护霜小样
这波活动太香了
10支到手
够用好一阵子
关键价格还这么友好
刷到的先薅再说

对象可以慢慢找
珀芙研修护霜小样
错过真的要拍大腿
10支体验装
到手才这个价
用过的姐妹都知道
这种活动不是天天有
看到赶紧冲！

对不起了珀芙研
5折券我抢到了

#珀芙研 #修护霜 #护肤 #保湿 #好皮肤养出来`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} | ${c.content.slice(0,24).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/xiuhuaxiao_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/xiuhuaxiao_seed.json')
