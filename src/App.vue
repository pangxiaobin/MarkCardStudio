<script setup>
import { invoke, isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AppCloseConfirmDialog from "./components/AppCloseConfirmDialog.vue";
import AppUpdateDialog from "./components/AppUpdateDialog.vue";
import AppIcon from "./components/AppIcon.vue";
import AppStatusbar from "./components/AppStatusbar.vue";
import AppSettingsDialog from "./components/AppSettingsDialog.vue";
import AppTitlebar from "./components/AppTitlebar.vue";
import AppToolbar from "./components/AppToolbar.vue";
import MarkdownEditor from "./components/MarkdownEditor.vue";
import PreviewPanel from "./components/PreviewPanel.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { useCardExport } from "./composables/useCardExport";
import { useStudioDocument } from "./composables/useStudioDocument";
import { useUpdater } from "./composables/useUpdater";
import { useAppPreferences } from "./i18n/index.js";

const exportFormats = ["PNG", "JPG", "PDF", "长图(PNG)"];
const settingTabs = ["平台", "分页", "背景", "字体", "标头"];

const {
  markdownSource,
  sourcePath,
  savedContent,
  isDirty,
  pages,
  selectedPage,
  activePageIndex,
  isLoadingDocument,
  exportMessage,
  autoSaveStatus,
  showPageNumber,
  showTopLeft,
  showTopRight,
  showBottomLeft,
  showBottomRight,
  selectedTheme,
  selectedPlatformName,
  selectedFormat,
  scale,
  transparentBackground,
  solidBackground,
  backgroundColor,
  exportPath,
  zoom,
  activeTab,
  customWidth,
  customHeight,
  customFonts,
  selectedFontId,
  customFontFamily,
  customFontEmbedCss,
  isLoadingCustomFonts,
  customFontError,
  isCustomFontRuntimeAvailable,
  lineCount,
  wordCount,
  platforms,
  selectedPlatform,
  canvasRatio,
  canvasSizeLabel,
  selectedThemeClass,
  canGoPrevious,
  canGoNext,
  canUndo,
  canRedo,
  undo,
  redo,
  backgroundType,
  backgroundValue,
  paginationMode,
  customDelimiter,
  maxPageLength,
  setPaginationMode,
  setCustomDelimiter,
  setMaxPageLength,
  setBackgroundType,
  setBackgroundValue,
  updateGlobalMeta,
  loadDocumentFromContent,
  openDocumentFromDialog,
  saveDocument,
  createNewDocument,
  addPageTemplate,
  deletePage,
  movePage,
  selectPage,
  nextPage,
  previousPage,
  setZoom,
  toggleTheme,
  setCustomWidth,
  setCustomHeight,
  setCustomDimensions,
  swapDimensions,
  importCustomFont,
  selectCustomFont,
  deleteCustomFont,
} = useStudioDocument();

const previewPanelRef = ref(null);
const settingsDialogOpen = ref(false);
const closeDialogOpen = ref(false);
const isClosingApplication = ref(false);
const viewportWidth = ref(typeof window !== "undefined" ? window.innerWidth : 1600);
const leftSidebarDocked = computed(() => viewportWidth.value >= 1240);
const rightSidebarDocked = computed(() => viewportWidth.value >= 1180);
const leftDrawerOpen = ref(false);
const rightDrawerOpen = ref(false);
const showLeftDrawerToggle = computed(() => !leftSidebarDocked.value);
const showRightDrawerToggle = computed(() => !rightSidebarDocked.value);
const layoutStyle = computed(() => ({
  gridTemplateColumns:
    leftSidebarDocked.value && rightSidebarDocked.value
      ? "minmax(320px, 386px) minmax(0,1fr) minmax(300px, 332px)"
      : leftSidebarDocked.value
        ? "minmax(320px, 386px) minmax(0,1fr)"
        : rightSidebarDocked.value
          ? "minmax(0,1fr) minmax(300px, 332px)"
          : "minmax(0,1fr)",
}));
let removeCloseRequestedListener = null;
let removeExitRequestedListener = null;
let appIsUnmounted = false;
const { exportCurrentPage } = useCardExport({
  activePageIndex,
  pages,
  sourcePath,
  selectedPlatform,
  exportMessage,
  scale,
  selectedFormat,
  transparentBackground,
  backgroundColor,
  backgroundType,
  backgroundValue,
  selectedThemeClass,
  exportPath,
  showPageNumber,
  showTopLeft,
  showTopRight,
  showBottomLeft,
  showBottomRight,
  customFontFamily,
  customFontEmbedCss,
});

const { resolvedAppearance, setAppearancePreference } = useAppPreferences();
const isDarkMode = computed(() => resolvedAppearance.value === "dark");

function toggleDarkMode() {
  setAppearancePreference(isDarkMode.value ? "light" : "dark");
}

function selectPlatform(name) {
  selectedPlatformName.value = name;
}

function handleResize() {
  viewportWidth.value = window.innerWidth;
}

function isInputFocused(e) {
  const target = e.target;
  if (!target) return false;
  const tagName = target.tagName?.toUpperCase();
  if (tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable) {
    if (target.classList?.contains("cm-content") || target.closest(".cm-editor")) {
      return true;
    }
    return true;
  }
  return false;
}

function handleGlobalKeydown(e) {
  const isMod = e.metaKey || e.ctrlKey;
  if (!isMod) return;

  const key = e.key.toLowerCase();

  if (key === "z" && !e.shiftKey) {
    if (isInputFocused(e)) return;
    e.preventDefault();
    undo();
    return;
  }

  if ((key === "z" && e.shiftKey) || key === "y") {
    if (isInputFocused(e)) return;
    e.preventDefault();
    redo();
    return;
  }
}

function handleBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = "";
}

function requestApplicationClose() {
  closeDialogOpen.value = true;
}

function cancelApplicationClose() {
  closeDialogOpen.value = false;
}

async function confirmApplicationClose() {
  if (isClosingApplication.value) return;

  isClosingApplication.value = true;
  try {
    await invoke("exit_application");
  } catch (error) {
    console.error("Failed to close the application:", error);
    isClosingApplication.value = false;
  }
}

function openLeftDrawer() {
  rightDrawerOpen.value = false;
  leftDrawerOpen.value = true;
}

function openRightDrawer() {
  leftDrawerOpen.value = false;
  rightDrawerOpen.value = true;
}

watch([leftSidebarDocked, rightSidebarDocked], ([leftDocked, rightDocked]) => {
  if (leftDocked) {
    leftDrawerOpen.value = false;
  }

  if (rightDocked) {
    rightDrawerOpen.value = false;
  }
});

const { checkForUpdates } = useUpdater();

onMounted(async () => {
  handleResize();
  window.addEventListener("resize", handleResize);
  window.addEventListener("keydown", handleGlobalKeydown);

  setTimeout(() => {
    checkForUpdates(true);
  }, 2000);

  if (!isTauri()) {
    window.addEventListener("beforeunload", handleBeforeUnload);
    return;
  }

  const appWindow = getCurrentWindow();
  const [removeCloseRequested, removeExitRequested] = await Promise.all([
    appWindow.onCloseRequested((event) => {
      event.preventDefault();
      requestApplicationClose();
    }),
    appWindow.listen("app-exit-requested", requestApplicationClose),
  ]);

  if (appIsUnmounted) {
    removeCloseRequested();
    removeExitRequested();
    return;
  }

  removeCloseRequestedListener = removeCloseRequested;
  removeExitRequestedListener = removeExitRequested;
});

onBeforeUnmount(() => {
  appIsUnmounted = true;
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("keydown", handleGlobalKeydown);
  window.removeEventListener("beforeunload", handleBeforeUnload);
  removeCloseRequestedListener?.();
  removeExitRequestedListener?.();
});
</script>

<template>
  <div
    class="flex h-screen min-h-0 min-w-0 flex-col overflow-hidden border border-slate-200 dark:border-slate-800 bg-[radial-gradient(circle_at_52%_34%,rgba(255,244,223,0.72),transparent_24rem),linear-gradient(180deg,#fbfcff_0%,#f2f5fb_100%)] dark:bg-[radial-gradient(circle_at_52%_34%,rgba(30,27,75,0.45),transparent_24rem),linear-gradient(180deg,#090d16_0%,#0f172a_100%)] text-slate-900 dark:text-slate-100 transition-colors duration-200">
    <AppTitlebar @open-settings="settingsDialogOpen = true" />
    <AppToolbar
      :selected-theme="selectedTheme"
      :is-dark-mode="isDarkMode"
      :can-undo="canUndo"
      :can-redo="canRedo"
      @export="exportCurrentPage"
      @new-document="createNewDocument"
      @open-markdown="openDocumentFromDialog"
      @save-markdown="saveDocument"
      @open-settings="settingsDialogOpen = true"
      @select-theme="selectedTheme = $event"
      @toggle-dark-mode="toggleDarkMode"
      @undo="undo"
      @redo="redo"
    />

    <main class="relative grid min-h-0 min-w-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200"
      :style="layoutStyle">
      <MarkdownEditor v-if="leftSidebarDocked" class="min-h-0 min-w-0" v-model="markdownSource" :line-count="lineCount"
        :document-path="sourcePath" :is-dirty="isDirty" :loading="isLoadingDocument" :word-count="wordCount"
        @open-markdown="openDocumentFromDialog" @open-markdown-content="loadDocumentFromContent" @save-markdown="saveDocument"
        @undo="undo" @redo="redo" />

      <PreviewPanel ref="previewPanelRef" class="min-h-0 min-w-0" :active-page="selectedPage"
        :active-page-index="activePageIndex" :can-go-next="canGoNext" :can-go-previous="canGoPrevious"
        :canvas-ratio="canvasRatio" :selected-platform="selectedPlatform" :pages="pages" :selected-theme-class="selectedThemeClass" :zoom="zoom"
        :transparent-background="transparentBackground" :background-color="backgroundColor"
        :background-type="backgroundType" :background-value="backgroundValue"
        :show-page-number="showPageNumber"
        :show-top-left="showTopLeft"
        :show-top-right="showTopRight"
        :show-bottom-left="showBottomLeft"
        :show-bottom-right="showBottomRight"
        :custom-font-family="customFontFamily"
        @add-page="addPageTemplate" @delete-page="deletePage" @move-page="movePage" @next-page="nextPage"
        @previous-page="previousPage" @select-page="selectPage" @set-zoom="setZoom" />

      <SettingsPanel v-if="rightSidebarDocked" class="min-h-0 min-w-0" :active-page-index="activePageIndex"
        :active-page="selectedPage"
        :active-tab="activeTab" :export-formats="exportFormats" :export-message="exportMessage"
        :pages-length="pages.length" :platforms="platforms" :scale="scale" :selected-format="selectedFormat"
        :selected-platform-name="selectedPlatformName" :selected-platform="selectedPlatform"
        :custom-width="customWidth" :custom-height="customHeight"
        :pagination-mode="paginationMode" :custom-delimiter="customDelimiter" :max-page-length="maxPageLength"
        :background-type="backgroundType" :background-value="backgroundValue"
        :setting-tabs="settingTabs" :solid-background="solidBackground"
        :transparent-background="transparentBackground" :background-color="backgroundColor" :export-path="exportPath"
        :show-page-number="showPageNumber"
        :show-top-left="showTopLeft"
        :show-top-right="showTopRight"
        :show-bottom-left="showBottomLeft"
        :show-bottom-right="showBottomRight"
        :custom-fonts="customFonts"
        :selected-font-id="selectedFontId"
        :custom-font-runtime-available="isCustomFontRuntimeAvailable"
        :custom-font-loading="isLoadingCustomFonts"
        :custom-font-message="customFontError"
        @export="exportCurrentPage"
        @select-format="selectedFormat = $event" @select-platform="selectPlatform" @set-active-tab="activeTab = $event"
        @set-scale="scale = $event" @toggle-solid-background="solidBackground = !solidBackground"
        @toggle-transparent-background="transparentBackground = !transparentBackground"
        @set-background-color="backgroundColor = $event" @set-export-path="exportPath = $event"
        @set-custom-width="setCustomWidth" @set-custom-height="setCustomHeight"
        @set-custom-dimensions="setCustomDimensions" @swap-dimensions="swapDimensions"
        @set-pagination-mode="setPaginationMode" @set-custom-delimiter="setCustomDelimiter"
        @set-max-page-length="setMaxPageLength"
        @set-background-type="setBackgroundType" @set-background-value="setBackgroundValue"
        @import-font="importCustomFont" @select-font="selectCustomFont" @delete-font="deleteCustomFont"
        @update-global-meta="updateGlobalMeta"
        @update:show-page-number="showPageNumber = $event"
        @update:show-top-left="showTopLeft = $event"
        @update:show-top-right="showTopRight = $event"
        @update:show-bottom-left="showBottomLeft = $event"
        @update:show-bottom-right="showBottomRight = $event" />

      <button v-if="showLeftDrawerToggle" type="button" class="sidebar-hint left-sidebar-hint"
        :aria-label="$t('editor.title')" @click="openLeftDrawer">
        <span class="sidebar-hint__icon">
          <AppIcon name="panel-left-open" :size="15" />
        </span>
        <span class="sidebar-hint__label">{{ $t("sidebar.editor") }}</span>
      </button>

      <button v-if="showRightDrawerToggle" type="button" class="sidebar-hint right-sidebar-hint" :aria-label="$t('publish.title')"
        @click="openRightDrawer">
        <span class="sidebar-hint__icon">
          <AppIcon name="panel-right-open" :size="15" />
        </span>
        <span class="sidebar-hint__label">{{ $t("sidebar.publish") }}</span>
      </button>
    </main>

    <teleport to="body">
      <div v-if="leftDrawerOpen && !leftSidebarDocked" class="fixed inset-0 z-40 bg-slate-900/18 backdrop-blur-[2px]"
        @click="leftDrawerOpen = false"></div>
      <div v-if="leftDrawerOpen && !leftSidebarDocked"
        class="fixed inset-y-0 left-0 z-50 h-screen w-[min(386px,88vw)] p-3">
        <MarkdownEditor class="h-full min-h-0 min-w-0" v-model="markdownSource" :line-count="lineCount"
          :document-path="sourcePath" :is-dirty="isDirty" :loading="isLoadingDocument" :word-count="wordCount"
          @open-markdown="openDocumentFromDialog" @open-markdown-content="loadDocumentFromContent" @save-markdown="saveDocument"
          @undo="undo" @redo="redo" />
      </div>

      <div v-if="rightDrawerOpen && !rightSidebarDocked" class="fixed inset-0 z-40 bg-slate-900/18 backdrop-blur-[2px]"
        @click="rightDrawerOpen = false"></div>
      <div v-if="rightDrawerOpen && !rightSidebarDocked"
        class="fixed inset-y-0 right-0 z-50 h-screen w-[min(340px,88vw)] p-3">
        <SettingsPanel class="h-full min-h-0 min-w-0" :active-page-index="activePageIndex" :active-tab="activeTab"
          :active-page="selectedPage"
          :export-formats="exportFormats" :export-message="exportMessage" :pages-length="pages.length"
          :platforms="platforms" :scale="scale" :selected-format="selectedFormat"
          :selected-platform-name="selectedPlatformName" :selected-platform="selectedPlatform"
          :custom-width="customWidth" :custom-height="customHeight"
          :pagination-mode="paginationMode" :custom-delimiter="customDelimiter" :max-page-length="maxPageLength"
          :background-type="backgroundType" :background-value="backgroundValue"
          :setting-tabs="settingTabs" :solid-background="solidBackground"
          :transparent-background="transparentBackground" :background-color="backgroundColor" :export-path="exportPath"
          :show-page-number="showPageNumber"
          :show-top-left="showTopLeft"
          :show-top-right="showTopRight"
          :show-bottom-left="showBottomLeft"
          :show-bottom-right="showBottomRight"
          :custom-fonts="customFonts"
          :selected-font-id="selectedFontId"
          :custom-font-runtime-available="isCustomFontRuntimeAvailable"
          :custom-font-loading="isLoadingCustomFonts"
          :custom-font-message="customFontError"
          @export="exportCurrentPage"
          @select-format="selectedFormat = $event" @select-platform="selectPlatform"
          @set-active-tab="activeTab = $event" @set-scale="scale = $event"
          @toggle-solid-background="solidBackground = !solidBackground"
          @toggle-transparent-background="transparentBackground = !transparentBackground"
          @set-background-color="backgroundColor = $event" @set-export-path="exportPath = $event"
          @set-custom-width="setCustomWidth" @set-custom-height="setCustomHeight"
          @set-custom-dimensions="setCustomDimensions" @swap-dimensions="swapDimensions"
          @set-pagination-mode="setPaginationMode" @set-custom-delimiter="setCustomDelimiter"
          @set-max-page-length="setMaxPageLength"
          @set-background-type="setBackgroundType" @set-background-value="setBackgroundValue"
          @import-font="importCustomFont" @select-font="selectCustomFont" @delete-font="deleteCustomFont"
          @update-global-meta="updateGlobalMeta"
          @update:show-page-number="showPageNumber = $event"
          @update:show-top-left="showTopLeft = $event"
          @update:show-top-right="showTopRight = $event"
          @update:show-bottom-left="showBottomLeft = $event"
          @update:show-bottom-right="showBottomRight = $event" />
      </div>
    </teleport>

    <AppCloseConfirmDialog
      :open="closeDialogOpen"
      :closing="isClosingApplication"
      @cancel="cancelApplicationClose"
      @confirm="confirmApplicationClose"
    />
    <AppSettingsDialog :open="settingsDialogOpen" @close="settingsDialogOpen = false" />
    <AppUpdateDialog />
    <AppStatusbar :canvas-size-label="canvasSizeLabel" :pages-length="pages.length" :auto-save-status="autoSaveStatus" />
  </div>
</template>

<style scoped>
.sidebar-hint {
  position: absolute;
  top: 50%;
  z-index: 20;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-height: 96px;
  width: 38px;
  padding: 10px 6px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 12px 24px rgba(30, 42, 62, 0.08);
  transform: translateY(-50%);
  transition:
    background 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.sidebar-hint:hover {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 16px 30px rgba(30, 42, 62, 0.12);
}

.dark .sidebar-hint {
  border-color: rgba(51, 65, 85, 0.8);
  background: rgba(30, 41, 59, 0.92);
}

.dark .sidebar-hint:hover {
  background: rgba(51, 65, 85, 0.95);
}

.left-sidebar-hint {
  left: 0;
  border-left: 0;
  border-radius: 0 14px 14px 0;
}

.right-sidebar-hint {
  right: 0;
  border-right: 0;
  border-radius: 14px 0 0 14px;
}

.sidebar-hint__label {
  writing-mode: vertical-rl;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
}

.dark .sidebar-hint__label {
  color: #cbd5e1;
}

.sidebar-hint__icon {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: #f8fafc;
  color: #4f46e5;
}

.dark .sidebar-hint__icon {
  background: #0f172a;
  color: #818cf8;
}

@media (max-width: 640px) {
  .sidebar-hint {
    top: auto;
    bottom: 96px;
    min-height: 86px;
    width: 34px;
    padding: 8px 5px;
    transform: none;
  }

  .sidebar-hint__label {
    font-size: 11px;
  }

  .sidebar-hint__icon {
    width: 26px;
    height: 26px;
  }
}
</style>
