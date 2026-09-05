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
