// 逐日分时日程。改完运行 node tools/build.js，重新计算每天相邻地点之间的车程。
// 每天：{ d: 日期, at: 当天所在站点 id, items: [...] }
// 每项：{ t: 开始时间, s: 景点名（在当天站点的景点里按前缀匹配）| base: 站点 id（住处）| ll: [lng,lat] 自定坐标,
//         name?: 显示名, dur?: 分钟, k?: drive|sight|meal|rest|stay, note?, via?: 途经点（GCJ-02） }
// 没有坐标的项（吃饭、休息）不参与车程计算。
window.SCHEDULE = [
  { d: "2026-12-10", at: "ningbo", items: [
    { t: "09:00", base: "suzhou", k: "drive", name: "吴园出发" },
    { t: "10:40", ll: [121.170, 30.400], k: "rest", name: "杭州湾跨海大桥 · 海天一洲服务区", dur: 30, note: "大桥中段的观景平台，休息、上洗手间" },
    { t: "12:30", base: "ningbo", k: "stay", name: "到甬园，午饭、入住", dur: 150 },
    { t: "16:00", s: "东钱湖 · 韩岭", dur: 90, note: "第一天轻松一点，湖边散步" },
    { t: "18:30", k: "meal", name: "晚饭：宁波菜（雪菜大汤黄鱼、汤圆）" } ] },
  { d: "2026-12-11", at: "ningbo", items: [
    { t: "09:30", s: "天一阁", dur: 150 },
    { t: "12:00", k: "meal", name: "午饭：月湖边" },
    { t: "13:00", base: "ningbo", k: "rest", name: "回园午休", dur: 120 },
    { t: "15:30", s: "宁波博物馆", dur: 90, note: "周一闭馆，今天周五开放" },
    { t: "18:30", s: "老外滩", dur: 120, note: "晚饭加夜景" } ] },
  { d: "2026-12-12", at: "ningbo", items: [
    { t: "09:00", s: "保国寺", dur: 90 },
    { t: "11:00", s: "河姆渡", dur: 90 },
    { t: "12:45", k: "meal", name: "午饭：余姚" },
    { t: "15:30", s: "东钱湖湖景酒店", dur: 120, note: "可以分头：一路继续看溪口，一路去湖边喝下午茶" } ] },
  { d: "2026-12-13", at: "wenzhou", items: [
    { t: "09:00", base: "ningbo", k: "drive", name: "甬园出发" },
    { t: "11:30", s: "雁荡山", dur: 150, note: "在景区里吃午饭；只走灵峰平路" },
    { t: "16:00", base: "wenzhou", k: "stay", name: "到瓯园，入住休息" } ] },
  { d: "2026-12-14", at: "wenzhou", items: [
    { t: "09:30", s: "江心屿", dur: 150, note: "博物馆今天闭馆，所以先去江心屿" },
    { t: "12:15", k: "meal", name: "午饭：五马街（鱼丸、灯盏糕）" },
    { t: "13:30", s: "五马街", dur: 60 },
    { t: "15:00", base: "wenzhou", k: "rest", name: "回园午休", dur: 120 },
    { t: "17:00", s: "三垟湿地", dur: 60, note: "就在园区旁边，傍晚散步" } ] },
  { d: "2026-12-15", at: "wenzhou", items: [
    { t: "09:30", s: "温州博物馆", dur: 90 },
    { t: "11:15", s: "朔门古港", dur: 60 },
    { t: "12:30", k: "meal", name: "午饭" },
    { t: "14:30", s: "洞头", dur: 180, note: "也可以换成楠溪江古村，看天气决定" } ] },
  { d: "2026-12-16", at: "fuzhou", items: [
    { t: "09:00", base: "wenzhou", k: "drive", name: "瓯园出发" },
    { t: "11:30", k: "meal", name: "沿途服务区午饭、长休", note: "全程最长的一段，中途至少停两次" },
    { t: "14:30", base: "fuzhou", k: "stay", name: "到福园，入住休息" } ] },
  { d: "2026-12-17", at: "fuzhou", items: [
    { t: "09:30", s: "三坊七巷", dur: 180, note: "林则徐纪念馆、严复故居、冰心故居" },
    { t: "12:30", k: "meal", name: "午饭：鱼丸、肉燕、锅边糊" },
    { t: "14:30", s: "福建博物院", dur: 90 },
    { t: "18:30", s: "上下杭", dur: 90, note: "晚饭加夜游" } ] },
  { d: "2026-12-18", at: "fuzhou", items: [
    { t: "09:00", s: "鼓岭", dur: 150, note: "盘山路，晕车的话提前吃药" },
    { t: "12:00", k: "meal", name: "午饭：鼓岭" },
    { t: "14:30", s: "马尾", dur: 120 },
    { t: "17:30", base: "fuzhou", k: "stay", name: "回园" } ] },
  { d: "2026-12-19", at: "xiamen", items: [
    { t: "09:00", base: "fuzhou", k: "drive", name: "福园出发" },
    { t: "12:30", base: "xiamen", k: "stay", name: "到鹭园，午饭、入住", dur: 120 },
    { t: "15:00", s: "集美学村", dur: 120 } ] },
  { d: "2026-12-20", at: "xiamen", items: [
    { t: "10:00", s: "泉州 · 开元寺", dur: 150 },
    { t: "12:30", k: "meal", name: "午饭：西街（面线糊、润饼）" },
    { t: "14:00", s: "泉州海外交通史", dur: 90 },
    { t: "16:00", s: "泉州 · 蟳埔村", dur: 60 },
    { t: "18:00", base: "xiamen", k: "stay", name: "回园" } ] },
  { d: "2026-12-21", at: "xiamen", items: [
    { t: "09:00", s: "鼓浪屿", dur: 270, note: "提前买船票；岛上坡多，走龙头路一带；在岛上吃午饭" },
    { t: "14:30", s: "胡里山炮台", dur: 60 },
    { t: "16:00", s: "沙坡尾", dur: 120, note: "环岛路看日落，晚饭在沙坡尾" } ] },
  { d: "2026-12-22", at: "shantou", items: [
    { t: "09:00", base: "xiamen", k: "drive", name: "鹭园出发", note: "今天冬至，路上会跨过北回归线" },
    { t: "12:30", base: "shantou", k: "stay", name: "到汕头，午饭、入住", dur: 150 },
    { t: "15:30", s: "小公园开埠区", dur: 120 },
    { t: "18:00", s: "牛肉火锅", dur: 90 } ] },
  { d: "2026-12-23", at: "shantou", items: [
    { t: "09:00", base: "shantou", k: "drive", name: "出发去潮州" },
    { t: "10:00", s: "潮州古城", dur: 360, note: "广济桥、牌坊街、许驸马府；在古城里吃午饭，傍晚看灯" },
    { t: "17:00", base: "shantou", k: "stay", name: "回汕头" } ] },
  { d: "2026-12-24", at: "shantou", items: [
    { t: "09:00", s: "南澳岛", dur: 240, note: "北回归线标志塔、青澳湾；在岛上吃海鲜午饭" },
    { t: "15:30", s: "侨批文物馆", dur: 60 },
    { t: "18:30", k: "meal", name: "晚饭：潮汕卤味、砂锅粥" } ] },
  { d: "2026-12-25", at: "shenzhen", items: [
    { t: "09:00", base: "shantou", k: "drive", name: "汕头出发" },
    { t: "11:30", k: "meal", name: "沿途服务区午饭、长休" },
    { t: "14:00", base: "shenzhen", k: "stay", name: "到鹏园，入住休息" },
    { t: "16:30", s: "大鹏所城", dur: 90 } ] },
  { d: "2026-12-26", at: "shenzhen", items: [
    { t: "09:30", s: "大鹏半岛国家地质公园", dur: 120 },
    { t: "12:00", k: "meal", name: "午饭：南澳海鲜" },
    { t: "14:30", s: "西涌沙滩", dur: 120, note: "也可以分头去东江纵队纪念馆" },
    { t: "17:00", base: "shenzhen", k: "stay", name: "回园" } ] },
  { d: "2026-12-27", at: "shenzhen", items: [
    { t: "09:00", s: "深圳博物馆", dur: 120, note: "周日进城，早点出发" },
    { t: "12:00", k: "meal", name: "午饭：福田" },
    { t: "13:30", s: "莲花山公园", dur: 60 },
    { t: "15:00", s: "深圳湾公园", dur: 90, note: "看候鸟；17 点前往回走，避开回大鹏的车流" },
    { t: "17:30", base: "shenzhen", k: "stay", name: "回园" } ] },
  { d: "2026-12-28", at: "zhuhai", items: [
    { t: "09:30", base: "shenzhen", k: "drive", name: "鹏园出发" },
    { t: "12:00", base: "zhuhai", k: "stay", name: "过深中通道，经中山到珠海；午饭、入住", via: [[113.640, 22.520]], dur: 150 },
    { t: "15:00", s: "唐家湾古镇", dur: 120 },
    { t: "17:30", s: "情侣路", dur: 60 } ] },
  { d: "2026-12-29", at: "zhuhai", items: [
    { t: "10:00", s: "日月贝", dur: 120 },
    { t: "12:30", k: "meal", name: "午饭" },
    { t: "15:00", s: "澳门历史城区", dur: 240, note: "可选：步行从拱北口岸过关，要港澳通行证和签注；不去的话就在酒店休息" } ] },
  { d: "2026-12-30", at: "yangjiang", items: [
    { t: "09:00", base: "zhuhai", k: "drive", name: "珠海出发" },
    { t: "12:30", base: "yangjiang", k: "stay", name: "到闸坡，午饭、入住", dur: 90 },
    { t: "14:30", s: "广东海上丝绸之路博物馆", dur: 120 },
    { t: "18:00", s: "闸坡渔港", dur: 90 } ] },
  { d: "2026-12-31", at: "zhanjiang", items: [
    { t: "08:00", s: "十里银滩", dur: 60, note: "早上沿着沙滩散步" },
    { t: "10:00", base: "yangjiang", k: "drive", name: "从闸坡出发" },
    { t: "13:30", base: "zhanjiang", k: "stay", name: "到湛江，午饭、入住", dur: 120 },
    { t: "15:30", s: "广州湾法国公使署", dur: 90 },
    { t: "20:00", s: "金沙湾", dur: 120, note: "跨年夜在海边" } ] },
  { d: "2027-01-01", at: "zhanjiang", items: [
    { t: "09:30", s: "湖光岩", dur: 150 },
    { t: "12:30", k: "meal", name: "午饭" },
    { t: "15:30", s: "东风市场", dur: 90, note: "买海鲜让店里加工" } ] },
  { d: "2027-01-02", at: "xuwen", items: [
    { t: "10:00", base: "zhanjiang", k: "drive", name: "湛江出发" },
    { t: "12:00", base: "xuwen", k: "stay", name: "到徐闻，午饭、入住", dur: 150 },
    { t: "16:00", s: "灯楼角", dur: 150, note: "看日落，日落时间约 18:15" } ] },
  { d: "2027-01-03", at: "haikou", items: [
    { t: "08:30", s: "大汉三墩", dur: 45 },
    { t: "09:30", base: "ferry", k: "drive", name: "徐闻港排队上船", dur: 180, note: "排队加航程约 3 小时；提前在官方小程序预约" },
    { t: "13:00", base: "haikou", k: "stay", name: "到海口，午饭、入住", dur: 150 },
    { t: "16:00", s: "五公祠", dur: 90 },
    { t: "18:30", s: "骑楼老街", dur: 90, note: "晚饭加散步" } ] },
  { d: "2027-01-04", at: "wuzhishan", items: [
    { t: "09:00", s: "雷琼地质公园", city: "haikou", dur: 90 },
    { t: "11:00", base: "haikou", k: "drive", name: "出发回家", note: "海南高速不收费" },
    { t: "14:00", base: "wuzhishan", k: "stay", name: "到家" } ] }
];
