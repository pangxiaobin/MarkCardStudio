/**
 * Central Theme Registry for MarkCard Studio
 */

export const THEME_LIST = [
  {
    id: "theme-warm",
    name: "暖阳日记",
    class: "theme-warm",
    description: "温润杏黄手帐，暖色日系生活随笔",
    color: "#f59e0b",
    bgGradient: "linear-gradient(135deg, #fff9ee, #fff3db)",
    category: "classic",
  },
  {
    id: "theme-fresh",
    name: "清新绿洲",
    class: "theme-fresh",
    description: "自然薄荷绿意，护眼爽朗干货整理",
    color: "#10b981",
    bgGradient: "linear-gradient(135deg, #f7fff6, #e6f7ee)",
    category: "classic",
  },
  {
    id: "theme-ink",
    name: "墨色简报",
    class: "theme-ink",
    description: "高对比度商务极简，冷静知识输出",
    color: "#818cf8",
    bgGradient: "linear-gradient(135deg, #263142, #131a25)",
    category: "classic",
  },
  {
    id: "theme-apple-notes",
    name: "苹果备忘录",
    class: "theme-apple-notes",
    description: "横线衬纸纹理、手写感划线与黄色马克笔高亮",
    color: "#eab308",
    bgGradient: "linear-gradient(135deg, #fef9c3, #fef08a)",
    category: "creative",
  },
  {
    id: "theme-instagram",
    name: "Instagram 时尚",
    class: "theme-instagram",
    description: "炫彩渐变边框、拍立得底片内框与时尚毛玻璃",
    color: "#ec4899",
    bgGradient: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
    category: "creative",
  },
  {
    id: "theme-spiral",
    name: "线圈笔记本",
    class: "theme-spiral",
    description: "金属线圈打孔、红边网格纸与手绘胶带装帧",
    color: "#f97316",
    bgGradient: "linear-gradient(135deg, #fffbeb, #fef3c7)",
    category: "creative",
  },
  {
    id: "theme-newspaper",
    name: "复古报刊",
    class: "theme-newspaper",
    description: "经典报纸发黄衬纸、首字母大写与双线报头",
    color: "#78350f",
    bgGradient: "linear-gradient(135deg, #fef3c7, #fde68a)",
    category: "retro",
  },
  {
    id: "theme-cyberpunk",
    name: "暗黑极客",
    class: "theme-cyberpunk",
    description: "黑客终端 CRT 扫描线、霓虹绿/紫光发光边框",
    color: "#22c55e",
    bgGradient: "linear-gradient(135deg, #090d16, #020617)",
    category: "tech",
  },
  {
    id: "theme-ali-orange",
    name: "阿里橙",
    class: "theme-ali-orange",
    description: "高能橙色品牌感，适合产品发布与行动清单",
    color: "#ff6200",
    bgGradient: "linear-gradient(135deg, #fff7ed, #ffedd5)",
    category: "brand",
  },
  {
    id: "theme-byte-pulse",
    name: "字节范",
    class: "theme-byte-pulse",
    description: "黑白编辑网格配电光蓝，短句有冲击力的科技风",
    color: "#00a6ff",
    bgGradient: "linear-gradient(135deg, #f8fafc, #dbeafe)",
    category: "tech",
  },
  {
    id: "theme-macos-window",
    name: "苹果窗口",
    class: "theme-macos-window",
    description: "磨砂玻璃窗口与交通灯标题栏，轻盈的系统美学",
    color: "#0a84ff",
    bgGradient: "linear-gradient(135deg, #f8fbff, #dbeafe)",
    category: "creative",
  },
  {
    id: "theme-bauhaus",
    name: "包豪斯拼贴",
    class: "theme-bauhaus",
    description: "红黄蓝几何构成，像一张会讲故事的展览海报",
    color: "#e63946",
    bgGradient: "linear-gradient(135deg, #fffdf5, #fef3c7)",
    category: "art",
  },
  {
    id: "theme-swiss-grid",
    name: "瑞士网格",
    class: "theme-swiss-grid",
    description: "国际主义网格与荧光红标记，清晰克制的知识卡片",
    color: "#ef233c",
    bgGradient: "linear-gradient(135deg, #ffffff, #f1f5f9)",
    category: "editorial",
  },
  {
    id: "theme-riso-jam",
    name: "Riso 果酱",
    class: "theme-riso-jam",
    description: "孔版印刷错位套色，带一点手工海报的颗粒温度",
    color: "#e11d48",
    bgGradient: "linear-gradient(135deg, #fff1f2, #fce7f3)",
    category: "art",
  },
  {
    id: "theme-y2k-chrome",
    name: "Y2K 银翼",
    class: "theme-y2k-chrome",
    description: "银色铬面、糖果渐变与胶囊按钮，复古未来主义",
    color: "#8b5cf6",
    bgGradient: "linear-gradient(135deg, #f8fafc, #e0e7ff, #fce7f3)",
    category: "retro",
  },
  {
    id: "theme-blueprint",
    name: "蓝图工坊",
    class: "theme-blueprint",
    description: "工程蓝图、尺寸标注与等宽字体，适合教程和方案",
    color: "#38bdf8",
    bgGradient: "linear-gradient(135deg, #0c4a6e, #082f49)",
    category: "tech",
  },
];

export const DEFAULT_THEME = THEME_LIST.find((theme) => theme.id === "theme-swiss-grid") || THEME_LIST[0];

export function getThemeByName(name) {
  return THEME_LIST.find((t) => t.name === name) || DEFAULT_THEME;
}

export function getThemeById(id) {
  return THEME_LIST.find((t) => t.id === id) || DEFAULT_THEME;
}
