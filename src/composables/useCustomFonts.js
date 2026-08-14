import { invoke } from "@tauri-apps/api/core";
import { computed, ref } from "vue";

const customFonts = ref([]);
const isLoadingCustomFonts = ref(false);
const customFontError = ref("");
const loadedFonts = new Map();

function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

function upsertFont(font) {
  if (!font?.id) return;
  customFonts.value = [
    font,
    ...customFonts.value.filter((item) => item.id !== font.id),
  ];
}

function createFontEmbedCss(font, dataUrl) {
  return `@font-face {
  font-family: "${font.family}";
  src: url("${dataUrl}") format("${font.format}");
  font-style: normal;
  font-weight: 100 1000;
  font-display: swap;
}`;
}

async function refreshCustomFonts() {
  if (!isTauriRuntime()) {
    customFonts.value = [];
    return [];
  }

  isLoadingCustomFonts.value = true;
  customFontError.value = "";
  try {
    const fonts = await invoke("list_custom_fonts");
    customFonts.value = Array.isArray(fonts) ? fonts : [];
    return customFonts.value;
  } catch (error) {
    customFontError.value = error?.message || String(error);
    return [];
  } finally {
    isLoadingCustomFonts.value = false;
  }
}

async function importCustomFont() {
  if (!isTauriRuntime()) return null;
  isLoadingCustomFonts.value = true;
  customFontError.value = "";
  try {
    const font = await invoke("import_custom_font");
    if (!font) return null;
    upsertFont(font);
    await ensureCustomFontLoaded(font.id);
    return font;
  } catch (error) {
    customFontError.value = error?.message || String(error);
    throw error;
  } finally {
    isLoadingCustomFonts.value = false;
  }
}

async function ensureCustomFontLoaded(fontId) {
  if (!fontId || fontId === "theme-default" || !isTauriRuntime()) return null;
  if (loadedFonts.has(fontId)) return loadedFonts.get(fontId);

  const result = await invoke("read_custom_font", { fontId });
  const font = result?.font;
  const dataUrl = result?.dataUrl;
  if (!font?.id || !dataUrl) {
    throw new Error("Custom font data is incomplete");
  }

  const source = `url("${dataUrl}") format("${font.format}")`;
  const face = new FontFace(font.family, source, {
    style: "normal",
    weight: "400",
  });
  await face.load();
  document.fonts.add(face);

  const loaded = {
    font,
    faces: [face],
    dataUrl,
    family: font.family,
    fingerprint: `${font.id}:${font.size}:${font.createdAt}`,
    embedCss: createFontEmbedCss(font, dataUrl),
  };
  loadedFonts.set(fontId, loaded);
  upsertFont(font);
  return loaded;
}

async function deleteCustomFont(fontId) {
  if (!fontId || fontId === "theme-default" || !isTauriRuntime()) return;
  isLoadingCustomFonts.value = true;
  customFontError.value = "";
  try {
    await invoke("delete_custom_font", { fontId });
    const loaded = loadedFonts.get(fontId);
    loaded?.faces?.forEach((face) => document.fonts.delete(face));
    loadedFonts.delete(fontId);
    customFonts.value = customFonts.value.filter((font) => font.id !== fontId);
  } catch (error) {
    customFontError.value = error?.message || String(error);
    throw error;
  } finally {
    isLoadingCustomFonts.value = false;
  }
}

export function useCustomFonts() {
  return {
    customFonts,
    isLoadingCustomFonts,
    customFontError,
    isCustomFontRuntimeAvailable: computed(() => isTauriRuntime()),
    refreshCustomFonts,
    importCustomFont,
    ensureCustomFontLoaded,
    deleteCustomFont,
  };
}
