# Repository Guide for Coding Agents

## Product Scope

MarkCard Studio is a local-first Markdown-to-social-card authoring application. Its core path is:

```text
Markdown source -> parse and paginate -> themed card preview -> PNG/JPG/PDF/long-PNG export
```

Keep changes aligned with this workflow. This repository currently implements one Vue workspace and a small Tauri native-I/O layer; it does not use Vue Router, Pinia, or TypeScript.

## Stack and Commands

- Package manager: `pnpm` (keep `pnpm-lock.yaml` authoritative).
- Frontend: Vue 3 `<script setup>`, JavaScript, Vite 6, Tailwind CSS 4, DaisyUI.
- Desktop: Tauri 2, Rust 2021, and reqwest for bounded remote image retrieval.
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
- `src/composables/useStudioDocument.js`: primary state owner. Handles document lifecycle, undo/redo, settings/draft persistence, platform presets, parsing, measured-pagination orchestration, local image resolution, and page metadata.
- `src/composables/useContentParser.js`: converts Markdown source into render blocks, renders block HTML, and hydrates Mermaid output.
- `src/composables/useMeasuredPagination.js`: mounts the shared card renderer offscreen, measures real DOM overflow, splits supported blocks, caches measurements, and marks unsplittable oversized blocks.
- `src/composables/useCardExport.js`: mounts the shared card renderer offscreen, prepares images/Mermaid/KaTeX for capture, composites Markdown images onto the result canvas, and writes PNG/JPG/PDF/long-PNG output. Native writes go through Tauri commands; browser mode downloads blobs.
- `src/components/preview/CardArtwork.vue`: canonical card markup used by single preview, overview, measured pagination, and export. Card content or metadata changes belong here.
- `src/components/preview/PreviewArtworkCard.vue`: responsive preview wrapper that scales `CardArtwork.vue` and owns preview-only controls.
- `src/components/preview/`: live preview canvas, navigation, overview, and shared card artwork.
- `src/components/settings/`: platform, pagination, background, header/footer, and export controls.
- `src/config/themes.js`: theme catalog and default theme.
- `src/config/coverStickers.js`: theme-to-OpenMoji sticker mapping.
- `src/i18n/`: one translation resource file per locale plus persisted language and appearance preferences.
- `src/styles/themes/`: shared card CSS and one stylesheet per theme.
- `src-tauri/src/files.rs`: native dialogs, Markdown reads/writes, local and bounded remote image conversion, output folders, and export file writes.
- `src-tauri/src/lib.rs`: Tauri plugin setup and command registration.

## Important Invariants

### Preview and Export Must Match

The live preview, pagination measurer, and exporter use separate DOM instances, but all must render card markup through `CardArtwork.vue`. Do not reintroduce hand-built export markup or duplicate card content in preview wrappers. Any change to card content, metadata visibility, dimensions, backgrounds, images, Mermaid, KaTeX, or theme styling must still be checked in preview, pagination, and export because their preparation and scaling steps differ.

Export capture deliberately inlines content images and CSS backgrounds, converts Mermaid SVGs, rasterizes KaTeX formulas and cover stickers, waits for decoded image dimensions, and composites Markdown images onto the final canvas. Local Markdown images are resolved to data URLs before pagination. Remote images use browser fetch first and the bounded Tauri resolver as a desktop fallback. Preserve these preparation steps unless the replacement is verified in Tauri on representative documents.

### Pagination Uses Real Card Measurements

Pagination is asynchronous and abortable. `useStudioDocument.js` creates a measured-pagination session for the selected platform, theme, and header/footer visibility settings. The session mounts `CardArtwork.vue` offscreen and uses actual `scrollHeight`/`clientHeight` values instead of estimated block heights.

Keep measurement hosts offscreen but rendered; do not use `display: none`, `visibility: hidden`, or inherited opacity. Wait for fonts, images, and Mermaid before trusting dimensions. When adding a splittable block type, update both the parser/rendering contract and `useMeasuredPagination.js`. Unsplittable oversized blocks must retain their `oversize` marker and visible warning.

### Document State Has One Main Owner

Add cross-panel document behavior to `useStudioDocument.js` and pass state/events through `App.vue`. Keep small UI-only state local to the owning component. Avoid introducing a global store for a narrow change.

Settings and draft data use versioned `localStorage` keys. Treat stored settings as untrusted, keep validation/defaults when adding fields, and add new persistent fields to both the restore and save paths.

### Browser Fallbacks Are Intentional

Frontend calls to Tauri may fail when the app runs under `pnpm dev` in a browser. Preserve graceful fallbacks for document import, file download, folder selection, and image fetching. Browser export remains subject to normal CORS rules; the remote-image Tauri command is a desktop fallback, not a browser proxy. Native-only behavior belongs in `src-tauri`, exposed through narrowly scoped commands.

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

- Update parsing/rendering in `useContentParser.js`, measurement/splitting in `useMeasuredPagination.js`, and orchestration in `useStudioDocument.js` as needed.
- Render measurement candidates through `CardArtwork.vue`; do not add a second simplified measurement template.
- Check empty documents, long paragraphs, explicit delimiters, code blocks, tables, images, KaTeX, and Mermaid.
- Verify overflow at Xiaohongshu 3:4, Douyin 9:16, square, and a custom size.
- Confirm rapid edits or settings changes abort stale pagination work and do not replace newer pages.

### Native File Behavior

- Implement the command in `src-tauri/src/files.rs`.
- Register it in `src-tauri/src/lib.rs`.
- Add only the minimum capability permissions required in `src-tauri/capabilities/default.json`.
- Keep path validation and error messages at the native boundary.
- Keep remote image retrieval limited to HTTP/HTTPS, validate image content types, and retain explicit timeout, redirect, and response-size limits.
- Verify filenames and paths on macOS, Windows, and Linux semantics where relevant.

### Export Behavior

- Test PNG and JPG as multiple files, PDF as multiple pages, and long PNG as one stitched canvas.
- Test relative, absolute, and `file://` local Markdown images, including large PNG/JPEG/WebP files and multiple images across pages.
- Test a CORS-restricted remote Markdown image in Tauri, transparent output, built-in and custom wallpaper backgrounds, Mermaid, KaTeX, cover stickers, and all header/footer visibility toggles.
- Confirm local images are present in the saved files, not only in preview or the offscreen export DOM.
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
