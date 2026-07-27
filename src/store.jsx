import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { DEFAULT_SENSITIVE_WORDS, generateTitle, generateTopics } from './utils/copyGenerator'
import { todayStr } from './utils/helpers'

const StoreContext = createContext(null)

const STORAGE_KEY = 'blogger_workbench_data_v1'
const VERSION_KEY = 'blogger_workbench_version'
const CURRENT_VERSION = '14'


// 植研加睫毛胶水：用户整理后内置文案（thumb-up=出单，check=用过；末 # 行为指定话题
const jiemaoSeed = [
  { content: '我勒个豆！\n植研加不愧是你啊\n运动暴汗一整天到晚上还没掉\n还是无甲醛 不辣眼\n到底谁还没用上啊', hasOrder: true, used: true, topics: [] },
  { content: '植研加！\n你的权威我后知后觉\n运动暴汗到刘海滴水\n睫毛还是牢牢扒在眼睛上\n还是无甲醛 不辣眼\n求别停产 我会一直用', hasOrder: false, used: true, topics: [] },
  { content: '男朋友说"眼妆好美"\n我就明白这睫毛胶水没白用\n假睫毛用它随便一刷\n爆哭一整天都不会掉\n无甲醛不辣眼\n求别停产 我会一直用', hasOrder: false, used: true, topics: [] },
  { content: '求别停产🥺！我会一直用\n跟crush看电影\n爆哭都没掉\n我就知道！\n植研加胶睫毛胶水我买对了', hasOrder: true, used: true, topics: [] },
  { content: '闺蜜问我"眼睛怎么闪闪"\n我内心猛地 那当然啦\n不枉我用的植研加星空胶假睫毛胶水\n自带细闪是我的小心机', hasOrder: true, used: true, topics: [] },
  { content: '朋友问我是不是种睫毛了\n我就知道这款\n植研加假睫毛胶水选对了\n无甲醛还粘得牢\n新手随便涂涂都像妈生睫~', hasOrder: true, used: true, topics: ['#植研', '#植研加睫毛胶', '#睫毛胶水', '#平价彩妆', '#好物推荐'] },
].map((c, i) => ({
  id: 'p_jiemao_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '植研加睫毛胶水', '植研加', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '植研加睫毛胶水', '植研加', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// olly女维：用户整理后内置文案（thumb-up=出单，check=用过；末 # 行为指定话题
const ollySeed = [
  { content: '露思的眼光还是太超前了\n也没人告诉我女维这么🐮啊\n这才几天\ncrush以为我住小韩', hasOrder: true, used: true, topics: [] },
  { content: '没人懂吗\n人整体的光泽感\n才是最显贵的\n💇‍♀️👨‍🦲', hasOrder: false, used: true, topics: [] },
  { content: '你一句"好美"\n我就知道跟着露思买对了\n随便吃吃\n我勒个逗\n闺蜜以为我背着她偷偷飞小韩', hasOrder: true, used: true, topics: [] },
  { content: '没早睡没擦粉\n只是吃对东西了而已\n太快了呀', hasOrder: false, used: true, topics: [] },
  { content: '你的一句"漂亮了"\n就知道我的坚持没有白费\n17合1成份巨顶\n美国原装进口之前挺贵\n现在活动一盒30粒才啥价啊', hasOrder: false, used: true, topics: [] },
  { content: '你一句"老钱风"\n我就知道OLLY买对了\n老钱的精髓就是\n💇‍♀️💅👨‍', hasOrder: false, used: true, topics: ['#olly', '#olly女维', '#女性复合维生素', '#olly懂你漂亮做自', '#olly懂你好好养自'] },
].map((c, i) => ({
  id: 'p_olly_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, 'olly女维', 'OLLY', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, 'olly女维', 'OLLY', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 珀芙研冷膜：用户整理后内置文案（thumb-up=出单，check=用过；末 # 行为指定话题
const lengmoSeed = [
  { content: "你一句 “脸蛋又泛红起皮”\n转头我开始用珀芙研冷膜\n肌肤一下子就舒缓安定下来\n皮肤匀净舒展 状态稳的一批\n现在 Crush 总忍不住凑近多看几眼", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "可惜你上妆总是卡粉不服帖\n不懂这个珀芙研冷膜有多好用！\n每晚睡前厚厚敷一层\n小脸摸起来软嫩又透亮\n素颜简单涂个口红就能从容出去", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "男友一句 “你脸怎么总是泛红敏感”\n我就果断入手了这珀芙研冷膜\n每天睡前坚持厚敷修护\n素颜近距离凑近看\n皮肤嫩到别人都以为偷偷打了底", hasOrder: false, used: false, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "拜见珀芙研大王\n我将永远追随你\n脸不红了也不烫了\n还一整个水灵灵的💦\n素颜出门都被夸好呀", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "没人出来管管这个\n珀芙研舒缓冷膜嘛？\n睡前厚涂\n皮肤干燥泛红被治了\n素颜出门被怀疑抹了粉\n珀芙研还得是你👍", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "懒人熬夜党狂喜！！\n睡前厚厚涂一层\n第二天小脸又嫩又润\n谁能看出我熬了大夜\n跟朋友出门都以为我最近早睡早了", hasOrder: false, used: false, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "皮肤好的人共情不了…\n一换季小脸又干又红又敏\n自从用了珀芙研舒缓修护冷膜\n脸蛋被养的也不闹小脾气了\n朋友见了都给我要链接呀", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "知道 PDRN 的姐妹！\n都知道卖的多贵\n珀芙研你可倒好\n到手半斤才这个价格\n那我真的要涂全身\n来报答你‼️", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "珀芙研冷膜真有你的\n一罐到手这个价格了\n我这全身涂都不心疼\nPDRN 快到皮肤里来！！啊", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "珀芙研你是疯了吧\n之前大几百买的冷膜\n现在才这个价\n能不能退我点💰呀", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "我也不想炫耀啊\n但是男朋友已经送我入春\n第一罐冷膜了\n那你呢\n不会还在用清水洗脸吧", hasOrder: false, used: false, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "不用去小韩\n也可以实现 PDRN 自由\n珀芙研的冷膜\n真有你的\n这个价格\n还能到手半斤！！！！", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "急急急！！\n我要为珀芙研冷膜疯狂尖叫！\n最近风大天冷脸被刮得又干又疼\n敷了两天恢复了！！\n皮肤肉眼可见的透亮\n日常维稳嘎嘎牛！", hasOrder: false, used: false, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "为这款冷膜疯狂打 call！！🐷\n换季脸干起皮粗糙\n抹在脸上像冰淇淋🍦\n用完皮肤又嫩又亮\n关键价格超香！\n天天敷都不心疼！", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "报一丝\n以后合照不用 p 我了\n我已经不是起皮糙妹了\n睡前厚敷 15 分钟\n脸蛋嫩的嘞\n素颜都敢原相机拍了", hasOrder: false, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "可惜换季你脸不红不敏\n不懂这个冷膜的含金量\n每晚随便敷敷\n我勒个豆！\n素颜出门都被怀疑抹了粉", hasOrder: true, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "可惜你脸不干不起皮\n不懂这珀芙研大白罐有多香！\n白天薄涂维稳 晚上厚敷急救\n脸蛋水润润的\n素颜涂个口红就能出门\n谁看了都问是不是偷偷打底了！", hasOrder: true, used: true, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
  { content: "面膜真的很贵吗\n用空一罐又一罐\n99到手半斤多\n从熬夜蜡黄脸到现在这样\n里面的甜只有我自己知道", hasOrder: false, used: false, topics: ["#珀芙研","#冷膜","#面膜","#护肤","#好皮肤养出来"] },
].map((c, i) => ({
  id: 'p_lengmo_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '珀芙研冷膜', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '珀芙研冷膜', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 珀芙研闪光棒：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const shanguangSeed = [
  { content: "被珀芙研次抛狠狠拿捏了！\n每天早晚一支\n脸蛋细腻又透亮\n素颜都被夸皮肤状态好！\n30支才这个价格\n恨不得安利给所有姐妹", hasOrder: false, used: true, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "大数据别再藏着这款精华了\n珀芙研闪光棒次抛精华\n也太好用了！\n关键到手 30 支才这个价！\n早晚随便涂涂\n素颜出门都抗老", hasOrder: false, used: true, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "珀芙研聚光次抛\n小小的一支\n却藏着大大的能量！\n早晚一支，温和养护肌肤\n脸蛋慢慢变得细腻紧致\n素颜的皮肤状态真的骗不了人～", hasOrder: false, used: false, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "我严重怀疑里面加了什么黑科技\n熬夜松垮粗糙脸\n晚上随便用用\n皮肤巨细腻紧致嘭嘭弹\n素颜出门还被怀疑抹粉了", hasOrder: false, used: true, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "男友一句 “你好白”\n我就再也没换过\n熬夜脸黄真的太显脏了！\n全靠珀芙研聚光精华次抛救我\n熬大夜也不暗沉发黄\n素颜自带透亮感\n早八素颜出门也能轻松拿捏", hasOrder: false, used: true, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "男朋友一句 “你的脸好嫩”\n我就知道珀芙研的闪光棒用对了\n水润质地不黏腻贼好吸收\n珀芙研的精华我真的超级爱\n现在素颜出门男朋友还以为我抹了粉\n趁着这波活动赶紧冲", hasOrder: false, used: false, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "只有用过才知道！\n珀芙研聚光精华次抛的含金量\n 早晚一支，紧致嘭弹 \n素颜出门都被 \n脸好紧好嫩、年轻好几岁了", hasOrder: false, used: true, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "珀芙研闪光棒真的有点牛\n随便涂一涂\n就针对脸上的各种颜色真的手拿把掐\n关键到手 30 支才这个价\n趁着这波活动赶紧冲", hasOrder: false, used: true, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "只有用过才知道！\n珀芙研聚光精华次抛的含金量\n 早晚一支，紧致嘭弹 \n皮肤状态看起来更在线\n素颜出门都更有底气", hasOrder: false, used: true, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
  { content: "谁懂啊😭\n被珀芙研次抛狠狠圈粉了\n每天早晚一支\n简单又方便\n现在护肤步骤都离不开它\n难怪身边姐妹都在囤", hasOrder: false, used: false, topics: ['#珀芙研', '#次抛精华', '#精华', '#护肤', '#好皮肤养出来'] },
].map((c, i) => ({
  id: 'p_shanguang_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '珀芙研闪光棒', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '珀芙研闪光棒', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 维特健灵祛湿轻：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const weiteSeed = [
  {
    "content": "男人没了可以再找\n但维特健灵祛湿轻这个活动\n错过真的没了！\n3瓶抵正装，性价比拉满\n港台女明星的��生信息差\n打工人直接闭眼囤！",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "谁懂啊！\n这波价格直接杀疯了\n三瓶正装到手\n感觉像捡了大便宜✨\n再也不用和回南天的沉重感死磕了",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "放弃冰☕\n跟随维特健灵水水丸\n终于读懂了跟风的原因\n想到夏天👗👙自由\n就忍不住hhh😜",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "三瓶到手才这个价\n恨不得找我所有闺蜜👭\n来帮我薅\n回南天的苦，\n我是一点都不想吃🙂",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "男朋友分手了可以再找\n但是维特健灵3瓶抵正装量\n到手才这价！\n错过可真没了…\n港台女明星的信息差\n懂得都懂！",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "报一丝🤚\n下个月就 40度了\n我们👙见",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "可惜你没用过\n不然你根本不知道\n这三个字的含金量\n老祖宗严选真的有点\n东西在啊……谁懂\n这也没吃多久……",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "青天大老爷啊\n第一次用，谁能想到\n给我这么大的惊喜\n好害怕它会消失\n三瓶到手正装量这个价\n恨不得找我所有闺蜜👭\n来帮我薅...\n香港品牌 维特健灵水水丸",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "冷知识:\n潮女别再一味喝薏米水\n试试香港大品牌\n维特健灵 水水丸\n断了饭也不敢把你断了！",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "沃趣港女的嘴也太严了吧！\n不要等到回南天再后悔！\n到手3瓶抵正装量\n这一波不薅我是真的睡不着！",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "你们继续喝薏米水吧\n我有它就够了😎\n香港大品牌就是🐮~",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  },
  {
    "content": "你永远可以相信\n大馋丫头们的选品能力\n只要它不停产我就一直回购\n马上夏天了\n我要把之前输的都赢回来‼️",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#维特健灵",
      "#好物推荐",
      "#亲测分享",
      "#强烈推荐"
    ]
  }
].map((c, i) => ({
  id: 'p_weite_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '维特健灵祛湿轻', '维特健灵', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '维特健灵祛湿轻', '维特健灵', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 褪黑素：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const tuimelSeed = [
  { content: "坐了10小时飞机...\n看到旁边帅哥睡的好香\n问了一下才知道.....\n原来是美国进口OLLY\n一点都不带犹豫了...\n晚上来了一觉 好家伙\n熬夜党必备啊！牛啊！", hasOrder: true, used: true, topics: ["#维特健灵","#宁心","#好好休息","#休息","#好物分享"] },
  { content: "可惜你没试过\n不然你根本不知道\n维特健灵宁心的含金量\n白天忙忙碌碌\n晚上就想给自己一点松弛感\n睡前那一刻\n真的太治愈了", hasOrder: false, used: true, topics: ["#维特健灵","#宁心","#好好休息","#休息","#好物分享"] },
  { content: "成年人的一天\n从⏰开始\n也该有个温柔的结束\n现在每天睡前\n都会记得打卡维特健灵宁心\n把照顾自己变成一种习惯", hasOrder: false, used: true, topics: ["#维特健灵","#宁心","#好好休息","#休息","#好物分享"] },
  { content: "宁心➕早点放下手机\n慢慢找回属于自己的生活节奏\n维特健灵宁心👍\n一晚10h昏迷级\n睡个好觉真的不难", hasOrder: true, used: true, topics: ["#维特健灵","#宁心","#好好休息","#休息","#好物分享"] },
  { content: "香港老品牌👍\n晚上强制关机 睡爽了！！\n牛的，一晚=10+⏰\n没再半夜醒了\n香港30年大品牌👍\n晚上强制关机 睡爽了！", hasOrder: false, used: true, topics: ["#维特健灵","#宁心","#好好休息","#休息","#好物分享"] },
  { content: "我不想有坏情绪\n我想早点睡…\n世界上有两种快乐\n开心的笑和睡个好觉\n愿你两者皆", hasOrder: false, used: true, topics: ["#维特健灵","#宁心","#好好休息","#休息","#好物分享"] },
  
].map((c, i) => ({
  id: 'p_tuimel_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '褪黑素', '', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '褪黑素', '', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// PH地中海咖啡：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const coffeeSeed = [
  { content: "这个世界什么都是假的\n只有PH咖啡的权威是真的吗", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "\"忍住，我把美食忍住\"\n加油，老天爷", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "拜见PH地中海黑咖！\n马上40度☀️\n小女子能不能穿上\n漂亮👗👙📷就靠您了🙏", hasOrder: false, used: false, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "本来以为是智商税…\n被闺蜜按头安利的PH地中海咖啡\n喝了才知道\n明星私藏的懒人好物是真的香！\n自律入✅\n代餐入✅\n爱出片入✅\n太快了呀", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "别再一天天的纠结\n他爱不爱你\n下个月就 30 度了\n给我做💪硬气的女人\n姐先冲了", hasOrder: true, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "PH 你小子真有点东西\n这速度真的绝！\n难怪大半个娱乐圈都在喝\n1 杯等于 1/8 个苹果\n便捷包装，随时随地喝", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "虽然夏日☀️的较量\n已经开始了\n但我一点也不慌张\n我有它给我兜底", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "我的老天\n ph 地中海咖啡\n真有点东西\n太快了\n妈妈以为我一个人\n没有好好吃了", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "算了\n跟你们这帮 2 位数的人\n说不清楚\n我先干为敬了\n这个夏天我也要赢", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "真抱一丝啊\n下个月就 30 度了\n我得争口气\n做朋友圈最装的女人", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "咖啡机跟着我也是倒霉\nph 地中海黑咖的权威\n我真的后知后觉！\n下个周就 35 度了\n接下来我要狠狠冲", hasOrder: false, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "你永远可以相信\n大馋丫头们的选品能力\n只要它不停产我就一直回购\n马上夏天了\n我要把之前输的都赢回来‼️", hasOrder: true, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "第一批受害者出现了\n太太太筷了\n我妈都以为我\n在外吃不上饭", hasOrder: true, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  { content: "对不起了PH咖啡\n5折券我抢到了\n这个夏天我要惊艳所有人", hasOrder: true, used: true, topics: ['#PH地中海咖', '#咖啡', '#黑咖', '#好喝不贵'] },
  
].map((c, i) => ({
  id: 'p_coffee_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, 'PH地中海咖啡', 'PH', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, 'PH地中海咖啡', 'PH', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 珀芙研修护霜正装：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const xiuhuazhengSeed = [
  { content: "脸部泛红入\n换季干痒入\n日常维稳入\n屏障受损了", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "可惜你脸不起皮不粗糙\n不懂珀芙研修护霜的威力\n早薄涂晚厚敷\n皮肤水嫩透亮\n素颜出门也超有底气！", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "可惜你脸不红不敏\n不懂珀芙研 728 修护霜的含金量\n红脸灭火器🧯\n温泉水修护💦\n厚敷急救 薄涂维稳\n水润软嫩好状态\n素颜出门都被夸抹了粉", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "脸干燥起皮的\n状态不稳的姐妹\n珀芙研修护霜来了\n早上 晚上坚持用\n舒缓又水润💧\n出门被误以为做了项目", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "之前犹豫没入手的\n现在这个价位真的别错过\n坚持早晚使用\n素颜状态好到常被误会化妆", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "珀芙研你真的懂我们\n终于把修护霜价格降下来了\n熬夜暗沉蜡黄起皮的姐妹\n一定要去试试它", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "我也不想买啊\n可是今天它是这个价哎\n一半的💰\n能买到正装量\n错过真的就没有了", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "最近天天吹空调\n脸总感觉干巴巴的\n还好有珀芙研修护霜\n洗完脸涂一层\n舒舒服服结束一天\n这才是夏天该有的仪式感呀", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "夏天皮肤又开始闹情绪？\n对自己好点吧！\n珀芙研修护霜\n洗完脸直接涂\n软软嫩嫩超舒 \n爱自己从稳住皮肤开始！🌸呀", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "求求干敏皮焊死这个面霜\n换季别人都在爆皮\n你偷偷在水灵灵\n睡前厚涂 = 给脸泡温泉\n早上起来嫩到发光\n我敏肌的男友都忍不住偷用了", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "算了 和你们小脸\n不干不敏 不爱闹小脾气的说不清楚\n就这个珀芙研舒缓保湿修护霜\n太懂敏感肌了！\n换季泛红干痒全拿捏！\n早晚随便涂涂小脸嫩嫩滴\n素颜出门都被要护肤攻略～", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "干敏皮的本命面霜找到了！\n别人换季又红又干还掉皮\n而我早上薄涂、晚上厚敷\n脸蛋子养得又软又嫩\n珀芙研给的底气真拿得出去", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "珀芙研你搞什么？\n这个保湿修护霜刚收到\n就刷到官旗现在\n拍一单 5才这个价！\n恨不得 找所有闺蜜来帮我薅！！！", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "没人跟我说\n珀芙研送这么多小样!", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "不是\n珀芙研你告诉我\n同样 100g 的修护霜\n才多少钱？\n已经喊上 所有闺蜜来抢了", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "干敏肌姐妹快冲！\n这款修护霜真的太懂敏感肌了！\n换季泛红干痒全拿捏\n早晚薄涂厚敷\n脸蛋子嫩到不行\n素颜都被追着要护肤攻略~", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "可惜你小脸不红不敏\n不懂珀芙研修护霜的含金量\n每晚睡前敷一敷\n我勒个豆！\n脸蛋光滑又水嫩\n素颜出门都被误以为化了妆", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  
].map((c, i) => ({
  id: 'p_xiuhuazheng_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '珀芙研修护霜正装', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '珀芙研修护霜正装', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 绵绵的羊小莓好湿巾：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const mianmianSeed = [
  { content: "求大数据把这条推给热恋期的女生\n记住了❤️主动为你考虑清洁的男生\n一定比只知道买小雨伞的靠谱\n要分清“对他好”和“对你好”的区别\n爱人如养花\n爱你的人会主动照顾你为你考虑", hasOrder: false, used: true, topics: ["#绵绵的羊#湿巾","#清洁湿巾","#女生必备","#清洁卫生"] },
  { content: "一代人有一代人的鸡蛋要抢😂\n哈哈啊哈哈\n这个价跟白捡有什么区别！", hasOrder: true, used: true, topics: ["#绵绵的羊#湿巾","#清洁湿巾","#女生必备","#清洁卫生"] },
  { content: "钱没了可以再赚\n但是绵绵的羊小莓好湿巾\n十几块就到手 2 包 20 片🥰\n要是错过就真的没有了啊闺蜜们", hasOrder: false, used: true, topics: ["#绵绵的羊#湿巾","#清洁湿巾","#女生必备","#清洁卫生"] },
  { content: "在乎女生需求的品牌真的很加分\n绵绵的羊你真行..😭\n这个女生清洁湿巾\n并不是只能和男朋友在一起的时候用！！\n来姨妈时用它\n清洁干掉的污渍\n或者清洁日常分泌物都好用\n淡淡的蔓越莓清香\n很干净很卫生", hasOrder: true, used: true, topics: ["#绵绵的羊#湿巾","#清洁湿巾","#女生必备","#清洁卫生"] },
  { content: "下周异地恋见面\n准备这么多应该够吧", hasOrder: false, used: true, topics: ["#绵绵的羊#湿巾","#清洁湿巾","#女生必备","#清洁卫生"] },
  
].map((c, i) => ({
  id: 'p_mianmian_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '绵绵的羊小莓好湿巾', '绵绵的羊', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '绵绵的羊小莓好湿巾', '绵绵的羊', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 百草园清清片：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const qingqingSeed = [
  {
    "content": "拜见清清片大王  啥原理不知道 总之少走30年弯路",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "也没人告诉我 这个清清片这么猛啊  那我之前走过的弯路都算什么",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "拜见清清片大王 小的出差就靠你了",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "时间：睡前 谁懂啊 💩一座小山的快乐",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "拜见清清片大王  时间：睡前 谁懂啊 💩一座小山的快乐",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "我滴老天奶呀\n比德芙还丝滑\n幸好在商场里\n全清🈳了",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "时间:大餐后\n结果:巨粑💩\n总结:爽翻了!!😳",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "也就吃了两颗\n三天的库存都给清了\n爽翻了😎\n清清片还挺权威的",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "我的老天奶!\n是什么原理啊!\n再也不用在厕所蹲到腿麻了",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "清清片你是要考研吗\n清库存这么🐮\n🚽都懵了",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "丝滑到怀疑人生\n3天库存清了\n给商场🚽整懵了",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "也就吃了2颗\n3天的库存全给整出去了!!\n清清片你还是太权威了",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "我勒个青天大老爷!!\n这可是3天的库存啊\n全出去了!爽",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "本来清清片已经够猛了\n再加上东方🍂\n谁懂啊\n我妈以为我天天吃草",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "替你们试过了\n也就吃了两粒\n要我说清库存还得是你\n你真牛!",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "下班之后\n给身体来点\"松绑\"\n💩到临头\n是最踏实的小确幸",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "夏天倒计时了\n赶紧给自己安排上了清清片\n➕干净饮食\n一个月后\n我将加入更权威的圈子!",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "谁懂啊\n不知道的还以为\n我荒野求生呢!\n我将进入更权威的圈子",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "你永远可以相信\n大馋丫头们的选品能力\n只要它不停产我就一直回购\n马上夏天了\n我要把之前输的都赢回来‼️",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "清清片你别太离谱\n我妈以为没钱吃饭了\n真的夯爆了!!",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  },
  {
    "content": "你一句是不是断粮了?!\n就知道我的努力没有白费\n全绿的成分\n你看看现在才啥价啊",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#清清片",
      "#吃货必备",
      "#好物推荐",
      "#亲测分享",
      "#百草园清清片"
    ]
  }
].map((c, i) => ({
  id: 'p_qingqing_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '百草园清清片', '百草园', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '百草园清清片', '百草园', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 珀芙研油敏霜：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const youminSeed = [
  { content: "用过珀芙研的姐妹们\n都知道它家的油敏霜\n现在只要这个价！\n恨不得找全家人来帮我薅", hasOrder: false, used: true, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  { content: "一代人有一代人的鸡蛋要抢‼️\n球球你了\n原先大几百的价格\n现在到手居然才这个价格\n恨不得找我所有闺蜜来薅", hasOrder: false, used: true, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  { content: "油敏肌！别再乱涂面霜了！\n试试珀芙研这个屏安油敏修护霜\n真的太懂我们了！\n又油又敏、泛红长痘、毛孔粗大\n用它就对了\n控油、疏通、舒缓、修护一步到了", hasOrder: false, used: true, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  { content: "早上涂完到下午\n脸都还是清清爽爽的\n油皮姐妹听我的\n珀芙研屏安霜\n让你知道 什么叫“哑门永存", hasOrder: false, used: true, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  { content: "油敏肌别再乱用面霜啦！\n快试试这个\n珀芙研屏安油敏修护霜\n一瓶=控油+疏通+舒缓+修护\n脸蛋水润又细腻\n素颜都敢直接怼原相机了！", hasOrder: false, used: false, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  { content: "26块奶茶我犹犹豫豫\n这个价的珀芙研油敏霜\n我一次买3瓶！\n不为别的 就为了夏天\n和crush去海边素颜也能打", hasOrder: false, used: false, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  { content: "好消息：\n本来只想用它保湿\n没想到修护敏敏还很牛\n坏消息：\n素颜出门被追着要vx", hasOrder: false, used: false, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  { content: "油敏肌姐妹👭\n千万别染上这玩意\n脸又油又敏爱闹小脾气的\n越用它越爽\n珀芙研屏安油敏修护霜\n早晚随便涂一涂\n好皮肤养出来!", hasOrder: false, used: false, topics: ['#油敏', '#珀芙研', '#护肤', '#好皮肤养出来', '#修护'] },
  
].map((c, i) => ({
  id: 'p_youmin_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '珀芙研油敏霜', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '珀芙研油敏霜', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 益美滋润喉糖：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const runhouSeed = [
  { content: "听说抽完🚬\n吃润喉糖对嗓子好\n就给你买了益美滋无糖清润糖", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "爱大概就是知道我上课\n如果大声讲话会嗓子不舒服\n所以给我的润喉糖就没断了", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "爱从来不是克制\n知道他爱抽🚬\n所以给他买的益美滋无糖清润糖\n从来没断过~", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "可惜你的嗓子\n不干不痒不卡弹\n体会不到这个\n益美滋无糖清润糖的含金量\n吃一颗就有茅塞顿开的感觉\n之前买的胖大海\n我果断都扔了", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "不说爱\n但车里、办公室、家里\n他随手能摸到的润喉糖从没缺过", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "知道我无辣不欢\n隔天嗓子会很不舒服\n马上给我准备了润喉糖\n我恨不得向全世界炫耀", hasOrder: false, used: false, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "还好车上有它\n每次约会前来一颗\n嘴巴香香甜甜真的很加分\ncrush忍不住凑过来多亲几口\n谁能拒绝一个樱花花香的嘴唇💋呀", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "我惊了！\n就含了两颗\n对象说连呼吸都带着樱花味\n追着要贴贴啊", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "吃完螺蛳粉\n被人追着问嘴里的\n樱花花香哪来的\n谁会告诉你是这个无糖清润糖\n连打啵啵都是自带花香🌸", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "你一句\"嘴巴怎么老是香香的\"\n我就知道\n益美滋口气清新薄荷糖没白囤！\n随便含一颗\n清清凉凉的张嘴都飘着香味\ncrush都忍不住靠近", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "嘴巴香香的小秘诀\n随时随地含一颗\ncrush见面每次都忍不住亲亲", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "买给平时话多\n还\"云中吐雾\"的枕边搭子！\n终于不用再享受\n他的\"榴莲嘴\"", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "你一句\"嘴巴是不是喷香水了\"\n我就暗爽这个清润糖买对了\n吃完打啵啵🥰都是香香的\n办公室同事追着我要链接\n老板以为我天天生啃鲜花", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "有人嫌你抽🚬臭\n有人给你买润喉糖\n怕你嗓子不舒服", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "有人嫌弃你抽🚬臭\n有人悄悄备好润喉糖\n只惦记你嗓子干不舒服\n有人嫌弃你抽🚬\n唯独有人心疼你嗓子干\n常备润喉糖\n温柔藏在细节里", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "有人嫌你抽🚬一身臭味躲远\n有人默默备好润喉糖\n心疼你嗓子难受\n旁人只反感你抽🚬的味道\n真心人惦记你喉咙干\n随身带润喉糖\n清凉舒爽，呵护你的嗓子", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  { content: "总有人嫌弃你抽🚬味道难闻\n真正疼你的人\n只会怕你抽🚬伤嗓子\n默默备好润喉糖", hasOrder: false, used: true, topics: ['#益美', '#清润糖', '#口气清新', '#润喉糖', '#益美', '#香体', '#薄荷', '#约会神器'] },
  
].map((c, i) => ({
  id: 'p_runhou_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '益美滋润喉糖', '益美滋', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '益美滋润喉糖', '益美滋', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 洁比兔洗护液：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const xihuSeed = [
  {
    "content": "可惜你不是热恋期\n不懂这个的含金量\n\"战斗前\"用它\n香香甜甜的柑橘味\ncrush恨不得抱着啃\n被子里都是甜丝丝的",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "可惜你不是热恋期\n不懂洁比兔洗护液的含金量\n洗完香香的\n生理性喜欢buff叠满\n男朋友黏人程度10000000%",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "昨晚我坐在他腿上\n他突然凑过来闻我\n当时我心一紧\n结果他说我好香\n谢谢你洁比兔\n甜甜的恋爱也轮到我了🥰",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "原来生理性喜欢\n也可以作弊\n就这个洁比兔益生菌洗护液\n淡淡蔓越莓香\n男朋友问怎么还喷香水\n真连香水钱都省了",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "啊啊啊啊啊！！\n洁比兔你真牛\n恋爱期每天都在用的\n益生菌洗护液\n每天晚上用它洗一洗\n不仅干净还很好闻\n那天老公竟然问\n\"你怎么到处都是香香的\"\n这个味道用一次都会爱上！！",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "男朋友不知道\n我们女孩子心里要有点数啊！！\n运动完女生是不能直接用清水冲的\n真的建议我们女孩子\n都让对象去买这个\n洁比兔家的益生菌洗护液\n每一瓶里面都含有100亿益生菌\n刚刚用它洗完清清爽爽真的巨舒服！！",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "一个烫知识!!\n私处护理不能只用清水清洁\n就这个洁比兔益生菌洗护液\n一瓶里面\n就有100亿益生菌\n守护着我们女生\n温和不刺激\n用完安全感拉满!",
    "hasOrder": false,
    "used": true,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "你一句\"有点味儿\"\n我赶紧下单洁比兔蔓越莓洗液\n随便洗洗\n就是甜甜的蔓越莓味\n男友也忍不住夸\n这个真的有点东西..",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "他突然躺我腿上 \n我下意识想躲\n结果他说:宝宝你好香\n谢谢洁比兔\n终于不用再尴尬了!\n洗完香香润润 清爽又自信~",
    "hasOrder": true,
    "used": true,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  },
  {
    "content": "你说我睡过的被子好香\n我再也没换过\n闻一次 爱一辈子",
    "hasOrder": false,
    "used": false,
    "topics": [
      "#洁比兔",
      "#女生必备",
      "#卫生清洁",
      "#亲测分享",
      "#好物推荐"
    ]
  }
].map((c, i) => ({
  id: 'p_xihu_c' + (i + 1),
  content: c.content,
  title: c.title || generateTitle(c.content, '洁比兔洗护液', '洁比兔', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '洁比兔洗护液', '洁比兔', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

// 珀芙研面膜：用户整理后内置文案（thumb-up=出单，check=用过；仅末尾标记生效，行内表情保留；末尾 # 行为指定话题
const mianmoSeed = [
  { content: "可惜你脸不干不敏\n不懂这个修护面膜有多牛！\n每晚随便敷一敷我勒个豆！\n小脸巨嫩巨水灵\n现在这个价到了 20 片！\n这羊毛不薅真亏大了！啊", hasOrder: false, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "知道你不缺面膜\n但珀芙研这波操作真的\n不得不囤啊～\n每周敷个两三次\n我勒个豆\n皮肤巨嫩巨水灵💧\n素颜补个口红就出门了", hasOrder: false, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "舒缓 + 修护 + 胶原\n我勒个豆 珀芙研你是要\n考研吗？！\n日常随便敷一敷\n冰冰凉凉的很舒服\n敷完小脸稳得一批\n巨嫩巨水灵的", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "“对不起了前男友\n下次遇见\n我会高傲的不认识你了", hasOrder: false, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "皮肤不稳定？\n你可以永远相信\n珀芙研三型胶原蛋白面膜\n敷完又嫩又光滑\n皮肤状态越来越稳定", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "皮肤闹情绪的时候\n我都会想到它\n珀芙研三型胶原蛋白面膜\n冰冰凉凉敷一片\n用完脸蛋舒服不少\n夏天真的离不开", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "珀芙研你家不想挣钱了啊\n之前花好几百买的\n舒缓修护面膜\n现在官旗大促做活动\n到手才这价？！\n恨不得找 800 个妹妹来抢！", hasOrder: false, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "我妈总说脸干得绷\n我就偷偷给她囤了\n珀芙研胶原蛋白面膜\n天天叮嘱她别忘了敷！\n长大后换我来宠你🥰\n哪怕隔着千里\n也要让你的脸水水嫩嫩", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "别等皮肤变成核桃以后\n才想起来补水\n夏天会惩罚\n每一个不补水的姐妹\n日常敷一敷\n直接喝饱了", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "好你个珀芙研胶原面膜\n竟然背刺我\n之前一件 99 的时候舍不得买\n现在这个价格不要卷！\n姐妹圈都在狂囤\n连夜下单，怕你断货", hasOrder: false, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "我是真没想到！！\n珀芙研的面膜也出来搞活动了\n之前买的那么贵\n现在 99 到手 30 片\n错过真的就没了", hasOrder: false, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "珀芙研 30/30 片！\n珀芙研 30/30 片！\n珀芙研 30/30 片！\n珀芙研 30/30 片！\n珀芙研 30/30 片！\n早上敷！晚上敷！\n提亮嫩肤嘎嘎的", hasOrder: true, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "珀芙研我真的泪目\n我刚 35 块 6 片面膜\n现在 99 到手 30 片\n这羊毛谁不心动啊！！", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "可惜你的脸\n不会闹情绪\n不干也不起皮\n不懂珀芙研补水面膜的含金量\n随便一敷\n这脸蛋又细腻又稳定\n赶紧去薅羊毛", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "你一 \"不抹粉了\"\n我就知道珀芙研面膜用对了\n日常随便敷敷\n素颜都被夸亮到反光", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "面膜真的很贵吗\n用空一盒又一盒\n99到手一斤多\n从熬夜蜡黄脸到现在这样\n里面的甜只有我自己知道", hasOrder: false, used: false, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  { content: "珀芙研你退我钱吧！\n现在这个价到手这么多\n我真的哭😭", hasOrder: false, used: true, topics: ["#珀芙研","#面膜","#护肤","#补水","#好皮肤养出来"] },
  
].map((c, i) => ({
  id: 'p_mianmo_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '珀芙研面膜', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '珀芙研面膜', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

const doboSeed = [
  { content: "终于pu💩自由了\n🌳植物更安心\n再也不用带手机进 🚻了\n比德芙还丝滑~", hasOrder: true, used: true, topics: [] },
  { content: "时间：大餐后\n结果：巨💩\n总结：爽了!!", hasOrder: false, used: false, topics: [] },
  { content: "西梅西梅软糖\n算了吧，我选它\n三天的库存都给整🈳了\n太爽了", hasOrder: false, used: false, topics: [] },
  { content: "算了跟你们解释不清楚!\n就这个DOBO\n跟风买的我也没想到这么惊喜\n不好意思了朋友\n这个夏天我先赢了", hasOrder: false, used: false, topics: [] },
  { content: "NB!!\n三天的库存清了\n爽歪歪~", hasOrder: false, used: false, topics: [] },
  { content: "本来DOBO已经够猛了\n再加上东方🍂\n谁懂啊\n我妈以为我天天吃", hasOrder: false, used: false, topics: [] },
  { content: "抱一丝同学\n下个月就30度了\n我必须做最有种的女人", hasOrder: false, used: false, topics: [] },
  { content: "你一句是不是断粮吗!\n就知道我的努力没有白费\n全绿的成分\n你看看现在才啥价啊", hasOrder: false, used: true, topics: [] },
  { content: "距离夏天还有一个多月\n原本只是跟风吃的\nCrush见面第一句\n\"你应该没到90吧\"\n我就知道这把稳了", hasOrder: false, used: false, topics: [] },
  { content: "DOBO你别太离谱\n我妈以为我没钱吃饭了\n真的夯爆了!!", hasOrder: false, used: true, topics: [] },
  { content: "第一批受害者出現了\n太太太筷了\n我妈都以为我\n在外吃不上饭", hasOrder: true, used: true, topics: [] },
  { content: "夜宵不让我吃\n是不可能的\n还好我有清清片\n酷酷炫的快乐啊\n沒在怕的", hasOrder: false, used: true, topics: [] },
  { content: "求求商战千万別停\n一代人有一代人的鸡蛋要领\n被资本喂得不知天地\n为何物了", hasOrder: false, used: false, topics: [] },
  { content: "还好有饭搭子\n不然都体会不到\n放纵日的快乐\n根本没在怕的", hasOrder: false, used: true, topics: [] },
  { content: "真抱一丝啊\n马上30度了\n我要争气\n做朋友圈最装的女人", hasOrder: false, used: true, topics: [] },
  { content: "没想到控制不住\n自己的嘴👄\n饭前随便吃两片\n还真有惊喜", hasOrder: false, used: true, topics: [] },
  { content: "可惜你\n\"夏天不穿👗👙\"\n不懂燃燃片的含金量", hasOrder: false, used: false, topics: [] },
  { content: "我现在对谈恋爱没什么欲望\n只想在夏天\nSOU下来装一波大逼!", hasOrder: false, used: false, topics: [] },
  { content: "夏日倒计时\n还得是👟休\n主打一个效率\n这回👗我穿定了", hasOrder: false, used: false, topics: [] },
  { content: "拜见清清片大王\n马上30度了\n小的📷，就靠您了", hasOrder: false, used: true, topics: [] },
  { content: "我现在只有\n一个重要的主线任务\nsou下来装逼\nsou下来装逼\nsou下来装逼", hasOrder: false, used: true, topics: [] }
].map((c, i) => ({
  id: 'p_dobo_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, 'DOBO噗噗片', 'DOBO', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, 'DOBO噗噗片', 'DOBO', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

const xiuhuaxiaoSeed = [
  { content: "要不是只能买一单\n我能给你薅破产\n珀芙研真有你的\n小样正装量拿出来卖！啊", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "用过珀芙研的姐妹们\n都知道他家修护霜什么价\n现在小样正装量\n才这个价格\n你告诉我真的不薅嘛！啊", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "一代人有一代人的鸡蛋要抢\n啊哈哈啊哈哈哈～\n珀芙研真🐮\n这个价和白捡有什么区别！", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "四条腿的男人好找\n珀芙研10支修护小样\n只要这个价\n快点来薅！🥺\n", hasOrder: true, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "彩票中奖可以错过\n但是10支修护霜100g\n这个价格\n我是真不确定还能多\n恨不得找我闺蜜帮我来薅", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "对象一抓一大把\n珀芙研修护霜小样\n错过就没了\n修护维稳一把好手\n敏肌直接锁死", hasOrder: false, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "珀芙研！！\n还得是你啊\n放大招了\n10 支小样正装量\n到手只要这个价格\n真的太香啊", hasOrder: true, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "对象一抓一大把\n但珀芙研修护霜小样\n真不是天天有\n10支体验装\n到手才这个价格\n姐妹们别犹豫\n这种活动错过可真要等下次了", hasOrder: true, used: true, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "别怪我没提醒你\n珀芙研修护霜小样\n这波活动太香了\n10支到手\n够用好一阵子\n关键价格还这么友好\n刷到的先薅再睡", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "对象可以慢慢找\n珀芙研修护霜小样\n错过真的要拍大腿\n10支体验装\n到手才这个价\n用过的姐妹都知道\n这种活动不是天天有\n看到赶紧冲！", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  { content: "对不起了珀芙研\n5折券我抢到了", hasOrder: false, used: false, topics: ['#珀芙研', '#修护', '#护肤', '#保湿', '#好皮肤养出来'] },
  
].map((c, i) => ({
  id: 'p_xiuhuaxiao_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '珀芙研修护霜小样', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '珀芙研修护霜小样', '珀芙研', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

const jiebiwetSeed = [
  { content: `男朋友不知道~\n咱们心里也要有点数\n女生是不能用纸巾擦的\n真的建议所有女生都去\n让对象买这个洁比兔的\n蔓越莓益生菌清洁湿巾\n淡淡的蔓越莓香满满的\n精华99.9%的擦除率\n擦完可以放心倒头就睡`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `男朋友问“喷的什么香水”\n我滴妈!什么都没喷\n洁比兔!你真行\n满满的精华\n淡淡的蔓越莓越闻越上头\n99.9%的擦除率擦完到头就睡`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `男朋友不知道~\n咱们心里也要有点数\n女生日常可不能乱擦\n真的建议所有女生都去\n让对象入手\n洁比兔蔓越莓益生菌清洁湿巾\n淡淡蔓越莓清香超治愈\n满满精华柔软亲肤\n99.9%擦去率用完\n清清爽爽安心入睡😴`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `能贴心考虑到清洁的男人\n远比只会买小雨伞的靠谱\n你得分清对他好和对你好的不同\n被认真对待和被敷衍\n从来都是两种结局\n爱你的人会自觉照顾你~`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `🥰🥰突然发现\n女朋友一直在用的\n居然是洁比兔家的蔓越莓湿巾\n淡淡的蔓越莓清香\n女生是不能用普通干纸巾擦的\n真的建议所有女生都去用\n每次擦完都可以倒头就睡了💤`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `别再被"对你好"的假象骗了\n只知道买小雨伞的是敷衍\n主动给你备私护湿巾的\n才是真的为你着想爱你的人\n连细节都在说爱你`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `一句“你喷香水了’\n我就知道洁比兔的清洁湿巾\n用对了\n满满的精华和蔓越莓清香~\n真的建议所有女生都去用\n每次擦完都可以倒头就睡了💤`, hasOrder: true, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `记住了!\n懂给你做清洁善后的男人\n比只买小雨伞的靠谱太多\n别混清对他好和对你好\n认真是真心，敷衍是应付\n爱你的人会自觉把你放心上照顾`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `每次看到男朋友\n给我备的洁比兔清洁湿巾\n说不上来的感动\n淡淡的蔓越莓香很好闻\n99.9%的擦除率\n擦完可以倒头就睡\n他没有只给自己备小雨伞\n而是把我也照顾的很好\n他的爱永远拿得出手`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
  { content: `他给我准备的不只是小浪漫\n还有洁比兔清洁湿巾\n每次看到都会觉得\n原来被认真照顾\n是这种感觉🥰`, hasOrder: false, used: true, topics: ["#洁比兔","#温和清洁","#卫生湿巾","#亲测分享","#女生必备"] },
].map((c, i) => ({
  id: 'p_jiebitudushijin_c' + (i + 1),
  content: c.content,
  title: generateTitle(c.content, '洁比兔 湿巾', '洁比兔', DEFAULT_SENSITIVE_WORDS),
  topics: c.topics.length ? c.topics : generateTopics(c.content, '洁比兔 湿巾', '洁比兔', DEFAULT_SENSITIVE_WORDS),
  style: '',
  used: c.used,
  usedDate: null,
  hasOrder: c.hasOrder,
  createdAt: Date.now(),
}))

const defaultData = {
  products: [
    { id: 'p_jiebiwet', name: '洁比兔 湿巾', brand: '洁比兔', category: '其他', createdAt: Date.now(), copies: jiebiwetSeed },

    { id: 'p_xihu', name: '洁比兔洗护液', brand: '洁比兔', category: '洗护', createdAt: Date.now(), copies: xihuSeed },
    { id: 'p_weite', name: '维特健灵祛湿清', brand: '维特健灵', category: '保健品', createdAt: Date.now(), copies: weiteSeed },
    { id: 'p_coffee', name: 'PH地中海咖啡', brand: 'PH', category: '饮品', createdAt: Date.now(), copies: coffeeSeed },
    { id: 'p_jiemao', name: '植研加睫毛胶水', brand: '植研加', category: '美妆', createdAt: Date.now(), copies: jiemaoSeed },
    { id: 'p_mianmian', name: '绵绵的羊小莓好湿巾', brand: '绵绵的羊', category: '其他', createdAt: Date.now(), copies: mianmianSeed },
    { id: 'p_xiuhuazheng', name: '珀芙研修护霜正装', brand: '珀芙研', category: '护肤', createdAt: Date.now(), copies: xiuhuazhengSeed },
    { id: 'p_xiuhuaxiao', name: '珀芙研修护霜小样', brand: '珀芙研', category: '护肤', createdAt: Date.now(), copies: xiuhuaxiaoSeed },
    { id: 'p_lengmo', name: '珀芙研冷膜', brand: '珀芙研', category: '护肤', createdAt: Date.now(), copies: lengmoSeed },
    { id: 'p_mianmo', name: '珀芙研面膜', brand: '珀芙研', category: '护肤', createdAt: Date.now(), copies: mianmoSeed },
    { id: 'p_shanguang', name: '珀芙研闪光棒', brand: '珀芙研', category: '护肤', createdAt: Date.now(), copies: shanguangSeed },
    { id: 'p_tuimel', name: '褪黑素', brand: '', category: '保健品', createdAt: Date.now(), copies: tuimelSeed },
    { id: 'p_qingqing', name: '百草园清清片', brand: '百草园', category: '保健品', createdAt: Date.now(), copies: qingqingSeed },
    { id: 'p_dobo', name: 'DOBO噗噗片', brand: 'DOBO', category: '保健品', createdAt: Date.now(), copies: doboSeed },
    { id: 'p_youmin', name: '珀芙研油敏霜', brand: '珀芙研', category: '护肤', createdAt: Date.now(), copies: youminSeed },
    { id: 'p_runhou', name: '益美滋润喉糖', brand: '益美滋', category: '食品', createdAt: Date.now(), copies: runhouSeed },
    { id: 'p_olly', name: 'olly女维', brand: 'OLLY', category: '保健品', createdAt: Date.now(), copies: ollySeed }
  ],
  samples: [
  { id:'s_001', name:'冰格', account:'大号', receiveDate:'2026-04-17', deadline:'', remark:'', status:'unpublished' },
  { id:'s_002', name:'口罩', account:'大号', receiveDate:'2026-04-18', deadline:'', remark:'', status:'unpublished' },
  { id:'s_003', name:'柳丝木洁面乳', account:'大号', receiveDate:'2026-05-07', deadline:'', remark:'', status:'unpublished' },
  { id:'s_004', name:'柳丝木洁颜油', account:'大号', receiveDate:'2026-05-20', deadline:'', remark:'', status:'unpublished' },
  { id:'s_005', name:'雾犀牙膏', account:'大号', receiveDate:'', deadline:'', remark:'', status:'unpublished' },
  { id:'s_006', name:'植研加睫毛胶水新', account:'大号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_007', name:'造物者小美', account:'大号', receiveDate:'2026-05-13', deadline:'', remark:'', status:'published' },
  { id:'s_008', name:'一次性内裤', account:'大号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_009', name:'珀芙研等渗面膜', account:'大号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_010', name:'珀芙研蛋白胶原面膜', account:'大号', receiveDate:'2026-05-03', deadline:'', remark:'', status:'published' },
  { id:'s_011', name:'珀芙研油敏霜', account:'大号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_012', name:'珀芙研闪光棒', account:'大号', receiveDate:'2026-05-03', deadline:'', remark:'', status:'hit' },
  { id:'s_013', name:'珀芙研修护霜小样', account:'大号', receiveDate:'2026-05-16', deadline:'', remark:'', status:'hit' },
  { id:'s_014', name:'珀芙研冷膜', account:'大号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_015', name:'珀芙研修护霜', account:'大号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_016', name:'衣物香氛挂件', account:'大号', receiveDate:'2026-04-24', deadline:'', remark:'', status:'hit' },
  { id:'s_017', name:'浮汀遮瑕液', account:'大号', receiveDate:'2026-05-16', deadline:'', remark:'', status:'hit' },
  { id:'s_018', name:'护魔手机壳', account:'大号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_019', name:'祛湿清', account:'大号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_020', name:'植研加睫毛胶水旧', account:'大号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_021', name:'讯姆钢化膜', account:'大号', receiveDate:'2026-03-16', deadline:'', remark:'', status:'hit' },
  { id:'s_022', name:'袋鼠妈妈沐浴露洗发水', account:'大号', receiveDate:'2026-04-27', deadline:'', remark:'', status:'hit' },
  { id:'s_023', name:'手持风扇', account:'大号', receiveDate:'2026-03-23', deadline:'', remark:'', status:'hit' },
  { id:'s_024', name:'绵绵的羊', account:'大号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_025', name:'完美日记唇釉', account:'大号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_026', name:'纽益宝鱼油', account:'大号', receiveDate:'2026-04-28', deadline:'', remark:'', status:'published' },
  { id:'s_027', name:'宝玑米脱毛膏', account:'大号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_028', name:'生理盐水', account:'大号', receiveDate:'', deadline:'', remark:'', status:'unpublished' },
  { id:'s_029', name:'无界香水', account:'大号', receiveDate:'', deadline:'', remark:'', status:'unpublished' },
  { id:'s_030', name:'ph咖啡', account:'大号', receiveDate:'2026-05-07', deadline:'', remark:'', status:'unpublished' },
  { id:'s_031', name:'宁心', account:'大号', receiveDate:'2026-05-01', deadline:'', remark:'', status:'published' },
  { id:'s_032', name:'倍加洁牙刷', account:'小号', receiveDate:'2026-05-11', deadline:'', remark:'', status:'hit' },
  { id:'s_033', name:'脆升升礼盒', account:'小号', receiveDate:'2026-05-16', deadline:'', remark:'', status:'unpublished' },
  { id:'s_034', name:'滴露消毒液', account:'小号', receiveDate:'2026-05-17', deadline:'', remark:'', status:'unpublished' },
  { id:'s_035', name:'珀莱雅', account:'小号', receiveDate:'2026-05-17', deadline:'', remark:'', status:'published' },
  { id:'s_036', name:'答非冰感毛巾', account:'小号', receiveDate:'2026-06-03', deadline:'', remark:'', status:'published' },
  { id:'s_037', name:'润培护发精油', account:'小号', receiveDate:'2026-06-04', deadline:'', remark:'', status:'published' },
  { id:'s_038', name:'皮带', account:'小号', receiveDate:'2026-06-04', deadline:'', remark:'', status:'published' },
  { id:'s_039', name:'宁心', account:'小号', receiveDate:'2026-03-03', deadline:'', remark:'', status:'hit' },
  { id:'s_040', name:'后谷咖啡', account:'小号', receiveDate:'2026-06-05', deadline:'', remark:'', status:'published' },
  { id:'s_041', name:'可靠冰凉毛巾', account:'小号', receiveDate:'2026-06-05', deadline:'', remark:'', status:'unpublished' },
  { id:'s_042', name:'星帮尼湿巾', account:'小号', receiveDate:'2026-06-09', deadline:'', remark:'', status:'unpublished' },
  { id:'s_043', name:'官栈花胶', account:'小号', receiveDate:'2026-06-09', deadline:'', remark:'', status:'published' },
  { id:'s_044', name:'奶酪', account:'小号', receiveDate:'2026-06-09', deadline:'', remark:'', status:'unpublished' },
  { id:'s_045', name:'植研加睫毛胶水新', account:'小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_046', name:'植研加睫毛胶水旧', account:'小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_047', name:'铁剂', account:'小号', receiveDate:'2026-06-24', deadline:'', remark:'', status:'unpublished' },
  { id:'s_048', name:'童颜纪面膜', account:'小号', receiveDate:'2026-06-26', deadline:'', remark:'', status:'unpublished' },
  { id:'s_049', name:'泥巴派', account:'小号', receiveDate:'', deadline:'', remark:'', status:'unpublished' },
  { id:'s_050', name:'百草妈咪洁面泡沫', account:'小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_051', name:'一页精华', account:'小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_052', name:'丹泊沐浴露', account:'小号', receiveDate:'2026-06-16', deadline:'', remark:'', status:'published' },
  { id:'s_053', name:'生理盐水湿巾', account:'小号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_054', name:'衣物香氛挂件', account:'小号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_055', name:'祛湿轻', account:'小号', receiveDate:'2026-03-01', deadline:'', remark:'', status:'hit' },
  { id:'s_056', name:'洁比兔 湿巾', account:'小号', receiveDate:'2026-03-24', deadline:'', remark:'', status:'hit' },
  { id:'s_057', name:'洁比兔益生菌洗液', account:'小号', receiveDate:'2026-03-24', deadline:'', remark:'', status:'hit' },
  { id:'s_058', name:'绵绵的羊', account:'小号', receiveDate:'2026-04-28', deadline:'', remark:'', status:'hit' },
  { id:'s_059', name:'宝玑米脱毛膏', account:'小号', receiveDate:'2026-04-28', deadline:'', remark:'', status:'hit' },
  { id:'s_060', name:'纯耕六味地黄丸', account:'小号', receiveDate:'2026-04-23', deadline:'', remark:'', status:'hit' },
  { id:'s_061', name:'纯耕黄精人参', account:'小号', receiveDate:'2026-04-23', deadline:'', remark:'', status:'hit' },
  { id:'s_062', name:'珀芙研等渗面膜', account:'小号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_063', name:'珀芙研蛋白胶原面膜', account:'小号', receiveDate:'2026-05-03', deadline:'', remark:'', status:'published' },
  { id:'s_064', name:'珀芙研冷膜', account:'小号', receiveDate:'', deadline:'', remark:'', status:'unpublished' },
  { id:'s_065', name:'珀芙研修护霜', account:'小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_066', name:'珀芙研修护霜小样', account:'小号', receiveDate:'2026-05-16', deadline:'', remark:'', status:'unpublished' },
  { id:'s_067', name:'柏芙妍油敏霜', account:'小号', receiveDate:'', deadline:'', remark:'', status:'unpublished' },
  { id:'s_068', name:'珂拉琪唇釉礼盒', account:'小号', receiveDate:'2026-05-13', deadline:'', remark:'', status:'published' },
  { id:'s_069', name:'润培沐浴露', account:'小号', receiveDate:'2026-05-18', deadline:'', remark:'', status:'published' },
  { id:'s_070', name:'倍爱健', account:'小号', receiveDate:'2026-05-11', deadline:'', remark:'', status:'published' },
  { id:'s_071', name:'fiboo富铁软糖', account:'小号', receiveDate:'2026-04-28', deadline:'', remark:'', status:'published' },
  { id:'s_072', name:'美那有营养软糖', account:'小号', receiveDate:'2026-04-29', deadline:'', remark:'', status:'published' },
  { id:'s_073', name:'香蕉饮', account:'小号', receiveDate:'2026-04-23', deadline:'', remark:'', status:'published' },
  { id:'s_074', name:'olly女维', account:'小号', receiveDate:'2026-04-23', deadline:'', remark:'', status:'published' },
  { id:'s_075', name:'olly褪黑素', account:'小号', receiveDate:'2026-04-23', deadline:'', remark:'', status:'published' },
  { id:'s_076', name:'洗衣凝珠', account:'小号', receiveDate:'2026-05-05', deadline:'', remark:'', status:'published' },
  { id:'s_077', name:'茵缇玛', account:'小号', receiveDate:'2026-05-06', deadline:'', remark:'', status:'unpublished' },
  { id:'s_078', name:'苏卡咖啡', account:'小号', receiveDate:'2026-05-05', deadline:'', remark:'', status:'unpublished' },
  { id:'s_079', name:'ph咖啡', account:'小号', receiveDate:'2026-04-18', deadline:'', remark:'', status:'unpublished' },
  { id:'s_080', name:'斯维诗液体钙', account:'小号', receiveDate:'2026-03-26', deadline:'', remark:'', status:'published' },
  { id:'s_081', name:'星帮尼湿巾', account:'小小号', receiveDate:'2026-06-09', deadline:'', remark:'', status:'published' },
  { id:'s_082', name:'官栈花胶', account:'小小号', receiveDate:'2026-06-09', deadline:'', remark:'', status:'published' },
  { id:'s_083', name:'奶酪', account:'小小号', receiveDate:'2026-06-09', deadline:'', remark:'', status:'published' },
  { id:'s_084', name:'植研加睫毛胶水新', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_085', name:'植研加睫毛胶水旧', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_086', name:'铁剂', account:'小小号', receiveDate:'2026-06-24', deadline:'', remark:'', status:'published' },
  { id:'s_087', name:'童颜纪面膜', account:'小小号', receiveDate:'2026-06-26', deadline:'', remark:'', status:'published' },
  { id:'s_088', name:'泥巴派', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_089', name:'百草妈咪洁面泡沫', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_090', name:'一页精华', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_091', name:'丹泊沐浴露', account:'小小号', receiveDate:'2026-06-16', deadline:'', remark:'', status:'published' },
  { id:'s_092', name:'生理盐水湿巾', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_093', name:'衣物香氛挂件', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_094', name:'祛湿清', account:'小小号', receiveDate:'2026-03-01', deadline:'', remark:'', status:'published' },
  { id:'s_095', name:'洁比兔 湿巾', account:'小小号', receiveDate:'2026-03-24', deadline:'', remark:'', status:'hit' },
  { id:'s_096', name:'洁比兔益生菌洗液', account:'小小号', receiveDate:'2026-03-24', deadline:'', remark:'', status:'hit' },
  { id:'s_097', name:'绵绵的羊', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_098', name:'宝玑米脱毛膏', account:'小小号', receiveDate:'2026-04-28', deadline:'', remark:'', status:'published' },
  { id:'s_099', name:'纯耕六味地黄丸', account:'小小号', receiveDate:'2026-04-23', deadline:'', remark:'', status:'hit' },
  { id:'s_100', name:'纯耕黄精英人参', account:'小小号', receiveDate:'2026-04-23', deadline:'', remark:'', status:'published' },
  { id:'s_101', name:'珀芙研等渗面膜', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'abandoned' },
  { id:'s_102', name:'珀芙研蛋白胶原面膜', account:'小小号', receiveDate:'2026-05-03', deadline:'', remark:'', status:'abandoned' },
  { id:'s_103', name:'珀芙研冷膜', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'abandoned' },
  { id:'s_104', name:'珀芙研修护霜', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'abandoned' },
  { id:'s_105', name:'珀芙研修护霜小样', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'abandoned' },
  { id:'s_106', name:'柏芙妍油敏霜', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'abandoned' },
  { id:'s_107', name:'祛湿清', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_108', name:'fiboo富铁软糖', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_109', name:'纯耕六味地黄丸', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_110', name:'纯耕黄精英人参', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_111', name:'美那有营养软糖', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_112', name:'美那有红脸兔', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_113', name:'香蕉牛奶', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_114', name:'olly女维', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_115', name:'无糖清凉糖', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_116', name:'香体糖', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_117', name:'olly褪黑素', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'hit' },
  { id:'s_118', name:'南瓜籽', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_119', name:'西梅软糖', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_120', name:'红花贴', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_121', name:'巧尼芙', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_122', name:'腿腿丸', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_123', name:'复合维B', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' },
  { id:'s_124', name:'洛神月褪黑素', account:'小小号', receiveDate:'', deadline:'', remark:'', status:'published' }
],
  transactions: [
    { id: 'seed_tx_e001', type: 'expense', category: 'other_expense', account: '', amount: 3.85, date: '', remark: '玻璃杯', createdAt: 0 },
    { id: 'seed_tx_i001', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 500.0, date: '2026-01-15', remark: '晚梨提现', createdAt: 0 },
    { id: 'seed_tx_e002', type: 'expense', category: 'prop', account: '', amount: 7.92, date: '', remark: '平板支架', createdAt: 0 },
    { id: 'seed_tx_i002', type: 'income', category: 'commission', account: '', amount: 50.0, date: '2026-02-04', remark: '洗发水稿费', createdAt: 0 },
    { id: 'seed_tx_e003', type: 'expense', category: 'prop', account: '', amount: 2.41, date: '', remark: '相框', createdAt: 0 },
    { id: 'seed_tx_i003', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 500.0, date: '2026-02-22', remark: '广东刘亦菲提现', createdAt: 0 },
    { id: 'seed_tx_e004', type: 'expense', category: 'other_expense', account: '', amount: 17.33, date: '', remark: '墙面纸', createdAt: 0 },
    { id: 'seed_tx_i004', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 143.0, date: '2026-02-28', remark: '晚梨海淘提现', createdAt: 0 },
    { id: 'seed_tx_e005', type: 'expense', category: 'other_expense', account: '', amount: 8.0, date: '', remark: '英文杂志', createdAt: 0 },
    { id: 'seed_tx_i005', type: 'income', category: 'sample', account: '', amount: 49.0, date: '2026-03-02', remark: 'TT香水', createdAt: 0 },
    { id: 'seed_tx_e006', type: 'expense', category: 'other_expense', account: '', amount: 8.39, date: '', remark: '向日葵', createdAt: 0 },
    { id: 'seed_tx_i006', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 126.62, date: '2026-03-03', remark: '广东刘亦菲海淘提现', createdAt: 0 },
    { id: 'seed_tx_e007', type: 'expense', category: 'other_expense', account: '', amount: 10.77, date: '', remark: '桌布', createdAt: 0 },
    { id: 'seed_tx_i007', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 560.0, date: '2026-03-12', remark: '广东刘亦菲提现', createdAt: 0 },
    { id: 'seed_tx_e008', type: 'expense', category: 'other_expense', account: '', amount: 40.0, date: '', remark: '咖啡杯', createdAt: 0 },
    { id: 'seed_tx_i008', type: 'income', category: 'commission', account: '', amount: 40.0, date: '2026-03-12', remark: '橘朵混剪', createdAt: 0 },
    { id: 'seed_tx_e009', type: 'expense', category: 'other_expense', account: '', amount: 980.0, date: '', remark: '会员', createdAt: 0 },
    { id: 'seed_tx_i009', type: 'income', category: 'sample', account: '', amount: 37.6, date: '2026-03-12', remark: '伏湿膏样品', createdAt: 0 },
    { id: 'seed_tx_e010', type: 'expense', category: 'prop', account: '', amount: 66.0, date: '', remark: '拍摄支架', createdAt: 0 },
    { id: 'seed_tx_i010', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 461.36, date: '2026-03-16', remark: '广东刘亦菲海淘提现', createdAt: 0 },
    { id: 'seed_tx_e011', type: 'expense', category: 'other_expense', account: '', amount: 33.3, date: '', remark: '百度会员', createdAt: 0 },
    { id: 'seed_tx_i011', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 359.11, date: '2026-03-16', remark: '晚梨海淘提现', createdAt: 0 },
    { id: 'seed_tx_e012', type: 'expense', category: 'other_expense', account: '', amount: 108.0, date: '', remark: '剪映会员', createdAt: 0 },
    { id: 'seed_tx_i012', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 112.73, date: '2026-03-16', remark: '晚梨提现', createdAt: 0 },
    { id: 'seed_tx_e013', type: 'expense', category: 'prop', account: '', amount: 49.9, date: '', remark: '广角镜', createdAt: 0 },
    { id: 'seed_tx_i013', type: 'income', category: 'sample', account: '', amount: 18.8, date: '2026-03-20', remark: '奈斯帝漱口水+牛油果卸妆膏', createdAt: 0 },
    { id: 'seed_tx_e014', type: 'expense', category: 'other_expense', account: '', amount: 69.0, date: '', remark: '散热器', createdAt: 0 },
    { id: 'seed_tx_i014', type: 'income', category: 'sample', account: '', amount: 39.4, date: '2026-03-23', remark: '燃燃片', createdAt: 0 },
    { id: 'seed_tx_e015', type: 'expense', category: 'prop', account: '', amount: 24.0, date: '', remark: '挂脖支架', createdAt: 0 },
    { id: 'seed_tx_i015', type: 'income', category: 'sample', account: '', amount: 39.4, date: '2026-03-23', remark: '仁和洗液', createdAt: 0 },
    { id: 'seed_tx_e016', type: 'expense', category: 'prop', account: '', amount: 101.75, date: '', remark: '小天支架', createdAt: 0 },
    { id: 'seed_tx_i016', type: 'income', category: 'sample', account: '', amount: 30.0, date: '2026-03-23', remark: '颜必科防晒', createdAt: 0 },
    { id: 'seed_tx_e017', type: 'expense', category: 'prop', account: '', amount: 246.0, date: '', remark: '射灯', createdAt: 0 },
    { id: 'seed_tx_i017', type: 'income', category: 'sample', account: '', amount: 44.4, date: '2026-03-25', remark: '宁心褪黑素', createdAt: 0 },
    { id: 'seed_tx_e018', type: 'expense', category: 'prop', account: '', amount: 586.0, date: '', remark: '球形灯', createdAt: 0 },
    { id: 'seed_tx_i018', type: 'income', category: 'commission', account: '', amount: 200.0, date: '2026-03-25', remark: '亿佰天益生菌稿费', createdAt: 0 },
    { id: 'seed_tx_e019', type: 'expense', category: 'prop', account: '', amount: 124.68, date: '', remark: '餐边柜', createdAt: 0 },
    { id: 'seed_tx_i019', type: 'income', category: 'sample', account: '', amount: 24.4, date: '2026-03-26', remark: '丽得姿面膜', createdAt: 0 },
    { id: 'seed_tx_e020', type: 'expense', category: 'other_expense', account: '', amount: 68.5, date: '', remark: '绿植', createdAt: 0 },
    { id: 'seed_tx_i020', type: 'income', category: 'sample', account: '', amount: 24.4, date: '2026-03-28', remark: '仁和足贴', createdAt: 0 },
    { id: 'seed_tx_e021', type: 'expense', category: 'prop', account: '', amount: 41.46, date: '', remark: '墙纸', createdAt: 0 },
    { id: 'seed_tx_i021', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 80.28, date: '2026-03-31', remark: '广东刘亦菲提现', createdAt: 0 },
    { id: 'seed_tx_e022', type: 'expense', category: 'other_expense', account: '', amount: 26.0, date: '', remark: '花束', createdAt: 0 },
    { id: 'seed_tx_i022', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 168.09, date: '2026-03-31', remark: '晚梨海淘提现', createdAt: 0 },
    { id: 'seed_tx_e023', type: 'expense', category: 'other_expense', account: '', amount: 14.8, date: '', remark: '无火香薰', createdAt: 0 },
    { id: 'seed_tx_i023', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 94.94, date: '2026-03-31', remark: '晚梨提现', createdAt: 0 },
    { id: 'seed_tx_e024', type: 'expense', category: 'prop', account: '', amount: 44.1, date: '', remark: '小台灯', createdAt: 0 },
    { id: 'seed_tx_i024', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 312.6, date: '2026-03-31', remark: '广东刘亦菲海淘提现', createdAt: 0 },
    { id: 'seed_tx_e025', type: 'expense', category: 'prop', account: '', amount: 7.0, date: '', remark: '地板贴', createdAt: 0 },
    { id: 'seed_tx_i025', type: 'income', category: 'commission', account: '', amount: 80.0, date: '2026-04-01', remark: '美学社洗发水稿费', createdAt: 0 },
    { id: 'seed_tx_e026', type: 'expense', category: 'prop', account: '', amount: 14.9, date: '', remark: '挂画1', createdAt: 0 },
    { id: 'seed_tx_i026', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 287.69, date: '2026-04-07', remark: '广东刘亦菲提现', createdAt: 0 },
    { id: 'seed_tx_e027', type: 'expense', category: 'prop', account: '', amount: 30.6, date: '', remark: '挂画2', createdAt: 0 },
    { id: 'seed_tx_i027', type: 'income', category: 'sample', account: '', amount: 25.4, date: '2026-04-10', remark: '海洋之风牙膏', createdAt: 0 },
    { id: 'seed_tx_e028', type: 'expense', category: 'other_expense', account: '', amount: 19.5, date: '', remark: '花', createdAt: 0 },
    { id: 'seed_tx_i028', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 173.91, date: '2026-04-10', remark: '广东刘亦菲提现', createdAt: 0 },
    { id: 'seed_tx_e029', type: 'expense', category: 'prop', account: '', amount: 58.0, date: '', remark: '墙纸2', createdAt: 0 },
    { id: 'seed_tx_i029', type: 'income', category: 'sample', account: '', amount: 16.4, date: '2026-04-15', remark: '海洋之风漱口水', createdAt: 0 },
    { id: 'seed_tx_e030', type: 'expense', category: 'prop', account: '', amount: 41.0, date: '', remark: '窗帘', createdAt: 0 },
    { id: 'seed_tx_i030', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 317.83, date: '2026-04-15', remark: '广东刘亦菲海淘提现', createdAt: 0 },
    { id: 'seed_tx_e031', type: 'expense', category: 'prop', account: '', amount: 20.24, date: '', remark: '肌理纸', createdAt: 0 },
    { id: 'seed_tx_i031', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 573.14, date: '2026-04-15', remark: '晚梨海淘提现', createdAt: 0 },
    { id: 'seed_tx_e032', type: 'expense', category: 'other_expense', account: '', amount: 4.4, date: '', remark: '美甲', createdAt: 0 },
    { id: 'seed_tx_i032', type: 'income', category: 'sample', account: '', amount: 164.4, date: '2026-04-17', remark: '小粉钻鱼油', createdAt: 0 },
    { id: 'seed_tx_e033', type: 'expense', category: 'prop', account: '', amount: 144.5, date: '', remark: '墙纸3', createdAt: 0 },
    { id: 'seed_tx_i033', type: 'income', category: 'sample', account: '', amount: 24.4, date: '2026-04-17', remark: '亿佰天益生菌', createdAt: 0 },
    { id: 'seed_tx_e034', type: 'expense', category: 'prop', account: '', amount: 37.5, date: '', remark: '地毯', createdAt: 0 },
    { id: 'seed_tx_i034', type: 'income', category: 'sample', account: '', amount: 22.4, date: '2026-04-17', remark: 'ell颈纹霜', createdAt: 0 },
    { id: 'seed_tx_e035', type: 'expense', category: 'prop', account: '', amount: 38.7, date: '', remark: '墙纸4', createdAt: 0 },
    { id: 'seed_tx_i035', type: 'income', category: 'sample', account: '', amount: 34.4, date: '2026-04-18', remark: '散热器', createdAt: 0 },
    { id: 'seed_tx_e036', type: 'expense', category: 'prop', account: '', amount: 32.6, date: '', remark: '架子', createdAt: 0 },
    { id: 'seed_tx_i036', type: 'income', category: 'sample', account: '', amount: 30.0, date: '2026-04-18', remark: '美国清清片', createdAt: 0 },
    { id: 'seed_tx_e037', type: 'expense', category: 'prop', account: '', amount: 7.4, date: '', remark: '挂画', createdAt: 0 },
    { id: 'seed_tx_i037', type: 'income', category: 'sample', account: '', amount: 19.4, date: '2026-04-18', remark: 'za卸妆油', createdAt: 0 },
    { id: 'seed_tx_e038', type: 'expense', category: 'prop', account: '', amount: 7.0, date: '', remark: '果冻胶', createdAt: 0 },
    { id: 'seed_tx_i038', type: 'income', category: 'sample', account: '', amount: 48.5, date: '2026-04-20', remark: '柳丝木隔离', createdAt: 0 },
    { id: 'seed_tx_e039', type: 'expense', category: 'prop', account: '', amount: 8.8, date: '', remark: '墙纸边', createdAt: 0 },
    { id: 'seed_tx_i039', type: 'income', category: 'sample', account: '', amount: 19.5, date: '2026-04-22', remark: '达肤妍洁面', createdAt: 0 },
    { id: 'seed_tx_e040', type: 'expense', category: 'prop', account: '', amount: 24.6, date: '', remark: '灯', createdAt: 0 },
    { id: 'seed_tx_i040', type: 'income', category: 'sample', account: '', amount: 89.8, date: '2026-04-23', remark: '无湿轻', createdAt: 0 },
    { id: 'seed_tx_e041', type: 'expense', category: 'prop', account: '', amount: 8.8, date: '', remark: '口腔模型', createdAt: 0 },
    { id: 'seed_tx_i041', type: 'income', category: 'sample', account: '', amount: 75.0, date: '2026-04-23', remark: '仰寿堂', createdAt: 0 },
    { id: 'seed_tx_e042', type: 'expense', category: 'prop', account: '', amount: 29.0, date: '', remark: '补光灯', createdAt: 0 },
    { id: 'seed_tx_i042', type: 'income', category: 'sample', account: '', amount: 4.5, date: '2026-04-23', remark: '凯雅卸妆膏', createdAt: 0 },
    { id: 'seed_tx_e043', type: 'expense', category: 'prop', account: '', amount: 10.0, date: '', remark: '果冻胶2', createdAt: 0 },
    { id: 'seed_tx_i043', type: 'income', category: 'sample', account: '', amount: 39.5, date: '2026-04-23', remark: '娜丽丝防晒', createdAt: 0 },
    { id: 'seed_tx_e044', type: 'expense', category: 'prop', account: '', amount: 15.0, date: '', remark: '拍摄软件', createdAt: 0 },
    { id: 'seed_tx_i044', type: 'income', category: 'commission', account: '', amount: 20.0, date: '2026-04-29', remark: '闲鱼帮卖', createdAt: 0 },
    { id: 'seed_tx_e045', type: 'expense', category: 'prop', account: '', amount: 89.0, date: '', remark: '豆腐灯', createdAt: 0 },
    { id: 'seed_tx_i045', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 226.37, date: '2026-04-30', remark: '广东刘亦菲星川+提现', createdAt: 0 },
    { id: 'seed_tx_e046', type: 'expense', category: 'prop', account: '', amount: 56.0, date: '', remark: '墙纸5', createdAt: 0 },
    { id: 'seed_tx_i046', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 62.81, date: '2026-04-30', remark: '广东刘亦菲海淘提现', createdAt: 0 },
    { id: 'seed_tx_e047', type: 'expense', category: 'prop', account: '', amount: 21.3, date: '', remark: '露营箱', createdAt: 0 },
    { id: 'seed_tx_i047', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 987.0, date: '2026-04-30', remark: '晚梨海淘提现', createdAt: 0 },
    { id: 'seed_tx_e048', type: 'expense', category: 'prop', account: '', amount: 8.8, date: '', remark: '墙纸边2', createdAt: 0 },
    { id: 'seed_tx_i048', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 178.97, date: '2026-04-30', remark: '晚梨提现', createdAt: 0 },
    { id: 'seed_tx_e049', type: 'expense', category: 'other_expense', account: '', amount: 25.0, date: '', remark: '美甲2', createdAt: 0 },
    { id: 'seed_tx_i049', type: 'income', category: 'sample', account: '', amount: 54.5, date: '2026-04-30', remark: '清清片中瓶', createdAt: 0 },
    { id: 'seed_tx_e050', type: 'expense', category: 'prop', account: '', amount: 11.0, date: '', remark: '灯底座', createdAt: 0 },
    { id: 'seed_tx_i050', type: 'income', category: 'sample', account: '', amount: 90.0, date: '2026-05-05', remark: '脑白金液体钙', createdAt: 0 },
    { id: 'seed_tx_e051', type: 'expense', category: 'other_expense', account: '', amount: 16.0, date: '', remark: '固态胶', createdAt: 0 },
    { id: 'seed_tx_i051', type: 'income', category: 'sample', account: '', amount: 149.5, date: '2026-05-05', remark: '清清片大瓶', createdAt: 0 },
    { id: 'seed_tx_e052', type: 'expense', category: 'prop', account: '', amount: 3.8, date: '', remark: '拍摄软件2', createdAt: 0 },
    { id: 'seed_tx_i052', type: 'income', category: 'commission', account: '', amount: 5.0, date: '2026-05-06', remark: '闲鱼帮卖', createdAt: 0 },
    { id: 'seed_tx_e053', type: 'expense', category: 'other_expense', account: '', amount: 15.0, date: '', remark: '美甲3', createdAt: 0 },
    { id: 'seed_tx_i053', type: 'income', category: 'xingchuan', account: '晚梨不吃梨', amount: 718.32, date: '2026-05-13', remark: '晚梨星川', createdAt: 0 },
    { id: 'seed_tx_e054', type: 'expense', category: 'prop', account: '', amount: 28.0, date: '', remark: '沙发布', createdAt: 0 },
    { id: 'seed_tx_i054', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 567.42, date: '2026-05-13', remark: '晚梨提现', createdAt: 0 },
    { id: 'seed_tx_e055', type: 'expense', category: 'prop', account: '', amount: 13.4, date: '', remark: '墙纸6', createdAt: 0 },
    { id: 'seed_tx_i055', type: 'income', category: 'haitao', account: '晚梨不吃梨', amount: 67.67, date: '2026-05-15', remark: '晚梨海淘', createdAt: 0 },
    { id: 'seed_tx_e056', type: 'expense', category: 'other_expense', account: '', amount: 3.7, date: '', remark: '柚子叶', createdAt: 0 },
    { id: 'seed_tx_i056', type: 'income', category: 'sample', account: '', amount: 9.5, date: '2026-05-15', remark: '贝莱健益生菌', createdAt: 0 },
    { id: 'seed_tx_e057', type: 'expense', category: 'other_expense', account: '', amount: 5.9, date: '', remark: '香水', createdAt: 0 },
    { id: 'seed_tx_i057', type: 'income', category: 'sample', account: '', amount: 72.5, date: '2026-05-15', remark: '元气达人枕头', createdAt: 0 },
    { id: 'seed_tx_e058', type: 'expense', category: 'other_expense', account: '', amount: 7.9, date: '', remark: '洗脸巾', createdAt: 0 },
    { id: 'seed_tx_i058', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 51.33, date: '2026-05-15', remark: '刘亦菲海淘提现', createdAt: 0 },
    { id: 'seed_tx_e059', type: 'expense', category: 'other_expense', account: '', amount: 3.9, date: '', remark: '维达手帕纸', createdAt: 0 },
    { id: 'seed_tx_i059', type: 'income', category: 'sample', account: '', amount: 50.0, date: '2026-05-19', remark: '柳丝木喷雾', createdAt: 0 },
    { id: 'seed_tx_e060', type: 'expense', category: 'other_expense', account: '', amount: 10.9, date: '', remark: '护手霜', createdAt: 0 },
    { id: 'seed_tx_i060', type: 'income', category: 'haitao', account: '晚梨不吃梨', amount: 88.87, date: '2026-06-01', remark: '晚梨海淘', createdAt: 0 },
    { id: 'seed_tx_e061', type: 'expense', category: 'other_expense', account: '', amount: 14.9, date: '', remark: '德佑', createdAt: 0 },
    { id: 'seed_tx_i061', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 1269.47, date: '2026-06-01', remark: '晚梨提现', createdAt: 0 },
    { id: 'seed_tx_e062', type: 'expense', category: 'other_expense', account: '', amount: 69.0, date: '', remark: '暖手宝', createdAt: 0 },
    { id: 'seed_tx_i062', type: 'income', category: 'xingchuan', account: '晚梨不吃梨', amount: 182.38, date: '2026-06-01', remark: '晚梨星川', createdAt: 0 },
    { id: 'seed_tx_e063', type: 'expense', category: 'ad', account: '', amount: 29.0, date: '', remark: '晚梨投流', createdAt: 0 },
    { id: 'seed_tx_i063', type: 'income', category: 'xingchuan', account: '广东刘亦菲', amount: 282.5, date: '2026-06-01', remark: '刘亦菲星川', createdAt: 0 },
    { id: 'seed_tx_e064', type: 'expense', category: 'ad', account: '', amount: 2.0, date: '', remark: '袜子投流', createdAt: 0 },
    { id: 'seed_tx_i064', type: 'income', category: 'haitao', account: '广东刘亦菲', amount: 107.8, date: '2026-06-01', remark: '刘亦菲海淘', createdAt: 0 },
    { id: 'seed_tx_e065', type: 'expense', category: 'other_expense', account: '', amount: 11.23, date: '', remark: '圣诞苹果', createdAt: 0 },
    { id: 'seed_tx_i065', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 342.76, date: '2026-06-01', remark: '刘亦菲提现', createdAt: 0 },
    { id: 'seed_tx_e066', type: 'expense', category: 'other_expense', account: '', amount: 8.0, date: '', remark: '跑步鞋', createdAt: 0 },
    { id: 'seed_tx_i066', type: 'income', category: 'sample', account: '', amount: 14.5, date: '2026-06-02', remark: '仁和维生素', createdAt: 0 },
    { id: 'seed_tx_e067', type: 'expense', category: 'ad', account: '', amount: 76.4, date: '', remark: '充电宝投流', createdAt: 0 },
    { id: 'seed_tx_i067', type: 'income', category: 'sample', account: '', amount: 24.5, date: '2026-06-03', remark: '自然堂洗面奶', createdAt: 0 },
    { id: 'seed_tx_e068', type: 'expense', category: 'other_expense', account: '', amount: 108.2, date: '', remark: '手电筒', createdAt: 0 },
    { id: 'seed_tx_i068', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 18.12, date: '2026-06-15', remark: '晚梨海淘提现', createdAt: 0 },
    { id: 'seed_tx_e069', type: 'expense', category: 'ad', account: '', amount: 555.0, date: '', remark: '清清片投流', createdAt: 0 },
    { id: 'seed_tx_i069', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 228.61, date: '2026-06-15', remark: '刘亦菲海淘提现', createdAt: 0 },
    { id: 'seed_tx_e070', type: 'expense', category: 'other_expense', account: '', amount: 32.0, date: '', remark: '火锅', createdAt: 0 },
    { id: 'seed_tx_i070', type: 'income', category: 'withdraw', account: '努力成为富婆', amount: 335.0, date: '2026-06-15', remark: '小小号提现', createdAt: 0 },
    { id: 'seed_tx_e071', type: 'expense', category: 'other_expense', account: '', amount: 138.0, date: '', remark: '美甲4', createdAt: 0 },
    { id: 'seed_tx_i071', type: 'income', category: 'sample', account: '', amount: 30.0, date: '2026-06-15', remark: '朵梦刮毛刀', createdAt: 0 },
    { id: 'seed_tx_e072', type: 'expense', category: 'other_expense', account: '', amount: 80.0, date: '', remark: '火锅2', createdAt: 0 },
    { id: 'seed_tx_i072', type: 'income', category: 'sample', account: '', amount: 50.0, date: '2026-06-28', remark: '珀莱雅防晒', createdAt: 0 },
    { id: 'seed_tx_e073', type: 'expense', category: 'other_expense', account: '', amount: 6.75, date: '', remark: '辣椒油', createdAt: 0 },
    { id: 'seed_tx_i073', type: 'income', category: 'sample', account: '', amount: 39.5, date: '2026-06-29', remark: '润培护发精油', createdAt: 0 },
    { id: 'seed_tx_e074', type: 'expense', category: 'other_expense', account: '', amount: 86.0, date: '', remark: '火锅', createdAt: 0 },
    { id: 'seed_tx_i074', type: 'income', category: 'sample', account: '', amount: 34.5, date: '2026-06-29', remark: '彩棠遮瑕笔', createdAt: 0 },
    { id: 'seed_tx_e075', type: 'expense', category: 'prop', account: '', amount: 12.9, date: '', remark: '假袖子', createdAt: 0 },
    { id: 'seed_tx_i075', type: 'income', category: 'xingchuan', account: '晚梨不吃梨', amount: 84.73, date: '2026-06-30', remark: '晚梨星图', createdAt: 0 },
    { id: 'seed_tx_e076', type: 'expense', category: 'other_expense', account: '', amount: 8.8, date: '', remark: '美甲', createdAt: 0 },
    { id: 'seed_tx_i076', type: 'income', category: 'haitao', account: '努力成为富婆', amount: 404.04, date: '2026-06-30', remark: '富婆海淘', createdAt: 0 },
    { id: 'seed_tx_e077', type: 'expense', category: 'prop', account: '', amount: 52.66, date: '', remark: '电脑模型', createdAt: 0 },
    { id: 'seed_tx_i077', type: 'income', category: 'xingchuan', account: '广东刘亦菲', amount: 109.12, date: '2026-06-30', remark: '刘亦菲星图', createdAt: 0 },
    { id: 'seed_tx_e078', type: 'expense', category: 'prop', account: '', amount: 12.6, date: '', remark: '袖子', createdAt: 0 },
    { id: 'seed_tx_i078', type: 'income', category: 'haitao', account: '广东刘亦菲', amount: 312.07, date: '2026-06-30', remark: '刘亦菲海淘', createdAt: 0 },
    { id: 'seed_tx_e079', type: 'expense', category: 'other_expense', account: '', amount: 400.0, date: '', remark: '换电脑屏幕', createdAt: 0 },
    { id: 'seed_tx_i079', type: 'income', category: 'withdraw', account: '广东刘亦菲', amount: 231.75, date: '2026-06-30', remark: '刘亦菲提现', createdAt: 0 },
    { id: 'seed_tx_e080', type: 'expense', category: 'other_expense', account: '', amount: 130.0, date: '', remark: '内衣', createdAt: 0 },
    { id: 'seed_tx_i080', type: 'income', category: 'withdraw', account: '晚梨不吃梨', amount: 1047.0, date: '2026-06-30', remark: '晚梨提现', createdAt: 0 },
    { id: 'seed_tx_e081', type: 'expense', category: 'prop', account: '', amount: 2.0, date: '', remark: '打泡滤网', createdAt: 0 },
    { id: 'seed_tx_i081', type: 'income', category: 'sample', account: '', amount: 9.5, date: '2026-07-06', remark: '倍加洁牙膏', createdAt: 0 },
    { id: 'seed_tx_e082', type: 'expense', category: 'prop', account: '', amount: 4.0, date: '', remark: '月亮灯', createdAt: 0 },
    { id: 'seed_tx_i082', type: 'income', category: 'sample', account: '', amount: 69.5, date: '2026-07-06', remark: '脑白金液体钙', createdAt: 0 },
    { id: 'seed_tx_e083', type: 'expense', category: 'ad', account: '', amount: 45.0, date: '', remark: '美国清清片投流', createdAt: 0 },
    { id: 'seed_tx_i083', type: 'income', category: 'sample', account: '', amount: 44.5, date: '2026-07-07', remark: '彩棠粉底液', createdAt: 0 },
    { id: 'seed_tx_e084', type: 'expense', category: 'prop', account: '', amount: 9.0, date: '', remark: '钥匙扣灯', createdAt: 0 },
    { id: 'seed_tx_i084', type: 'income', category: 'haitao', account: '', amount: 538.4, date: '2026-07-15', remark: '海淘', createdAt: 0 },
    { id: 'seed_tx_e085', type: 'expense', category: 'other_expense', account: '', amount: 6.0, date: '', remark: '剪映会员', createdAt: 0 },
    { id: 'seed_tx_i085', type: 'income', category: 'xingchuan', account: '', amount: 9.0, date: '2026-07-15', remark: '星图', createdAt: 0 },
    { id: 'seed_tx_e086', type: 'expense', category: 'ad', account: '', amount: 33.8, date: '', remark: '清清片投流', createdAt: 0 },
    { id: 'seed_tx_i086', type: 'income', category: 'withdraw', account: '', amount: 996.54, date: '2026-07-15', remark: '提现', createdAt: 0 },
    { id: 'seed_tx_e087', type: 'expense', category: 'other_expense', account: '', amount: 48.38, date: '', remark: '微信双开', createdAt: 0 },
    { id: 'seed_tx_e088', type: 'expense', category: 'other_expense', account: '', amount: 101.5, date: '', remark: '剪映会员', createdAt: 0 },
    { id: 'seed_tx_e089', type: 'expense', category: 'other_expense', account: '', amount: 32.2, date: '', remark: '520礼盒', createdAt: 0 },
    { id: 'seed_tx_e090', type: 'expense', category: 'other_expense', account: '', amount: 15.9, date: '', remark: '咖啡', createdAt: 0 },
    { id: 'seed_tx_e091', type: 'expense', category: 'prop', account: '', amount: 8.0, date: '', remark: '袖套', createdAt: 0 },
    { id: 'seed_tx_e092', type: 'expense', category: 'other_expense', account: '', amount: 8.8, date: '', remark: '蓝莓', createdAt: 0 },
    { id: 'seed_tx_e093', type: 'expense', category: 'other_expense', account: '', amount: 3.84, date: '', remark: '屁屁杯', createdAt: 0 },
    { id: 'seed_tx_e094', type: 'expense', category: 'other_expense', account: '', amount: 40.0, date: '', remark: '咖啡', createdAt: 0 },
    { id: 'seed_tx_e095', type: 'expense', category: 'ad', account: '', amount: 1005.41, date: '', remark: '5月投流', createdAt: 0 },
    { id: 'seed_tx_e096', type: 'expense', category: 'ad', account: '', amount: 352.14, date: '', remark: '6月分投流', createdAt: 0 },
    { id: 'seed_tx_e097', type: 'expense', category: 'other_expense', account: '', amount: 36.0, date: '', remark: 'icloud', createdAt: 0 },
    { id: 'seed_tx_e098', type: 'expense', category: 'ad', account: '', amount: 193.33, date: '', remark: '清清片大号投流', createdAt: 0 },
  ],
  sensitiveWords: DEFAULT_SENSITIVE_WORDS,
}

// 清理文案末尾 👍/ 标注（用户用于标记「用 / 出单」），转 used / hasOrder
;(function cleanCopyMarkers() {
  const stripMarker = (content) => {
    const m = (content || '').match(/[\s]*([✅👍])\s*$/)
    if (!m) return { content: content || '', hasOrder: false, used: false }
    const cleaned = (content || '').replace(/[\s]*[✅👍]\s*$/, '')
    const isOrder = m[1] === '👍'
    return { content: cleaned, hasOrder: isOrder, used: true }
  }
  for (const p of defaultData.products) {
    for (const c of p.copies) {
      const r = stripMarker(c.content)
      c.content = r.content
      if (r.hasOrder) c.hasOrder = true
      if (r.used) c.used = true
    }
  }
})()

// 种子样品按 id 索引，用于迁移时把乱码名称回填为干净名称（保留用户已设状态/日期）
const SEED_SAMPLE_BY_ID = Object.fromEntries((defaultData.samples || []).map((s) => [s.id, s]))

// 收支迁移（作用于已导入数据）：从备注提取账号；自然堂洗面奶归样品收入；稿费归稿费收入
function migrateTransactions(txs) {
  if (!Array.isArray(txs)) return txs
  return txs.map((t) => {
    const nt = { ...t }
    if (!nt.account) {
      const r = nt.remark || ''
      if (r.includes('广东刘亦菲') || r.includes('刘亦菲')) nt.account = '广东刘亦菲'
      else if (r.includes('晚梨')) nt.account = '晚梨不吃梨'
      else if (r.includes('努力成为富婆') || r.includes('富婆')) nt.account = '努力成为富婆'
      else if (r.includes('小韩')) nt.account = '小韩'
    }
    const rm = nt.remark || ''
    if (rm.includes('自然堂洗面奶')) nt.category = 'sample'
    if (rm.includes('稿费')) nt.category = 'manuscript'
    return nt
  })
}

// 标题迁移：把旧版乱码/空话标题（含已导入数据）按新逻辑重刷；保留用户手改的标题
const OLD_TITLE_MARKERS = [
  '眼神还是太超前了', '开箱测评', '句句好美', '没早睡没擦粉', '句句漂看了',
  '天花板级别', '自由了，谁懂啊', '光泽感才是最显贵的', '界的天花板就是',
  '别急着下结论', '整体的光泽感', '买对了',
  // 上一版「香氛硬编码」错配标题（如把香水套到保健品）也一并重刷
  '喷了什么香水', '自带蔓越莓清香', '不用香水也自带氛围感', '淡淡的果香十分好闻', '气味自然又温柔', '清新治愈的蔓越莓香气',
]
// 版本升级时，按最新逻辑一次性重刷所有标题（确定性生成，同一条文案结果稳定）；
// 升级完成后版本号已更新，此后 loadData 不再触碰标题，用户手动改过的标题会被保留
function refreshAllTitles(products) {
  if (!Array.isArray(products)) return products
  return products.map((p) => {
    if (!p || !Array.isArray(p.copies) || !p.copies.length) return p
    const copies = p.copies.map((c) => ({
      ...c,
      title: generateTitle(c.content, p.name, p.brand, DEFAULT_SENSITIVE_WORDS),
    }))
    return { ...p, copies }
  })
}

// 合并洁比兔湿巾/湿厕纸为同一产品：用户曾分两条导入，按名称归一，避免重复显示
function consolidateJiebitudu(products) {
  const isJbt = (p) => p && /洁比兔/.test(p.name) && /(湿巾|湿厕纸)/.test(p.name)
  const out = []
  let merged = null
  for (const p of products) {
    if (!isJbt(p)) { out.push(p); continue }
    if (!merged) {
      merged = { ...p, name: '洁比兔 湿巾', copies: [...(p.copies || [])] }
    } else {
      const seen = new Set(merged.copies.map((c) => (c.content || '').replace(/\s+/g, '')))
      for (const c of (p.copies || [])) {
        const key = (c.content || '').replace(/\s+/g, '')
        if (!seen.has(key)) { merged.copies.push(c); seen.add(key) }
      }
    }
  }
  if (merged) out.push(merged)
  return out
}
// 自愈：洁比兔湿巾/湿厕纸 产品若混入非洁比兔文案（如 DOBO噗噗片），重置回干净种子
function sanitizeJiebitudu(products) {
  const isJbt = (p) => p && /洁比兔/.test(p.name) && /(湿巾|湿厕纸)/.test(p.name)
  const foreign = (c) => /(DOBO|噗噗通|噗噗片)/.test(c.content || '')
  return products.map((p) => {
    if (!isJbt(p)) return p
    if ((p.copies || []).some((c) => foreign(c.content))) {
      return { ...p, copies: jiebiwetSeed.map((c) => ({ ...c })) }
    }
    return p
  })
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
      return defaultData
    }
    let old
    try {
      old = JSON.parse(raw)
    } catch (e) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
      return defaultData
    }
    if (!old || !Array.isArray(old.products)) {
      localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
      return defaultData
    }
    const versionMismatch = savedVersion() !== CURRENT_VERSION
    // 非破坏性加载：完整保留用户已有的产品与全部文案、样品、收支；
    // 版本变更时仅刷新「卡审词库」为最新默认，并补充缺失的示例产品
    // 以用户保存的顺序为主：用 old.products 的顺序重建，种子仅用于刷新名称/品牌/分类/文案，并补齐缺失的新产品
    const presetById = new Map(defaultData.products.map((pr) => [pr.id, pr]))
    const products = []
    const seenIds = new Set()
    for (const user of old.products) {
      if (!user || !user.id) continue
      seenIds.add(user.id)
      const preset = presetById.get(user.id)
      if (preset) {
        const seedCopies = preset.copies || []
        const userCopies = user.copies || []
        const filledCopies = seedCopies.map((sc, i) => {
          const uc = userCopies[i]
          return uc ? { ...sc, used: uc.used, hasOrder: uc.hasOrder } : sc
        })
        const extraCopies = userCopies.slice(seedCopies.length)
        products.push({
          ...user,
          name: preset.name,
          brand: preset.brand,
          category: preset.category,
          copies: [...filledCopies, ...extraCopies],
        })
      } else {
        products.push(user)
      }
    }
    // 种子中有、但用户尚未拥有的新产品，追加到末尾
    for (const preset of defaultData.products) {
      if (!seenIds.has(preset.id)) products.push(preset)
    }
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
    let productsFinal = versionMismatch ? refreshAllTitles(products) : products

    // v14 迁移：用户指定的清清片爆单文案——缺失则新增并标记 hasOrder
    if (versionMismatch || savedVersion() === '13') {
      const BOMB_COPIES = [
        { label: '清清片离谱/穷爆', pattern: /离谱|没钱吃|穷爆/, content: '清清片你别太离谱\n我别以为我没钱吃了\n真的穷爆了!!!' },
        { label: '清清片断货/降价', pattern: /断货|白费|成分.*降价|努力.*白费/, content: '你一句是不是断货了?!\n就知道道的努力方有白费\n全金的成分\n你看看现在才降价啊' },
        { label: '清清片回购', pattern: /永远可以相信|赢回来|薅回来/, content: '你永远可以相信\n大馋丫头们的选品能力\n只要它不停产我就一直回购\n马上夏天了\n我要把之前输的都赢回来‼️' },
      ]
      productsFinal = productsFinal.map((p) => {
        if (!p || p.name !== '百草园清清片') return p
        if (!Array.isArray(p.copies)) return p
        const copies = p.copies.map((c) => {
          if (!c || !c.content || c.hasOrder) return c
          const hit = BOMB_COPIES.find((b) => b.pattern.test(c.content))
          if (!hit) return c
          console.log('[migrate] 标记爆单:', hit.label, c.content.slice(0, 30))
          return { ...c, hasOrder: true }
        })
        BOMB_COPIES.forEach((b) => {
          if (copies.some((c) => c.content && b.pattern.test(c.content))) return
          console.log('[migrate] 新增爆单:', b.label)
          copies.push({
            id: 'mig_bomb_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            content: b.content,
            title: generateTitle(b.content, '百草园清清片', '百草园', DEFAULT_SENSITIVE_WORDS),
            topics: [], style: '', used: false, usedDate: null, hasOrder: true, createdAt: Date.now(),
          })
        })
        return { ...p, copies }
      })
    }
    productsFinal = consolidateJiebitudu(productsFinal)
    productsFinal = sanitizeJiebitudu(productsFinal)
    // 洁比兔湿巾/湿厕纸 固定排第一
    const jbtIdx = productsFinal.findIndex((p) => p && /洁比兔/.test(p.name) && /(湿巾|湿厕纸)/.test(p.name))
    if (jbtIdx > 0) {
      const [jbt] = productsFinal.splice(jbtIdx, 1)
      productsFinal.unshift(jbt)
    }
    return {
      products: productsFinal,
      samples: (old.samples || []).map((s) => {
        const m = migrateSample(s)
        // 对所有种子样本，按 id 强制回填干净名称（覆盖任意历史乱码形态：GBK 乱码 /  损坏），保留状态/日期/账号/备注
        const seed = m && m.id ? SEED_SAMPLE_BY_ID[m.id] : null
        if (seed) return { ...m, name: seed.name, account: seed.account }
        return m
      }),
      transactions: migrateTransactions(Array.isArray(old.transactions) && old.transactions.length ? old.transactions : (defaultData.transactions || [])),
      sensitiveWords: versionMismatch ? DEFAULT_SENSITIVE_WORDS : (old.sensitiveWords || DEFAULT_SENSITIVE_WORDS),
    }
  } catch (e) {
    localStorage.setItem(VERSION_KEY, CURRENT_VERSION)
    return defaultData
  }
}

// 读取已保存的版本号（loadData 内部使用，避免重复读
function savedVersion() {
  try {
    return localStorage.getItem(VERSION_KEY)
  } catch (e) {
    return null
  }
}


function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ɰƷ published/orderCount/promoted/adCostǨƵ°棨status
function migrateSample(s) {
  if (!s) return s
  // °Ѻ statusֱӸ
  if (s.status) return s
  const published = !!s.published
  const orderCount = Number(s.orderCount) || 0
  const promoted = !!s.promoted
  let status = 'unpublished'
  if (published && orderCount > 5) status = 'hit'
  else if (published && !promoted) status = 'abandoned'
  else if (published) status = 'published'
  const { published: _p, orderCount: _o, promoted: _pr, adCost: _a, ...rest } = s
  return { ...rest, status }
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(loadData)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const addProduct = useCallback((product) => {
    const newProduct = {
      id: uid(),
      name: product.name,
      brand: product.brand || '',
      category: product.category || '',
      cover: product.cover || '',
      createdAt: Date.now(),
      copies: [],
    }
    setData((d) => ({ ...d, products: [newProduct, ...d.products] }))
    return newProduct.id
  }, [])

  const deleteProduct = useCallback((id) => {
    setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }))
  }, [])

  const updateProduct = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }))
  }, [])

  const setProductTopics = useCallback((productId, topics) => {
    setData((d) => ({
      ...d,
      products: d.products.map((p) => (p.id === productId ? { ...p, topics } : p)),
    }))
  }, [])

  const reorderProducts = useCallback((orderedIds) => {
    setData((d) => {
      const map = new Map(d.products.map((p) => [p.id, p]))
      const reordered = orderedIds.map((id) => map.get(id)).filter(Boolean)
      const extra = d.products.filter((p) => !orderedIds.includes(p.id))
      return { ...d, products: [...reordered, ...extra] }
    })
  }, [])

  const addCopy = useCallback((productId, copy) => {
    const newCopy = {
      id: uid(),
      content: copy.content || '',
      title: copy.title || '',
      topics: copy.topics || [],
      style: copy.style || '',
      used: false,
      usedDate: null,
      hasOrder: false,
      createdAt: Date.now(),
    }
    setData((d) => ({
      ...d,
      products: d.products.map((p) =>
        p.id === productId ? { ...p, copies: [newCopy, ...p.copies] } : p
      ),
    }))
    return newCopy.id
  }, [])

  const addCopies = useCallback((productId, list) => {
    if (!list || list.length === 0) return
    setData((d) => ({
      ...d,
      products: d.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              copies: [
                ...list.map((c) => {
                  const hasOrder = !!c.hasOrder
                  const used = hasOrder || !!c.used
                  return {
                    id: uid(),
                    content: c.content || '',
                    title: c.title || '',
                    topics: c.topics || [],
                    style: '',
                    used,
                    usedDate: used ? todayStr() : null,
                    hasOrder,
                    createdAt: Date.now(),
                  }
                }),
                ...p.copies,
              ],
            }
          : p
      ),
    }))
  }, [])

  const deleteCopy = useCallback((productId, copyId) => {
    setData((d) => ({
      ...d,
      products: d.products.map((p) =>
        p.id === productId
          ? { ...p, copies: p.copies.filter((c) => c.id !== copyId) }
          : p
      ),
    }))
  }, [])

  // 清空某产品的全部文案（用于全量重新导入前，避免和旧文案重复）
  const clearCopies = useCallback((productId) => {
    setData((d) => ({
      ...d,
      products: d.products.map((p) =>
        p.id === productId ? { ...p, copies: [] } : p
      ),
    }))
  }, [])

  const updateCopy = useCallback((productId, copyId, patch) => {
    setData((d) => ({
      ...d,
      products: d.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              copies: p.copies.map((c) =>
                c.id === copyId ? { ...c, ...patch } : c
              ),
            }
          : p
      ),
    }))
  }, [])

  const addSample = useCallback((sample) => {
    const newSample = {
      id: uid(),
      name: sample.name || '',
      account: sample.account || '',
      receiveDate: sample.receiveDate || '',
      deadline: sample.deadline || '',
      remark: sample.remark || '',
      status: sample.status || 'unpublished',
      createdAt: Date.now(),
    }
    setData((d) => ({ ...d, samples: [newSample, ...d.samples] }))
    return newSample.id
  }, [])

  const deleteSample = useCallback((id) => {
    setData((d) => ({ ...d, samples: d.samples.filter((s) => s.id !== id) }))
  }, [])

  const updateSample = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      samples: d.samples.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }))
  }, [])

  const addTransaction = useCallback((tx) => {
    const newTx = {
      id: uid(),
      type: tx.type || 'income',
      category: tx.category || '',
      account: tx.account || '',
      amount: Number(tx.amount) || 0,
      date: tx.date || new Date().toISOString().slice(0, 10),
      remark: tx.remark || '',
      createdAt: Date.now(),
    }
    setData((d) => ({ ...d, transactions: [newTx, ...d.transactions] }))
    return newTx.id
  }, [])

  const deleteTransaction = useCallback((id) => {
    setData((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }))
  }, [])

  const updateTransaction = useCallback((id, patch) => {
    setData((d) => ({
      ...d,
      transactions: d.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }, [])

  const addSensitiveWord = useCallback((word) => {
    const w = (word || '').trim()
    if (!w) return
    setData((d) =>
      d.sensitiveWords.includes(w)
        ? d
        : { ...d, sensitiveWords: [...d.sensitiveWords, w] }
    )
  }, [])

  const deleteSensitiveWord = useCallback((word) => {
    setData((d) => ({ ...d, sensitiveWords: d.sensitiveWords.filter((w) => w !== word) }))
  }, [])

  const resetData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(VERSION_KEY)
    } catch (e) {}
    if (typeof window !== 'undefined') window.location.reload()
  }, [])

  const value = {
    ...data,
    addProduct, deleteProduct, updateProduct, reorderProducts, setProductTopics,
    addCopy, deleteCopy, updateCopy, addCopies, clearCopies,
    addSample, deleteSample, updateSample,
    addTransaction, deleteTransaction, updateTransaction,
    addSensitiveWord, deleteSensitiveWord, resetData,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
