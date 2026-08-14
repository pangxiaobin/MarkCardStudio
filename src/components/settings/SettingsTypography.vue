<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";

const props = defineProps({
  customFonts: {
    type: Array,
    default: () => [],
  },
  selectedFontId: {
    type: String,
    default: "theme-default",
  },
  runtimeAvailable: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["import-font", "select-font", "delete-font"]);
const { t } = useI18n();

const isDropdownOpen = ref(false);
const dropdownRef = ref(null);

const selectedFont = computed(() => (
  props.customFonts.find((font) => font.id === props.selectedFontId) || null
));

const selectedFontDisplayName = computed(() => {
  if (selectedFont.value) return selectedFont.value.displayName;
  return t("publish.fonts.themeDefault");
});

function getFontFamilyStyle(font) {
  if (!font?.family) return {};
  return { fontFamily: `"${font.family}", sans-serif` };
}

const selectedFontFamilyStyle = computed(() => getFontFamilyStyle(selectedFont.value));

function formatFontFormat(format) {
  if (!format) return "";
  const fmt = String(format).toLowerCase();
  if (fmt === "truetype") return "TTF";
  if (fmt === "opentype") return "OTF";
  return fmt.toUpperCase();
}

function formatFileSize(size) {
  const bytes = Number(size) || 0;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function handleSelectFont(fontId) {
  isDropdownOpen.value = false;
  emit("select-font", fontId);
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div class="space-y-4">
    <!-- Header & Dropdown Section -->
    <section class="space-y-2.5">
      <div class="flex items-center justify-between gap-3">
        <label class="text-xs font-bold text-slate-800 dark:text-slate-200">
          {{ t("publish.fonts.cardFont") }}
        </label>
        <button
          type="button"
          class="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-[11px] font-bold text-white shadow-xs transition hover:from-blue-500 hover:to-indigo-500 hover:shadow-md active:scale-98 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          :disabled="!runtimeAvailable || loading"
          @click="emit('import-font')"
        >
          <AppIcon v-if="loading" name="refresh-cw" :size="13" class="animate-spin" />
          <AppIcon v-else name="upload" :size="13" />
          <span>{{ t("publish.fonts.import") }}</span>
        </button>
      </div>

      <!-- Custom Interactive Select Dropdown -->
      <div ref="dropdownRef" class="relative">
        <button
          type="button"
          class="flex h-10.5 w-full items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3.5 text-xs font-medium text-slate-800 shadow-2xs transition-all hover:border-blue-300 hover:bg-slate-50/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-100 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 cursor-pointer"
          :disabled="loading"
          :aria-expanded="isDropdownOpen"
          @click="isDropdownOpen = !isDropdownOpen"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="grid h-6.5 w-6.5 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <AppIcon name="type" :size="14" />
            </span>
            <span
              class="truncate font-semibold text-slate-800 dark:text-slate-100"
              :style="selectedFontFamilyStyle"
            >
              {{ selectedFontDisplayName }}
            </span>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <span
              v-if="selectedFont"
              class="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 uppercase"
            >
              {{ formatFontFormat(selectedFont.format) }}
            </span>
            <AppIcon
              name="chevron-down"
              :size="14"
              class="text-slate-400 transition-transform duration-200"
              :class="isDropdownOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''"
            />
          </div>
        </button>

        <!-- Dropdown Options Popover -->
        <div
          v-if="isDropdownOpen"
          class="absolute left-0 right-0 top-full mt-1.5 z-40 max-h-60 overflow-y-auto rounded-xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-lg animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700/90 dark:bg-slate-800/95 space-y-1"
        >
          <!-- Option: Theme Default -->
          <button
            type="button"
            class="flex h-10 w-full items-center justify-between rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer"
            :class="
              selectedFontId === 'theme-default'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-700/70'
            "
            @click="handleSelectFont('theme-default')"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="grid h-6 w-6 place-items-center rounded-md bg-slate-100 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400">
                <AppIcon name="sparkles" :size="13" />
              </span>
              <span class="truncate">{{ t("publish.fonts.themeDefault") }}</span>
            </div>
            <AppIcon
              v-if="selectedFontId === 'theme-default'"
              name="check"
              :size="14"
              class="text-blue-600 dark:text-blue-400 shrink-0"
            />
          </button>

          <!-- Divider if custom fonts exist -->
          <div v-if="customFonts.length" class="my-1 border-t border-slate-100 dark:border-slate-700/60" />

          <!-- Option: Custom Fonts -->
          <button
            v-for="font in customFonts"
            :key="font.id"
            type="button"
            class="flex h-10 w-full items-center justify-between rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer"
            :class="
              selectedFontId === font.id
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-700/70'
            "
            @click="handleSelectFont(font.id)"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <span class="grid h-6 w-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <AppIcon name="type" :size="13" />
              </span>
              <span class="truncate">
                {{ font.displayName }}
              </span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="text-[10px] opacity-60 uppercase">{{ formatFontFormat(font.format) }}</span>
              <AppIcon
                v-if="selectedFontId === font.id"
                name="check"
                :size="14"
                class="text-blue-600 dark:text-blue-400"
              />
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- Glassmorphic Preview Card Section -->
    <section
      class="relative overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-2xs dark:border-slate-700/80 dark:from-slate-800/80 dark:to-slate-900/80"
    >
      <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-700/60">
        <div class="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <AppIcon name="type" :size="13" />
          <span>{{ t("publish.fonts.preview") }}</span>
        </div>
        <span
          class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
          :class="selectedFont ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'"
        >
          {{ selectedFont ? selectedFont.displayName : t("publish.fonts.themeDefault") }}
        </span>
      </div>

      <div class="mt-3.5 space-y-2" :style="selectedFontFamilyStyle">
        <div class="text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
          山海有信 MarkCard 2026
        </div>
        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          让文字成为画面的一部分。Typography shapes the visual story of your card.
        </p>
      </div>
    </section>

    <!-- Status Warnings / Messages -->
    <div v-if="!runtimeAvailable" class="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
      <AppIcon name="info" :size="14" class="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
      <span>{{ t("publish.fonts.desktopOnly") }}</span>
    </div>
    <div v-else-if="message" class="flex items-start gap-2.5 rounded-xl border border-red-200/80 bg-red-50/80 p-3 text-[11px] leading-relaxed text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
      <AppIcon name="info" :size="14" class="shrink-0 mt-0.5 text-red-500" />
      <span>{{ message }}</span>
    </div>

    <!-- Font Library List Section -->
    <section v-if="customFonts.length" class="space-y-2.5">
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-bold text-slate-800 dark:text-slate-200">
          {{ t("publish.fonts.library") }}
        </h3>
        <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
          {{ customFonts.length }}
        </span>
      </div>

      <div class="space-y-2">
        <div
          v-for="font in customFonts"
          :key="font.id"
          class="group flex items-center justify-between gap-3 rounded-xl border p-3 transition-all"
          :class="
            selectedFontId === font.id
              ? 'border-blue-300 bg-blue-50/40 dark:border-blue-600/60 dark:bg-blue-950/30'
              : 'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-700/70 dark:bg-slate-800/60 dark:hover:border-slate-600'
          "
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <AppIcon name="type" :size="16" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                {{ font.displayName }}
              </div>
              <div class="mt-0.5 flex items-center gap-1.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
                <span class="uppercase font-semibold text-slate-600 dark:text-slate-300">{{ formatFontFormat(font.format) }}</span>
                <span>·</span>
                <span>{{ formatFileSize(font.size) }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              class="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/40 dark:hover:text-red-400 cursor-pointer"
              :disabled="loading"
              :aria-label="t('publish.fonts.delete', { name: font.displayName })"
              :title="t('publish.fonts.delete', { name: font.displayName })"
              @click="emit('delete-font', font.id)"
            >
              <AppIcon name="trash-2" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
