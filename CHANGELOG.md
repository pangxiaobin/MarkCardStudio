# Changelog / 变更日志

## [v0.1.2] - 2026-08-14

### 版本功能与体验优化 / Features & UX Enhancements

- **全局常驻导出进度与 Loading 状态**：导出时底部常驻状态栏实时显示导出与渲染进度，且工具栏与侧边栏导出按钮同步防重与 Loading 响应，即便侧边栏折叠收起仍可清晰感知进度。
- **自定义字体管理**：支持导入、管理与删除本地自定义字体文件（TTF/OTF/WOFF/WOFF2），并自动应用到实时卡片预览与导出渲染中。
- **多比例响应式版式与表格适配优化**：优化横屏、正方形及窄屏卡片的表格列宽限制、内外边距与排版规则，提升多尺寸下卡片适配度与出图美感。
- **架构重构与导出渲染一致性**：重构导出 DOM 与测量 DOM，统一基于 `CardArtwork.vue` 渲染，彻底保证预览、测量与无损导出的视觉一致性。

---

- **Global Export Progress & Loading Feedback**: Added live progress indicator to bottom statusbar and loading state to toolbar/settings buttons, maintaining progress visibility even when the right panel is collapsed.
- **Custom Font Management**: Added support for importing, managing, and deleting local fonts (TTF/OTF/WOFF/WOFF2), automatically hydrated into live card previews and exports.
- **Responsive Layout & Table Fitting**: Enhanced column width auto-calculation and safety padding for landscape, square, and narrow cards.
- **Export DOM Architecture Refactor**: Unified export and measurement session renderers with `CardArtwork.vue` for absolute rendering fidelity across preview, measurement, and final export.

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
