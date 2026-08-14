<script setup>
import AppIcon from "./AppIcon.vue";
import SettingsBackground from "./settings/SettingsBackground.vue";
import SettingsExport from "./settings/SettingsExport.vue";
import SettingsHeaderFooter from "./settings/SettingsHeaderFooter.vue";
import SettingsPagination from "./settings/SettingsPagination.vue";
import SettingsPlatforms from "./settings/SettingsPlatforms.vue";
import SettingsTabs from "./settings/SettingsTabs.vue";
import SettingsTypography from "./settings/SettingsTypography.vue";

defineProps({
  activePage: {
    type: Object,
    default: () => ({}),
  },
  activePageIndex: {
    type: Number,
    required: true,
  },
  activeTab: {
    type: String,
    required: true,
  },
  exportFormats: {
    type: Array,
    required: true,
  },
  exportMessage: {
    type: String,
    required: true,
  },
  isExporting: {
    type: Boolean,
    default: false,
  },
  pagesLength: {
    type: Number,
    required: true,
  },
  platforms: {
    type: Array,
    required: true,
  },
  scale: {
    type: Number,
    required: true,
  },
  selectedFormat: {
    type: String,
    required: true,
  },
  selectedPlatformName: {
    type: String,
    required: true,
  },
  selectedPlatform: {
    type: Object,
    required: true,
  },
  customWidth: {
    type: Number,
    default: 1200,
  },
  customHeight: {
    type: Number,
    default: 1600,
  },
  paginationMode: {
    type: String,
    default: "h2",
  },
  customDelimiter: {
    type: String,
    default: "---",
  },
  maxPageLength: {
    type: Number,
    default: 300,
  },
  backgroundType: {
    type: String,
    default: "gradient",
  },
  backgroundValue: {
    type: String,
    default: "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)",
  },
  settingTabs: {
    type: Array,
    required: true,
  },
  solidBackground: {
    type: Boolean,
    required: true,
  },
  transparentBackground: {
    type: Boolean,
    required: true,
  },
  backgroundColor: {
    type: String,
    default: "#69eacb",
  },
  customFonts: {
    type: Array,
    default: () => [],
  },
  selectedFontId: {
    type: String,
    default: "theme-default",
  },
  customFontRuntimeAvailable: {
    type: Boolean,
    default: false,
  },
  customFontLoading: {
    type: Boolean,
    default: false,
  },
  customFontMessage: {
    type: String,
    default: "",
  },
  showPageNumber: {
    type: Boolean,
    default: true,
  },
  showTopLeft: {
    type: Boolean,
    default: true,
  },
  showTopRight: {
    type: Boolean,
    default: true,
  },
  showBottomLeft: {
    type: Boolean,
    default: true,
  },
  showBottomRight: {
    type: Boolean,
    default: true,
  },
  exportPath: {
    type: String,
    default: "/Users/markcardstudio/导出",
  },
});

defineEmits([
  "export",
  "select-format",
  "select-platform",
  "set-active-tab",
  "set-scale",
  "toggle-solid-background",
  "toggle-transparent-background",
  "set-background-color",
  "set-export-path",
  "set-custom-width",
  "set-custom-height",
  "set-custom-dimensions",
  "swap-dimensions",
  "set-pagination-mode",
  "set-custom-delimiter",
  "set-max-page-length",
  "set-background-type",
  "set-background-value",
  "import-font",
  "select-font",
  "delete-font",
  "update-global-meta",
  "update:showPageNumber",
  "update:showTopLeft",
  "update:showTopRight",
  "update:showBottomLeft",
  "update:showBottomRight",
]);
</script>

<template>
  <aside class="panel-surface flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl">
    <section class="shrink-0 border-b border-slate-200/70 dark:border-slate-800 px-4 py-3">
      <h2 class="text-[15px] font-semibold dark:text-slate-100">{{ $t("publish.title") }}</h2>
    </section>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SettingsTabs
        class="mx-4 mt-3 shrink-0 relative z-20"
        :active-tab="activeTab"
        :setting-tabs="settingTabs"
        @set-active-tab="$emit('set-active-tab', $event)"
      />

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <!-- 平台设置 Tab -->
        <div v-if="activeTab === '平台'" class="space-y-4">
          <SettingsPlatforms
            :platforms="platforms"
            :selected-platform-name="selectedPlatformName"
            :selected-platform="selectedPlatform"
            :custom-width="customWidth"
            :custom-height="customHeight"
            @select-platform="$emit('select-platform', $event)"
            @set-custom-width="$emit('set-custom-width', $event)"
            @set-custom-height="$emit('set-custom-height', $event)"
            @set-custom-dimensions="$emit('set-custom-dimensions', $event, $arguments?.[1])"
            @swap-dimensions="$emit('swap-dimensions')"
          />
        </div>

        <!-- 分页设置 Tab -->
        <div v-else-if="activeTab === '分页'">
          <SettingsPagination
            :pagination-mode="paginationMode"
            :custom-delimiter="customDelimiter"
            :max-page-length="maxPageLength"
            :pages-length="pagesLength"
            :active-page-index="activePageIndex"
            @set-pagination-mode="$emit('set-pagination-mode', $event)"
            @set-custom-delimiter="$emit('set-custom-delimiter', $event)"
            @set-max-page-length="$emit('set-max-page-length', $event)"
          />
        </div>

        <!-- 背景设置 Tab -->
        <div v-else-if="activeTab === '背景'">
          <SettingsBackground
            :background-type="backgroundType"
            :background-value="backgroundValue"
            :transparent-background="transparentBackground"
            :background-color="backgroundColor"
            @set-background-type="$emit('set-background-type', $event)"
            @set-background-value="$emit('set-background-value', $event)"
            @toggle-transparent-background="$emit('toggle-transparent-background')"
          />
        </div>

        <div v-else-if="activeTab === '字体'">
          <SettingsTypography
            :custom-fonts="customFonts"
            :selected-font-id="selectedFontId"
            :runtime-available="customFontRuntimeAvailable"
            :loading="customFontLoading"
            :message="customFontMessage"
            @import-font="$emit('import-font')"
            @select-font="$emit('select-font', $event)"
            @delete-font="$emit('delete-font', $event)"
          />
        </div>

        <!-- 标头 Tab -->
        <div v-else-if="activeTab === '标头'">
          <SettingsHeaderFooter
            :active-page="activePage"
            :active-page-index="activePageIndex"
            :pages-length="pagesLength"
            :show-page-number="showPageNumber"
            :show-top-left="showTopLeft"
            :show-top-right="showTopRight"
            :show-bottom-left="showBottomLeft"
            :show-bottom-right="showBottomRight"
            @update-global-meta="$emit('update-global-meta', $event)"
            @update:show-page-number="$emit('update:showPageNumber', $event)"
            @update:show-top-left="$emit('update:showTopLeft', $event)"
            @update:show-top-right="$emit('update:showTopRight', $event)"
            @update:show-bottom-left="$emit('update:showBottomLeft', $event)"
            @update:show-bottom-right="$emit('update:showBottomRight', $event)"
          />
        </div>
      </div>
    </div>

    <SettingsExport
      class="shrink-0 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
      :export-formats="exportFormats"
      :export-message="exportMessage"
      :is-exporting="isExporting"
      :pages-length="pagesLength"
      :scale="scale"
      :selected-format="selectedFormat"
      :export-path="exportPath"
      @export="$emit('export')"
      @select-format="$emit('select-format', $event)"
      @set-scale="$emit('set-scale', $event)"
      @set-export-path="$emit('set-export-path', $event)"
    />
  </aside>
</template>
