# Changelog / 变更日志

## [v0.1.5] - 2026-08-30

### 功能与修复 / Features & Fixes

- **编辑器格式工具栏**：新增 Markdown 编辑器双排快捷工具栏，支持标题、加粗/斜体/划线、代码块、列表、表格、表情、提示块与图表的一键插入，搭配无缝原生 Tooltip。
- **ECharts 数据图表支持**：原生支持在 Markdown 中使用 ````echarts` 代码块嵌入柱状图、折线图、饼图等丰富图表，支持标准 JSON 与 JS 对象语法，自适应卡片主题并支持无损高清导出。
- **修复 Windows 滤镜遮挡 Bug**：修复 Windows 系统（WebView2）下卡片主题中 `backdrop-filter` 导致的文字与元素被图层遮盖异常的问题。

---

- **Markdown Editor Toolbar**: Added a dual-row formatting toolbar for quick insertion of headings, inline styles, code blocks, lists, tables, emojis, callouts, and charts with native tooltips.
- **ECharts Data Visualizations**: Native Markdown support for rendering bar, line, pie, and other charts with standard JSON and JS object syntax, card theme adaptation, and lossless export.
- **Windows Filter Occlusion Fix**: Fixed an issue where `backdrop-filter` on card themes caused text and elements to be covered/blanked on Windows (WebView2).

---

## [v0.1.4] - 2026-08-25

### 图片、HTML 与导出修复 / Image, HTML & Export Fixes

- **本地图片渲染与导出修复**：支持相对路径、绝对路径、`file://` 路径及中文/空格路径的本地图片，并确保预览、分页和导出使用一致的图片数据。
- **内联图片支持**：图片不再要求单独占一行，普通段落、列表、任务列表、表格、引用、提示块、标题和脚注中的图片均可匹配。
- **缺失图片回退**：图片无法找到或加载失败时显示原始 Markdown 文本，不再使用特殊占位样式。
- **HTML Markdown 支持**：支持常见 HTML 标签和 HTML 图片语法；危险标签与事件属性会被过滤，避免脚本注入。
- **重复渲染修复**：修复导入无分页标题 Markdown 时正文被重复渲染的问题，并移除重复内容页。
- **导出稳定性改进**：完善图片失败回退、内联图片合成及多页面导出处理。

---

- **Local Image Rendering & Export**: Fixed local images with relative, absolute, `file://`, Chinese, and space-containing paths across preview, pagination, and export.
- **Inline Image Support**: Images can now be matched inside paragraphs, lists, task lists, tables, blockquotes, callouts, headings, and footnotes instead of requiring a standalone line.
- **Missing Image Fallback**: Unavailable or failed images now display their original Markdown text without special placeholder styling.
- **HTML in Markdown**: Added support for common HTML tags and HTML image syntax with filtering for dangerous tags and event attributes.
- **Duplicate Rendering Fix**: Fixed imported Markdown without pagination headings being rendered twice and removed duplicate content pages.
- **Export Reliability**: Improved failed-image fallback, inline-image compositing, and multipage export handling.

---

## [v0.1.3] - 2026-08-17

### 版本功能与体验优化 / Features & UX Enhancements

- **自定义尺寸解耦与独立调节**：解除自定义宽度与高度的强制比例互锁限制，允许用户在 `300 ~ 3840px` 范围内自由独立设置宽与高，彻底解决修改或清空某一维度数值时另一维度被自动篡改的问题。
- **自定义尺寸输入体验升级**：引入输入本地缓冲状态，支持在输入框内流畅删除、清空并重新键入任意多位数字；当数值落入有效范围时卡片实时渲染更新，并在失焦（`blur`）或回车时提供智能合规兜底。
- **尺寸与主题变更防抖优化**：为自定义尺寸、平台预设与主题变更添加轻量防抖处理（`120ms`），优化连续调节数值时的离屏 DOM 测量排版性能，使交互更平滑顺畅。

---

- **Custom Dimensions Decoupling & Independent Control**: Removed forced aspect-ratio coupling between custom width and height, allowing independent adjustments within `300 ~ 3840px` and eliminating accidental value overwrites when clearing or editing dimensions.
- **Enhanced Custom Dimension Input UX**: Implemented local input buffering for smooth backspacing, clearing, and multi-digit typing; updates live preview whenever valid numbers are entered, with smart validation fallback on blur or Enter.
- **Debounced Dimension & Theme Updates**: Added lightweight debounce (`120ms`) to custom dimensions, platform presets, and theme switches, reducing redundant offscreen DOM measurement calls during continuous adjustments.

## [v0.1.2] - 2026-08-14

### 版本功能与体验优化 / Features & UX Enhancements

- **全局常驻导出进度与 Loading 状态**：导出时底部常驻状态栏实时显示导出与渲染进度，且工具栏与侧边栏导出按钮同步防重与 Loading 响应，即便侧边栏折叠收起仍可清晰感知进度。
- **自定义字体管理**：支持导入、管理与删除本地自定义字体文件（TTF/OTF/WOFF/WOFF2），并自动应用到实时卡片预览与导出渲染中。
- **多比例响应式版式与表格适配优化**：优化横屏、正方形及窄屏卡片的表格列宽限制、内外边距与排版规则，提升多尺寸下卡片适配度与出图美感。
- **架构重构与导出渲染一致性**：重构导出 DOM 与测量 DOM，统一基于 `CardArtwork.vue` 渲染，彻底保证预览、测量与无损导出的视觉一致性。
- **自动更新完整性与自动重启支持**：修复内建软件更新下载/安装阶段因 Vue 响应式代理（Proxy）引发的 `TypeError: Cannot read private member` 错误，并集成 `tauri-plugin-process` 与自动重启机制，提供平滑的版本在线升级与自动重启体验。

---

- **Global Export Progress & Loading Feedback**: Added live progress indicator to bottom statusbar and loading state to toolbar/settings buttons, maintaining progress visibility even when the right panel is collapsed.
- **Custom Font Management**: Added support for importing, managing, and deleting local fonts (TTF/OTF/WOFF/WOFF2), automatically hydrated into live card previews and exports.
- **Responsive Layout & Table Fitting**: Enhanced column width auto-calculation and safety padding for landscape, square, and narrow cards.
- **Export DOM Architecture Refactor**: Unified export and measurement session renderers with `CardArtwork.vue` for absolute rendering fidelity across preview, measurement, and final export.
- **Auto-Updater Integration & Seamless Relaunch**: Fixed `TypeError: Cannot read private member` during update downloading caused by Vue Proxy encapsulation, and integrated `tauri-plugin-process` for seamless in-app version upgrades and automatic relaunch.

## [v0.1.1] - 2026-08-11

### 版本功能与体验优化 / Features & UX Enhancements

- 新增版本自动检查与内建更新升级功能。
- 优化国内网络访问环境与硬超时静默处理机制。
- 设置界面新增开机自动更新检查开关（支持中英文多语言）。
- 顶部标题栏新增应用版本号标注与轻量升级提示图标。

---

- Added automatic version check and built-in software update/upgrade capability.
- Optimized for China network environment with silent timeout fallback.
- Added toggle setting for startup auto-update check with full i18n support.
- Added version tag display and sleek upgrade notification button on top titlebar.

## [v0.1.0] - 2026-08-11

### 首个公开版本 / Initial Release

- 支持 Markdown 实时预览、智能分页和页面排序。
- 内置 16 套卡片主题及小红书、抖音、微博、方形等尺寸预设。
- 支持代码高亮、KaTeX 公式、Mermaid 图表、表格、脚注和本地图片。
- 支持导出 PNG、JPG、多页 PDF 和长图 PNG。
- 提供中英文界面、明暗模式、本地文档读写和草稿恢复。

---

- Live Markdown preview with smart pagination and page reordering.
- 16 built-in themes with presets for Xiaohongshu, Douyin, Weibo, and square cards.
- Rich content support including syntax highlighting, KaTeX, Mermaid, tables, footnotes, and local images.
- Export to PNG, JPG, multipage PDF, and long PNG.
- English and Simplified Chinese UI, light/dark modes, local document access, and draft recovery.
