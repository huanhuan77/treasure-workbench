import { parseBulkCopies } from './src/utils/helpers.js'
import { writeFileSync } from 'fs'

const raw = `珀芙研 油敏霜

用过珀芙研的姐妹们
都知道它家的油敏霜
现在只要这个价！
恨不得找全家人来帮我买
✅

一代人有一代人的鸡蛋要抢‼️
球球你了
原先大几百的价格
现在到手居然才这个价格
恨不得找我所有闺蜜来薅
✅

油敏肌！别再乱涂面霜了！
试试珀芙研这个屏安油敏修护霜
真的太懂我们了！
又油又敏、泛红长痘、毛孔粗大
用它就对了
控油、疏通、舒缓、修护一步到位
✅

早上涂完到下午
脸都还是清清爽爽的
油皮姐妹听我的
珀芙研屏安霜
让你知道 什么叫"哑门永存"
✅

油敏肌别再乱用面霜啦！
快试试这个
珀芙研屏安油敏修护霜
一瓶=控油+疏通+舒缓+修护
脸蛋水润又细腻
素颜都敢直接怼原相机了！

26块奶茶我犹犹豫豫
这个价的珀芙研油敏霜
我一次买3瓶！
不为别的 就为了夏天
和crush去海边素颜也能打

好消息：
本来只想用它保湿
没想到修护敏敏还很牛
坏消息：
素颜出门被追着要vx

油敏肌姐妹👭
千万别染上这玩意
脸又油又敏爱闹小脾气的
越用它越爽
珀芙研屏安油敏修护霜
早晚随便涂一涂
好皮肤养出来!

#油敏霜 #珀芙研 #护肤 #好皮肤养出来 #修护霜`

const copies = parseBulkCopies(raw)
console.log('解析条数:', copies.length)
copies.forEach((c,i)=>{
  console.log(`#${i+1} hasOrder=${c.hasOrder} used=${c.used} | ${c.content.slice(0,24).replace(/\n/g,' ')}`)
})
writeFileSync('/tmp/youmin_seed.json', JSON.stringify(copies, null, 2))
console.log('写入 /tmp/youmin_seed.json')
