<script setup>
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "../AppIcon.vue";

const props = defineProps({
  backgroundType: {
    type: String,
    default: "gradient", // "solid" | "gradient" | "wallpaper" | "image"
  },
  backgroundValue: {
    type: String,
    default: "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)",
  },
  transparentBackground: {
    type: Boolean,
    default: false,
  },
  backgroundColor: {
    type: String,
    default: "#69eacb",
  },
});

const emit = defineEmits([
  "set-background-type",
  "set-background-value",
  "toggle-transparent-background",
]);
const { t } = useI18n();

const fileInputRef = ref(null);

const bgModes = [
  { id: "solid", icon: "square" },
  { id: "gradient", icon: "sparkles" },
  { id: "wallpaper", icon: "layout-grid" },
  { id: "image", icon: "folder-open" },
];

function normalizeBackgroundMode(type) {
  if (type === "pattern") return "gradient";
  return bgModes.some((mode) => mode.id === type) ? type : "solid";
}

const appliedBackgroundMode = computed(() => normalizeBackgroundMode(props.backgroundType));
const appliedBackgroundLabel = computed(
  () => t(`publish.backgroundModes.${appliedBackgroundMode.value}`),
);

function getBackgroundName(item) {
  return t(`publish.backgroundNames.${item.name}`);
}

function getWallpaperName(item, index) {
  return item.url.includes("space-")
    ? t("publish.spaceWallpaper", { index: index + 1 })
    : t("publish.desktopWallpaper", { index: index - 9 });
}
const appliedBackgroundStyle = computed(() => {
  if (props.backgroundType === "solid") {
    return { backgroundColor: props.backgroundValue || props.backgroundColor };
  }

  if (props.backgroundType === "image" || props.backgroundType === "wallpaper") {
    return {
      backgroundImage: `url('${props.backgroundValue}')`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    };
  }

  return { background: props.backgroundValue };
});

// Browsing a category must not replace the background already applied to the canvas.
const currentActiveTab = ref(appliedBackgroundMode.value);

watch(appliedBackgroundMode, (mode) => {
  currentActiveTab.value = mode;
});

// Solid color swatches from solid_1 to solid_21
const solidColors = [
  { name: "暖阳底色", hex: "#fff7e9" },
  { name: "纯白", hex: "#ffffff" },
  { name: "极简灰", hex: "#94a3b8" },
  { name: "中性灰", hex: "#9ca3af" },
  { name: "石板灰", hex: "#a8a29e" },
  { name: "珊瑚红", hex: "#f87171" },
  { name: "暖阳光橙", hex: "#fb923c" },
  { name: "琥珀黄", hex: "#facc15" },
  { name: "明黄", hex: "#fbbf24" },
  { name: "嫩绿", hex: "#a3e635" },
  { name: "翡翠绿", hex: "#4ade80" },
  { name: "薄荷绿", hex: "#34d399" },
  { name: "青蓝", hex: "#2dd4bf" },
  { name: "湖蓝", hex: "#22d3ee" },
  { name: "天空蓝", hex: "#38bdf8" },
  { name: "蔚蓝", hex: "#60a5fa" },
  { name: "靛蓝", hex: "#818cf8" },
  { name: "紫罗兰", hex: "#a78bfa" },
  { name: "梦幻紫", hex: "#c084fc" },
  { name: "霓虹粉", hex: "#e879f9" },
  { name: "芭比粉", hex: "#f472b6" },
  { name: "玫瑰粉", hex: "#fb7185" },
  { name: "暗夜黑", hex: "#18181b" },
];

// Linear gradient presets converted from default_1..7 and gradient_1..3
const gradients = [
  { name: "蓝紫幻彩", value: "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)" },
  { name: "红粉紫罗兰", value: "linear-gradient(90deg, #ef4444 0%, #ec4899 50%, #8b5cf6 100%)" },
  { name: "深紫暖橙", value: "linear-gradient(90deg, #5b21b6 0%, #db2777 50%, #f97316 100%)" },
  { name: "暖橘玫瑰", value: "linear-gradient(90deg, #fb923c 0%, #fb7185 100%)" },
  { name: "蔚蓝青翠", value: "linear-gradient(90deg, #4284DB 0%, #29EAC4 100%)" },
  { name: "洋红青绿", value: "linear-gradient(90deg, #fc00ff 0%, #00dbde 100%)" },
  { name: "柔粉紫罗兰", value: "linear-gradient(135deg, #eeddf3 0%, #ee92b1 50%, #6330b4 100%)" },
  { name: "三色炽火", value: "linear-gradient(135deg, #ff6432 12.8%, #ff0065 43.52%, #7b2eff 84.34%)" },
  { name: "薄荷星云", value: "linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)" },
  { name: "柠檬青草", value: "linear-gradient(135deg, #f9f047 0%, #0fd850 100%)" },
];

// High quality wallpapers from local space_1..10 and desktop_1..5
const wallpapers = [
  { name: "太空壁纸 1", url: "/wallpapers/space-1.jpg" },
  { name: "太空壁纸 2", url: "/wallpapers/space-2.jpg" },
  { name: "太空壁纸 3", url: "/wallpapers/space-3.jpg" },
  { name: "太空壁纸 4", url: "/wallpapers/space-4.jpg" },
  { name: "太空壁纸 5", url: "/wallpapers/space-5.jpg" },
  { name: "太空壁纸 6", url: "/wallpapers/space-6.jpg" },
  { name: "太空壁纸 7", url: "/wallpapers/space-7.jpg" },
  { name: "太空壁纸 8", url: "/wallpapers/space-8.jpg" },
  { name: "太空壁纸 9", url: "/wallpapers/space-9.jpg" },
  { name: "太空壁纸 10", url: "/wallpapers/space-10.jpg" },
  { name: "桌面壁纸 1", url: "/wallpapers/desktop-1.jpg" },
  { name: "桌面壁纸 2", url: "/wallpapers/desktop-2.jpg" },
  { name: "桌面壁纸 3", url: "/wallpapers/desktop-3.jpg" },
  { name: "桌面壁纸 4", url: "/wallpapers/desktop-4.jpg" },
  { name: "桌面壁纸 5", url: "/wallpapers/desktop-5.jpg" },
];

function handleSwitchTab(modeId) {
  currentActiveTab.value = modeId;
}

function handleSelectSolid(color) {
  currentActiveTab.value = "solid";
  emit("set-background-type", "solid");
  emit("set-background-value", color);
}

function handleSelectGradient(val) {
  currentActiveTab.value = "gradient";
  emit("set-background-type", "gradient");
  emit("set-background-value", val);
}

function handleSelectWallpaper(url) {
  currentActiveTab.value = "wallpaper";
  emit("set-background-type", "wallpaper");
  emit("set-background-value", url);
}

function triggerFileUpload() {
  fileInputRef.value?.click();
}

function handleImageFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const dataUrl = event.target?.result;
    if (typeof dataUrl === "string") {
      currentActiveTab.value = "image";
      emit("set-background-type", "image");
      emit("set-background-value", dataUrl);
    }
  };
  reader.readAsDataURL(file);
}

function handleResetImage() {
  handleSelectGradient("linear-gradient(135deg, #69eacb 0%, #eaccf8 48%, #6654f1 100%)");
}
</script>

<template>
  <div class="space-y-3.5">
    <!-- Transparent Outer Canvas Option -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3 shadow-2xs">
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-xs transition cursor-pointer"
        :class="
          transparentBackground
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
        "
        @click="$emit('toggle-transparent-background')"
      >
        <div class="flex items-center gap-2">
          <span class="grid h-5 w-5 place-items-center rounded-md bg-slate-100 dark:bg-slate-700">
            <AppIcon name="square" :size="12" />
          </span>
          <span class="font-medium">{{ t("publish.transparentCanvas") }}</span>
        </div>
        <strong class="font-bold text-[11px]">{{ transparentBackground ? t("common.enabled") : t("common.disabled") }}</strong>
      </button>
    </section>

    <!-- Outer Frame Canvas Background Settings -->
    <section class="rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/80 p-3.5 space-y-3">
      <div class="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5 dark:border-slate-700/60">
        <div class="flex min-w-0 items-center gap-2">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <AppIcon name="palette" :size="14" />
          </span>
          <h3 class="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{{ t("publish.currentBackground") }}</h3>
        </div>
        <div class="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 dark:border-slate-700 dark:bg-slate-900/70">
          <span
            class="h-3.5 w-3.5 rounded-sm border border-black/10 shadow-inner dark:border-white/15"
            :style="appliedBackgroundStyle"
          ></span>
          <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{{ appliedBackgroundLabel }}</span>
          <AppIcon name="check" :size="11" class="text-emerald-500" />
        </div>
      </div>

      <div
        class="grid grid-cols-4 gap-1 rounded-lg border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-700 dark:bg-slate-900/80"
        role="tablist"
        :aria-label="t('publish.currentBackground')"
      >
        <button
          v-for="mode in bgModes"
          :key="mode.id"
          type="button"
          role="tab"
          class="relative flex h-10 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border text-[10px] font-semibold transition-colors duration-150 cursor-pointer select-none"
          :class="
            currentActiveTab === mode.id
              ? 'border-slate-200 bg-white text-blue-600 shadow-xs dark:border-slate-600 dark:bg-slate-800 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
          "
          :aria-selected="currentActiveTab === mode.id"
          :aria-controls="`background-panel-${mode.id}`"
          @click="handleSwitchTab(mode.id)"
        >
          <AppIcon :name="mode.icon" :size="13" />
          <span>{{ t(`publish.backgroundModes.${mode.id}`) }}</span>
          <span
            v-if="appliedBackgroundMode === mode.id"
            class="absolute right-1 top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-emerald-500 text-white shadow-xs"
            :title="t('publish.currentBackground')"
          >
            <AppIcon name="check" :size="9" :stroke-width="3" />
          </span>
        </button>
      </div>

      <!-- SECTION 1: 单色 (Solid Colors Palette) -->
      <div
        v-if="currentActiveTab === 'solid'"
        id="background-panel-solid"
        class="space-y-3 animate-in fade-in duration-150"
        role="tabpanel"
      >
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{{ t("publish.colorCount") }}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{{ backgroundValue }}</span>
            <input
              type="color"
              :value="backgroundValue.startsWith('#') ? backgroundValue : '#fff7e9'"
              class="h-5 w-6 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-transparent p-0"
              @change="handleSelectSolid($event.target.value)"
            />
          </div>
        </div>
        <!-- 6-Column Circle Swatches -->
        <div class="grid grid-cols-6 gap-2.5 place-items-center py-1">
          <button
            v-for="item in solidColors"
            :key="item.hex"
            type="button"
            class="group relative flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/90 dark:border-slate-700 shadow-2xs transition transform hover:scale-110 active:scale-95 cursor-pointer"
            :class="backgroundType === 'solid' && backgroundValue === item.hex ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''"
            :style="{ backgroundColor: item.hex }"
            :title="getBackgroundName(item)"
            @click="handleSelectSolid(item.hex)"
          >
            <AppIcon
              v-if="backgroundType === 'solid' && backgroundValue === item.hex"
              name="check"
              :size="13"
              :class="item.hex === '#ffffff' || item.hex === '#fdfbf7' || item.hex === '#f5ebe0' || item.hex === '#fff7e9' ? 'text-slate-900' : 'text-white'"
            />
          </button>
        </div>
      </div>

      <!-- SECTION 2: 渐变色 (Gradients Palette) -->
      <div
        v-else-if="currentActiveTab === 'gradient'"
        id="background-panel-gradient"
        class="space-y-3 animate-in fade-in duration-150"
        role="tabpanel"
      >
        <span class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{{ t("publish.gradientCount") }}</span>
        <div class="grid grid-cols-2 gap-2.5">
          <button
            v-for="g in gradients"
            :key="g.name"
            type="button"
            class="group relative flex h-14 w-full items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs transition transform hover:scale-102 active:scale-98 cursor-pointer overflow-hidden"
            :class="backgroundType === 'gradient' && backgroundValue === g.value ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''"
            :style="{ background: g.value }"
            :title="getBackgroundName(g)"
            @click="handleSelectGradient(g.value)"
          >
            <span class="absolute bottom-1 right-2 text-[10px] font-bold text-white drop-shadow-md">
              {{ getBackgroundName(g) }}
            </span>
            <div
              v-if="backgroundType === 'gradient' && backgroundValue === g.value"
              class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]"
            >
              <AppIcon name="check" :size="16" class="text-white drop-shadow-md" />
            </div>
          </button>
        </div>
      </div>

      <!-- SECTION 3: 高清壁纸 (Cosmic & Desktop Wallpapers) -->
      <div
        v-else-if="currentActiveTab === 'wallpaper'"
        id="background-panel-wallpaper"
        class="space-y-3 animate-in fade-in duration-150"
        role="tabpanel"
      >
        <span class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{{ t("publish.wallpaperCount") }}</span>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="(w, index) in wallpapers"
            :key="w.name"
            type="button"
            class="group relative flex h-16 w-full items-center justify-center rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs transition transform hover:scale-103 active:scale-97 cursor-pointer overflow-hidden bg-slate-100 dark:bg-slate-800"
            :class="backgroundType === 'wallpaper' && backgroundValue === w.url ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800' : ''"
            :title="getWallpaperName(w, index)"
            @click="handleSelectWallpaper(w.url)"
          >
            <img :src="w.url" class="h-full w-full object-cover" :alt="getWallpaperName(w, index)" />
            <div
              v-if="backgroundType === 'wallpaper' && backgroundValue === w.url"
              class="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px]"
            >
              <AppIcon name="check" :size="16" class="text-white drop-shadow-md" />
            </div>
          </button>
        </div>
      </div>

      <!-- SECTION 4: 自定义本地图片 (Custom Image Upload) -->
      <div
        v-else-if="currentActiveTab === 'image'"
        id="background-panel-image"
        class="space-y-3 animate-in fade-in duration-150"
        role="tabpanel"
      >
        <span class="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">{{ t("publish.customBackground") }}</span>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="hidden"
          @change="handleImageFile"
        />

        <div
          class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-4 text-center transition hover:border-blue-500 cursor-pointer"
          @click="triggerFileUpload"
        >
          <div
            v-if="backgroundType === 'image' && backgroundValue && (backgroundValue.startsWith('data:') || backgroundValue.startsWith('blob:'))"
            class="relative h-32 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 group/img"
          >
            <img :src="backgroundValue" class="h-full w-full object-cover" :alt="t('publish.customBackground')" />
            <div class="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover/img:opacity-100 transition gap-2">
              <span>{{ t("publish.replaceImage") }}</span>
              <button
                type="button"
                class="rounded-md bg-red-600/90 px-2 py-0.5 text-[11px] text-white hover:bg-red-700"
                @click.stop="handleResetImage"
              >
                {{ t("publish.removeImage") }}
              </button>
            </div>
          </div>
          <template v-else>
            <span class="grid h-9 w-9 place-items-center rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 mb-2">
              <AppIcon name="folder-open" :size="16" />
            </span>
            <span class="text-xs font-bold text-slate-700 dark:text-slate-200">{{ t("publish.chooseImage") }}</span>
            <span class="text-[10px] text-slate-400 mt-1">{{ t("publish.imageFormats") }}</span>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>
