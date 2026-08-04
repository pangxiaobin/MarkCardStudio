# Repository Guide for Coding Agents

## Product Scope

MarkCard Studio is a local-first Markdown-to-social-card authoring application. Its core path is:

```text
Markdown source -> parse and paginate -> themed card preview -> PNG/JPG/PDF/long-PNG export
```

Keep changes aligned with this workflow. This repository currently implements one Vue workspace and a thin Tauri filesystem layer; it does not use Vue Router, Pinia, or TypeScript.

## Stack and Commands

- Package manager: `pnpm` (keep `pnpm-lock.yaml` authoritative).
- Frontend: Vue 3 `<script setup>`, JavaScript, Vite 6, Tailwind CSS 4, DaisyUI.
- Desktop: Tauri 2 and Rust 2021.
- Editor/rendering: CodeMirror 6, markdown-it, Highlight.js, KaTeX, Mermaid.
- Export: html-to-image and jsPDF.
- Internationalization: vue-i18n with Simplified Chinese and English resources.

```bash
pnpm install
pnpm dev
pnpm build
pnpm tauri dev
pnpm tauri build
cargo check --manifest-path src-tauri/Cargo.toml
```

There is currently no automated test, lint, or format script. Do not claim those checks ran unless a script is added and executed.

## Architecture

- `src/App.vue`: composes the three-panel workspace and wires document state to UI events.
- `src/composables/useStudioDocument.js`: primary state owner. Handles document lifecycle, undo/redo, settings/draft persistence, platform presets, parsing, pagination, local image resolution, and page metadata.
- `src/composables/useContentParser.js`: converts Markdown-like source into render blocks, estimates page height, renders block HTML, and hydrates Mermaid output.
- `src/composables/useCardExport.js`: renders cards offscreen and writes PNG/JPG/PDF/long-PNG output. Native writes go through Tauri commands; browser mode downloads blobs.
- `src/components/preview/`: live preview canvas, navigation, overview, and card artwork.
- `src/components/settings/`: platform, pagination, background, header/footer, and export controls.
- `src/config/themes.js`: theme catalog and default theme.
- `src/config/coverStickers.js`: theme-to-OpenMoji sticker mapping.
- `src/i18n/`: one translation resource file per locale plus persisted language and appearance preferences.
- `src/styles/themes/`: shared card CSS and one stylesheet per theme.
- `src-tauri/src/files.rs`: native dialogs, Markdown reads/writes, local image conversion, output folders, and export file writes.
- `src-tauri/src/lib.rs`: Tauri plugin setup and command registration.

## Important Invariants

### Preview and Export Must Match

The live preview and exported files do not share one DOM tree. Preview components render the interactive card, while `useCardExport.js` builds an offscreen card for capture. Any change to card content, metadata visibility, dimensions, backgrounds, images, Mermaid, KaTeX, or theme styling must be checked in both paths.

Export capture deliberately inlines images and Mermaid SVGs and rasterizes KaTeX formulas to avoid WebView capture failures. Preserve those preparation steps unless the replacement is verified in Tauri on representative documents.

### Document State Has One Main Owner

Add cross-panel document behavior to `useStudioDocument.js` and pass state/events through `App.vue`. Keep small UI-only state local to the owning component. Avoid introducing a global store for a narrow change.

Settings and draft data use versioned `localStorage` keys. Treat stored settings as untrusted, keep validation/defaults when adding fields, and add new persistent fields to both the restore and save paths.

### Browser Fallbacks Are Intentional

Frontend calls to Tauri may fail when the app runs under `pnpm dev` in a browser. Preserve graceful fallbacks for document import, file download, and folder selection. Native-only behavior belongs in `src-tauri`, exposed through narrowly scoped commands.

### Theme Changes Span Multiple Files

To add a theme:

1. Add its metadata to `src/config/themes.js`.
2. Add `src/styles/themes/theme-<name>.css`.
3. Import that stylesheet from `src/styles/themes/index.css`.
4. Add its cover stickers to `src/config/coverStickers.js`.

Use a stable `theme-<name>` id/class. Theme CSS must work for every platform ratio and in both preview and export. Do not remove OpenMoji attribution.

## Code Conventions

- Follow the existing JavaScript and Vue `<script setup>` style; do not convert isolated files to TypeScript.
- Use 2-space indentation, double quotes in JavaScript, semicolons, and trailing commas where the surrounding file uses them.
- Define component contracts with `defineProps` and `defineEmits`. Keep event names in kebab case in templates.
- Reuse `AppIcon.vue` and Lucide names for interface icons.
- Prefer computed state over duplicated state and composables over unrelated utility dumping grounds.
- Keep comments brief and reserve them for rendering constraints, compatibility behavior, or non-obvious algorithms.
- Put user-facing strings in the matching locale file under `src/i18n/`, keep locale resources synchronized, and use one file per locale. Preserve stable internal ids when translating labels.
- Use structured APIs for Markdown, URLs, paths, and serialized settings; do not parse structured data with brittle string slicing when an existing parser is available.

## Change Playbooks

### Markdown Syntax or Pagination

- Update parsing/rendering in `useContentParser.js` and orchestration in `useStudioDocument.js` as needed.
- Check empty documents, long paragraphs, explicit delimiters, code blocks, tables, images, KaTeX, and Mermaid.
- Verify overflow at Xiaohongshu 3:4, Douyin 9:16, square, and a custom size.

### Native File Behavior

- Implement the command in `src-tauri/src/files.rs`.
- Register it in `src-tauri/src/lib.rs`.
- Add only the minimum capability permissions required in `src-tauri/capabilities/default.json`.
- Keep path validation and error messages at the native boundary.
- Verify filenames and paths on macOS, Windows, and Linux semantics where relevant.

### Export Behavior

- Test PNG and JPG as multiple files, PDF as multiple pages, and long PNG as one stitched canvas.
- Test local Markdown images, transparent output, a wallpaper background, Mermaid, KaTeX, and all header/footer visibility toggles.
- Ensure output dimensions match the selected platform and that document-specific subfolder names are sanitized.

## Validation Before Handoff

Run the smallest relevant checks, with these as the default baseline:

```bash
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
```

For visual or export work, also run `pnpm tauri dev` and manually inspect at least one short document and one multipage rich document. Confirm that no card content overlaps, preview matches exported output, and exported pixel dimensions are correct.

Do not edit or commit generated directories such as `node_modules/`, `dist/`, or `src-tauri/target/`. Preserve unrelated user changes in a dirty worktree.

## Documentation and Licensing

- `README.md` is the default English GitHub document.
- `README.zh-CN.md` is the synchronized Simplified Chinese version.
- Result examples live in `imgs/`; update both READMEs when the gallery changes materially.
- Project code is licensed under GNU GPL v3.0. Bundled third-party assets retain their own licenses.
- OpenMoji SVGs are CC BY-SA 4.0; attribution lives in `public/stickers/openmoji/README.md`.
