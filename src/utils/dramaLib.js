// 内置剧名库：剧名 → { year, cast }。
// 用户在「追剧」模块新增在追剧名时，自动带出年份与主演；未命中可手动填写。
// 纯前端内置快照（非实时联网），覆盖近年热门剧集。

export const DRAMA_LIB = [
  // ── 2025 ──
  { name: '藏海传', year: 2025, cast: '肖战 / 张婧仪 / 周奇 / 黄觉' },
  { name: '凡人修仙传', year: 2025, cast: '杨洋 / 金晨 / 汪铎' },
  { name: '临江仙', year: 2025, cast: '白鹿 / 曾舜晞 / 何瑞贤' },
  { name: '书卷一梦', year: 2025, cast: '李一桐 / 刘宇宁 / 祝绪丹' },
  { name: '折腰', year: 2025, cast: '宋祖儿 / 刘宇宁 / 宣璐' },
  { name: '无忧渡', year: 2025, cast: '任嘉伦 / 宋祖儿 / 曹骏' },
  { name: '淮水竹亭', year: 2025, cast: '刘诗诗 / 张云龙 / 孟子义' },
  { name: '难哄', year: 2025, cast: '白敬亭 / 章若楠 / 陈昊森' },
  { name: '爱你', year: 2025, cast: '张凌赫 / 徐若晗 / 王宥钧' },
  { name: '滤镜', year: 2025, cast: '檀健次 / 李兰迪 / 高瀚宇' },
  { name: '北上', year: 2025, cast: '白鹿 / 欧豪 / 翟子路 / 高至霆' },
  { name: '长安的荔枝', year: 2025, cast: '雷佳音 / 岳云鹏 / 那尔那茜 / 郭涛' },
  { name: '仙台有树', year: 2025, cast: '邓为 / 向涵之 / 陈鑫海' },
  { name: '似锦', year: 2025, cast: '景甜 / 张晚意 / 郭涛' },
  { name: '桃花映江山', year: 2025, cast: '刘学义 / 孟子义 / 高寒' },
  { name: '子夜归', year: 2025, cast: '许凯 / 田曦薇 / 王佳佳' },
  { name: '锦月如歌', year: 2025, cast: '周也 / 丞磊 / 张予曦' },
  { name: '朝雪录', year: 2025, cast: '李兰迪 / 敖瑞鹏 / 余承恩' },
  { name: '山河枕', year: 2025, cast: '宋茜 / 丁禹兮 / 夏志远' },
  { name: '赴山海', year: 2025, cast: '成毅 / 娜扎 / 李凯馨' },

  // ── 2024 ──
  { name: '与凤行', year: 2024, cast: '赵丽颖 / 林更新 / 辛云来 / 何与' },
  { name: '玫瑰的故事', year: 2024, cast: '刘亦菲 / 佟大为 / 林更新 / 万茜' },
  { name: '庆余年第二季', year: 2024, cast: '张若昀 / 李沁 / 陈道明 / 吴刚' },
  { name: '长相思第二季', year: 2024, cast: '杨紫 / 张晚意 / 邓为 / 檀健次' },
  { name: '永夜星河', year: 2024, cast: '虞书欣 / 丁禹兮 / 祝绪丹 / 杨仕泽' },
  { name: '唐朝诡事录之西行', year: 2024, cast: '杨旭文 / 杨志刚 / 郜思雯 / 陈创' },
  { name: '小巷人家', year: 2024, cast: '闫妮 / 李光洁 / 郭晓东 / 蒋欣' },
  { name: '南来北往', year: 2024, cast: '白敬亭 / 金晨 / 丁勇岱 / 刘冠麟' },
  { name: '凡人歌', year: 2024, cast: '殷桃 / 王骁 / 章若楠 / 秦俊杰' },
  { name: '我的阿勒泰', year: 2024, cast: '马伊琍 / 周依然 / 于适 / 蒋奇明' },
  { name: '墨雨云间', year: 2024, cast: '吴谨言 / 王星越 / 陈鑫海 / 杨超越' },
  { name: '大奉打更人', year: 2024, cast: '王鹤棣 / 田曦薇 / 刘奕君 / 晏紫东' },
  { name: '九重紫', year: 2024, cast: '孟子义 / 李昀锐 / 孔雪儿' },
  { name: '山花烂漫时', year: 2024, cast: '宋佳 / 兰西雅 / 都兰 / 聂远' },
  { name: '猎罪图鉴2', year: 2024, cast: '檀健次 / 金世佳 / 张柏嘉' },
  { name: '流水迢迢', year: 2024, cast: '任嘉伦 / 李兰迪 / 徐正溪' },
  { name: '春花焰', year: 2024, cast: '刘学义 / 吴谨言 / 毕雯珺' },
  { name: '七夜雪', year: 2024, cast: '李沁 / 曾舜晞 / 王弘毅' },
  { name: '锦绣安宁', year: 2024, cast: '张晚意 / 任敏 / 此沙' },
  { name: '清明上河图密码', year: 2024, cast: '张颂文 / 白百何 / 周一围' },
  { name: '雪迷宫', year: 2024, cast: '黄景瑜 / 章宇 / 王子奇 / 谢可寅' },

  // ── 2023 ──
  { name: '狂飙', year: 2023, cast: '张译 / 张颂文 / 李一桐 / 张志坚' },
  { name: '漫长的季节', year: 2023, cast: '范伟 / 秦昊 / 陈明昊 / 李庚希' },
  { name: '繁花', year: 2023, cast: '胡歌 / 马伊琍 / 唐嫣 / 辛芷蕾' },
  { name: '三体', year: 2023, cast: '张鲁一 / 于和伟 / 陈瑾 / 王子文' },
  { name: '去有风的地方', year: 2023, cast: '刘亦菲 / 李现 / 胡冰卿 / 牛骏峰' },
  { name: '莲花楼', year: 2023, cast: '成毅 / 曾舜晞 / 肖顺尧 / 陈都灵' },
  { name: '长相思', year: 2023, cast: '杨紫 / 张晚意 / 邓为 / 檀健次' },
  { name: '装腔启示录', year: 2023, cast: '蔡文静 / 韩东君 / 耿乐' },

  // ── 2022 ──
  { name: '黑暗荣耀', year: 2022, cast: '宋慧乔 / 李到晛 / 林智妍 / 郑成日' },
  { name: '我的解放日志', year: 2022, cast: '李民基 / 金智媛 / 孙锡求' },
  { name: '非常律师禹英禑', year: 2022, cast: '朴恩斌 / 姜泰伍 / 姜其永' },

  // ── 2021 ──
  { name: '华灯初上', year: 2021, cast: '林心如 / 杨谨华 / 杨祐宁 / 凤小岳' },
  { name: '开端', year: 2021, cast: '白敬亭 / 赵今麦 / 刘奕君' },

  // ── 2020 ──
  { name: '沉默的真相', year: 2020, cast: '廖凡 / 白宇 / 谭卓 / 宁理' },
  { name: '隐秘的角落', year: 2020, cast: '秦昊 / 王景春 / 荣梓杉 / 史彭元' },
  { name: '三十而已', year: 2020, cast: '江疏影 / 童瑶 / 毛晓彤 / 杨玏' },
  { name: '机智的医生生活', year: 2020, cast: '曹政奭 / 柳演锡 / 郑敬淏 / 田美都' },

  // ── 经典 ──
  { name: '想见你', year: 2019, cast: '柯佳嬿 / 许光汉 / 施柏宇' },
  { name: '庆余年', year: 2019, cast: '张若昀 / 李沁 / 陈道明 / 吴刚' },
  { name: '请回答1988', year: 2015, cast: '李惠利 / 朴宝剑 / 柳俊烈 / 高庚杓' },
  { name: '我可能不会爱你', year: 2011, cast: '林依晨 / 陈柏霖 / 王阳明' },
  { name: '来自星星的你', year: 2013, cast: '全智贤 / 金秀贤 / 朴海镇' },
  { name: '鬼怪', year: 2016, cast: '孔刘 / 金高银 / 李栋旭 / 刘仁娜' },
  { name: '琅琊榜', year: 2015, cast: '胡歌 / 刘涛 / 王凯 / 黄维德' },
  { name: '甄嬛传', year: 2011, cast: '孙俪 / 陈建斌 / 蔡少芬 / 蒋欣' },

  // ── 2025 增补 ──
  { name: '值得爱', year: 2025, cast: '王安宇 / 王玉雯' },
  { name: '人生若如初见', year: 2025, cast: '李现 / 春夏 / 魏大勋' },
  { name: '七根心简', year: 2025, cast: '宋威龙 / 刘浩存' },

  // ── 2024 增补 ──
  { name: '承欢记', year: 2024, cast: '杨紫 / 许凯 / 何赛飞' },
  { name: '追风者', year: 2024, cast: '王一博 / 李沁 / 王阳' },
  { name: '孤舟', year: 2024, cast: '曾舜晞 / 陈都灵' },
  { name: '长乐曲', year: 2024, cast: '丁禹兮 / 邓恩熙' },
  { name: '四方馆', year: 2024, cast: '檀健次 / 周依然' },
  { name: '度华年', year: 2024, cast: '赵今麦 / 张凌赫' },
  { name: '城中之城', year: 2024, cast: '白宇帆 / 夏梦 / 王骁' },

  // ── 2023 增补 ──
  { name: '一念关山', year: 2023, cast: '刘诗诗 / 刘宇宁' },
  { name: '好事成双', year: 2023, cast: '张小斐 / 黄晓明 / 张嘉倪' },
  { name: '问心', year: 2023, cast: '赵又廷 / 毛晓彤 / 陈冲' },
  { name: '无所畏惧', year: 2023, cast: '热依扎 / 王阳' },
  { name: '鸣龙少年', year: 2023, cast: '张若昀 / 黄尧' },
  { name: '平凡之路', year: 2023, cast: '郭麒麟 / 金晨' },
  { name: '父辈的荣耀', year: 2023, cast: '张晚意 / 郭涛 / 刘琳' },
  { name: '特工任务', year: 2023, cast: '韩庚 / 魏大勋 / 李一桐' },
  { name: '潜行者', year: 2023, cast: '黄晓明 / 蒋欣' },

  // ── 2022 增补 ──
  { name: '梦华录', year: 2022, cast: '刘亦菲 / 陈晓 / 柳岩' },
  { name: '苍兰诀', year: 2022, cast: '王鹤棣 / 虞书欣 / 张凌赫' },
  { name: '星汉灿烂', year: 2022, cast: '吴磊 / 赵今麦' },
  { name: '月升沧海', year: 2022, cast: '吴磊 / 赵今麦' },
  { name: '余生请多指教', year: 2022, cast: '杨紫 / 肖战' },
  { name: '风吹半夏', year: 2022, cast: '赵丽颖 / 欧豪 / 李光洁' },
  { name: '警察荣誉', year: 2022, cast: '张若昀 / 白鹿 / 王景春' },
  { name: '天才基本法', year: 2022, cast: '雷佳音 / 张子枫 / 张新成' },
  { name: '天下长河', year: 2022, cast: '罗晋 / 尹昉 / 黄志忠' },
  { name: '关于唐医生的一切', year: 2022, cast: '秦岚 / 魏大勋' },
  { name: '冰雨火', year: 2022, cast: '陈晓 / 王一博' },
  { name: '风起陇西', year: 2022, cast: '陈坤 / 白宇 / 聂远' },
  { name: '重生之门', year: 2022, cast: '张译 / 王俊凯' },
  { name: '幸福到万家', year: 2022, cast: '赵丽颖 / 罗晋' },
  { name: '县委大院', year: 2022, cast: '胡歌 / 吴越 / 张新成' },
  { name: '猎罪图鉴', year: 2022, cast: '檀健次 / 金世佳' },
  { name: '唐朝诡事录', year: 2022, cast: '杨旭文 / 杨志刚' },

  // ── 2021 增补 ──
  { name: '山海情', year: 2021, cast: '黄轩 / 张嘉译 / 闫妮 / 热依扎' },
  { name: '觉醒年代', year: 2021, cast: '于和伟 / 张桐 / 侯京健' },
  { name: '你是我的荣耀', year: 2021, cast: '杨洋 / 迪丽热巴' },
  { name: '司藤', year: 2021, cast: '景甜 / 张彬彬' },
  { name: '周生如故', year: 2021, cast: '任嘉伦 / 白鹿' },
  { name: '一生一世', year: 2021, cast: '任嘉伦 / 白鹿' },
  { name: '乔家的儿女', year: 2021, cast: '白宇 / 宋祖儿 / 毛晓彤' },
  { name: '小敏家', year: 2021, cast: '周迅 / 黄磊 / 唐艺昕' },
  { name: '斛珠夫人', year: 2021, cast: '杨幂 / 陈伟霆' },
  { name: '雪中悍刀行', year: 2021, cast: '张若昀 / 李庚希 / 胡军' },
  { name: '叛逆者', year: 2021, cast: '朱一龙 / 童瑶 / 王志文' },
  { name: '风起洛阳', year: 2021, cast: '黄轩 / 宋茜 / 王一博' },

  // ── 2020 增补 ──
  { name: '二十不惑', year: 2020, cast: '关晓彤 / 卜冠今 / 李庚希' },
  { name: '安家', year: 2020, cast: '孙俪 / 罗晋' },
  { name: '清平乐', year: 2020, cast: '王凯 / 江疏影' },
  { name: '大江大河2', year: 2020, cast: '王凯 / 杨烁 / 董子健' },
  { name: '装台', year: 2020, cast: '张嘉译 / 闫妮' },
  { name: '鬓边不是海棠红', year: 2020, cast: '黄晓明 / 尹正 / 佘诗曼' },
  { name: '棋魂', year: 2020, cast: '胡先煦 / 张超' },
  { name: '燕云台', year: 2020, cast: '唐嫣 / 窦骁 / 佘诗曼' },
  { name: '风犬少年的天空', year: 2020, cast: '张一山 / 李庚希 / 周依然' },

  // ── 2019 增补 ──
  { name: '都挺好', year: 2019, cast: '姚晨 / 倪大红 / 郭京飞' },
  { name: '知否知否应是绿肥红瘦', year: 2019, cast: '赵丽颖 / 冯绍峰 / 朱一龙' },
  { name: '亲爱的，热爱的', year: 2019, cast: '杨紫 / 李现' },
  { name: '小欢喜', year: 2019, cast: '黄磊 / 海清 / 陶虹' },
  { name: '长安十二时辰', year: 2019, cast: '易烊千玺 / 雷佳音' },
  { name: '陈情令', year: 2019, cast: '肖战 / 王一博 / 孟子义' },
  { name: '少年派', year: 2019, cast: '张嘉译 / 闫妮 / 赵今麦' },
  { name: '破冰行动', year: 2019, cast: '黄景瑜 / 吴刚 / 任达华' },
  { name: '在远方', year: 2019, cast: '刘烨 / 马伊琍' },
  { name: '老酒馆', year: 2019, cast: '陈宝国 / 秦海璐' },

  // ── 2018 增补 ──
  { name: '大江大河', year: 2018, cast: '王凯 / 杨烁 / 董子健' },
  { name: '延禧攻略', year: 2018, cast: '吴谨言 / 秦岚 / 聂远 / 佘诗曼' },
  { name: '如懿传', year: 2018, cast: '周迅 / 霍建华' },
  { name: '香蜜沉沉烬如霜', year: 2018, cast: '杨紫 / 邓伦' },
  { name: '天盛长歌', year: 2018, cast: '陈坤 / 倪妮' },
  { name: '镇魂', year: 2018, cast: '白宇 / 朱一龙' },

  // ── 2017 增补 ──
  { name: '三生三世十里桃花', year: 2017, cast: '杨幂 / 赵又廷 / 张智尧' },
  { name: '人民的名义', year: 2017, cast: '陆毅 / 吴刚 / 张丰毅' },
  { name: '白夜追凶', year: 2017, cast: '潘粤明 / 王泷正' },
  { name: '那年花开月正圆', year: 2017, cast: '孙俪 / 陈晓 / 何润东' },
  { name: '我的前半生', year: 2017, cast: '靳东 / 马伊琍 / 袁泉' },
  { name: '鸡毛飞上天', year: 2017, cast: '张译 / 殷桃' },
  { name: '军师联盟', year: 2017, cast: '吴秀波 / 刘涛 / 李晨' },
  { name: '无证之罪', year: 2017, cast: '秦昊 / 邓家佳' },

  // ── 2016 增补 ──
  { name: '欢乐颂', year: 2016, cast: '刘涛 / 蒋欣 / 王子文 / 杨紫' },
  { name: '青云志', year: 2016, cast: '李易峰 / 赵丽颖 / 杨紫' },
  { name: '微微一笑很倾城', year: 2016, cast: '郑爽 / 杨洋' },
  { name: '好先生', year: 2016, cast: '孙红雷 / 江疏影' },
  { name: '锦绣未央', year: 2016, cast: '唐嫣 / 罗晋' },

  // ── 2015 增补 ──
  { name: '伪装者', year: 2015, cast: '胡歌 / 靳东 / 王凯 / 宋轶' },
  { name: '花千骨', year: 2015, cast: '赵丽颖 / 霍建华 / 马可' },
  { name: '何以笙箫默', year: 2015, cast: '钟汉良 / 唐嫣' },

  // ── 韩国增补 ──
  { name: '太阳的后裔', year: 2016, cast: '宋仲基 / 宋慧乔' },
  { name: '信号', year: 2016, cast: '李帝勋 / 赵震雄 / 金惠秀' },
  { name: '经常请吃饭的漂亮姐姐', year: 2018, cast: '孙艺珍 / 丁海寅' },
  { name: '我的大叔', year: 2018, cast: '李善均 / 李知恩' },
  { name: '夫妻的世界', year: 2020, cast: '金喜善 / 朴海俊' },
  { name: '二十五二十一', year: 2022, cast: '南柱赫 / 金泰梨' },
  { name: '鱿鱼游戏', year: 2021, cast: '李政宰 / 朴海秀' },
  { name: '财阀家的小儿子', year: 2022, cast: '宋仲基 / 李星民' },
  { name: '梨泰院Class', year: 2020, cast: '朴叙俊 / 金多美' },
  { name: '虽然是精神病但没关系', year: 2020, cast: '金秀贤 / 徐睿知' },
  { name: '请回答1997', year: 2012, cast: '郑恩地 / 徐仁国' },
  { name: '请回答1994', year: 2013, cast: '高雅拉 / 郑宇' },

  // ── 台湾增补 ──
  { name: '我们与恶的距离', year: 2019, cast: '贾静雯 / 吴慷仁 / 陈柏霖' },
  { name: '俗女养成记', year: 2019, cast: '谢盈萱' },
  { name: '茶金', year: 2021, cast: '连俞涵 / 温升豪' },

  // ── 泰国增补 ──
  { name: '黑帮少爷爱上我', year: 2022, cast: '瓦奇拉维特 / 吉拉瓦' },
  { name: '以你的心诠释我的爱', year: 2020, cast: '普提蓬 / 克里特' },
]

function norm(s) {
  return (s || '').replace(/[《》\s]/g, '').toLowerCase()
}

// 精确匹配（去标点 / 大小写）
export function findDramaExact(name) {
  const q = norm(name)
  if (!q) return null
  return DRAMA_LIB.find((d) => norm(d.name) === q) || null
}

// 模糊匹配：返回含有关键词的所有候选（用于下拉联想）
export function searchDramas(name) {
  const q = norm(name)
  if (!q) return []
  return DRAMA_LIB.filter((d) => norm(d.name).includes(q) || q.includes(norm(d.name)))
}

// ── 联网查询（Wikidata，支持浏览器跨域 origin=*） ──
// 内置剧名库未命中时，尝试联网补全年份 / 主演。失败或查不到返回 null。
const WD = 'https://www.wikidata.org/w/api.php'
const TV_HINT = /电视剧|连续剧|网剧|剧集|情景剧/

async function wdJson(url, timeout = 8000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function lookupDramaOnline(rawName) {
  const q = (rawName || '').trim()
  if (!q) return null
  // 1) 搜索实体
  const sData = await wdJson(
    `${WD}?action=wbsearchentities&search=${encodeURIComponent(q)}&language=zh&format=json&origin=*&limit=6`
  )
  const list = (sData && sData.search) || []
  if (!list.length) return null
  // 优先取「电视剧」类且名称接近的；否则取第一个
  const ent =
    list.find((x) => TV_HINT.test(x.description || '') && norm(x.label || '') === norm(q)) ||
    list.find((x) => TV_HINT.test(x.description || '')) ||
    list.find((x) => norm(x.label || '') === norm(q)) ||
    list[0]
  if (!ent || !ent.id) return null
  // 2) 读取结构化字段：P577=首播时间，P161=主演
  const eData = await wdJson(
    `${WD}?action=wbgetentities&ids=${ent.id}&props=claims&format=json&origin=*`
  )
  const claims = (eData && eData.entities && eData.entities[ent.id] && eData.entities[ent.id].claims) || {}
  let year = ''
  const p577 = claims.P577
  if (p577 && p577[0]) {
    const t = p577[0].mainsnak && p577[0].mainsnak.datavalue && p577[0].mainsnak.datavalue.value
    if (t && t.time) {
      const m = /^\+?(\d{4})/.exec(t.time)
      if (m) year = m[1]
    }
  }
  let cast = ''
  const p161 = claims.P161
  if (p161 && p161.length) {
    const ids = p161
      .slice(0, 10)
      .map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id)
      .filter(Boolean)
    if (ids.length) {
      const lData = await wdJson(
        `${WD}?action=wbgetentities&ids=${ids.join('|')}&props=labels&languages=zh&format=json&origin=*`
      )
      const ents = (lData && lData.entities) || {}
      const names = ids
        .map((id) => (ents[id] && ents[id].labels && (ents[id].labels.zh || ents[id].labels.en || {}).value))
        .filter(Boolean)
      cast = names.join(' / ')
    }
  }
  if (!year && !cast) return null
  return { name: q, year, cast }
}
