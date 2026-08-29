<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppIcon from "./AppIcon.vue";

const emit = defineEmits(["format"]);
const { t } = useI18n();

const toolbarRef = ref(null);
const dropdownMenuRef = ref(null);
const activeDropdown = ref(null); // 'heading' | 'callout' | 'emoji' | null
const dropdownPos = ref({ top: 0, left: 0 });

const headingOptions = [
  { level: 1, labelKey: "editor.floatingToolbar.h1", tag: "H1", style: "font-bold text-sm" },
  { level: 2, labelKey: "editor.floatingToolbar.h2", tag: "H2", style: "font-semibold text-xs text-blue-600 dark:text-blue-400" },
  { level: 3, labelKey: "editor.floatingToolbar.h3", tag: "H3", style: "font-medium text-xs" },
  { level: 4, labelKey: "editor.floatingToolbar.h4", tag: "H4", style: "font-normal text-xs text-slate-500" },
];

const calloutTypes = [
  { id: "tip", labelKey: "editor.floatingToolbar.calloutTip", bg: "bg-emerald-500" },
  { id: "warning", labelKey: "editor.floatingToolbar.calloutWarning", bg: "bg-amber-500" },
  { id: "danger", labelKey: "editor.floatingToolbar.calloutDanger", bg: "bg-red-500" },
  { id: "note", labelKey: "editor.floatingToolbar.calloutNote", bg: "bg-blue-500" },
];

const chartOptions = [
  { id: "bar", icon: "bar-chart", labelKey: "editor.floatingToolbar.chartBar", descKey: "editor.floatingToolbar.chartBarDesc" },
  { id: "line", icon: "chart-line", labelKey: "editor.floatingToolbar.chartLine", descKey: "editor.floatingToolbar.chartLineDesc" },
  { id: "pie", icon: "chart-pie", labelKey: "editor.floatingToolbar.chartPie", descKey: "editor.floatingToolbar.chartPieDesc" },
];

const emojiGroups = [
  {
    titleKey: "editor.floatingToolbar.emojiPopular",
    emojis: ["🔥", "✨", "💡", "📌", "🌟", "🎯", "🚀", "💥", "🎉", "💯", "👍", "👏", "🙌", "❤️"],
  },
  {
    titleKey: "editor.floatingToolbar.emojiMood",
    emojis: ["🥰", "🥳", "😎", "🤔", "🧐", "👀", "🤫", "😭", "🤯", "🥺", "💪", "🤝", "🙏", "✌️"],
  },
  {
    titleKey: "editor.floatingToolbar.emojiEditorial",
    emojis: ["📝", "📖", "✍️", "🏷️", "🔍", "📊", "📈", "📉", "📅", "⏰", "✅", "❌", "⚠️", "🚨"],
  },
  {
    titleKey: "editor.floatingToolbar.emojiSymbols",
    emojis: ["❓", "❗", "💬", "💭", "🔔", "📢", "📍", "🚩", "🔑", "🔒", "🛠️", "⚙️", "🔗", "📦"],
  },
  {
    titleKey: "editor.floatingToolbar.emojiLife",
    emojis: ["☕", "🍵", "🎨", "🎵", "📷", "💻", "📱", "🖥️", "💰", "💎", "🏆", "🥇", "🎁", "🪄"],
  },
  {
    titleKey: "editor.floatingToolbar.emojiNature",
    emojis: ["☀️", "🌙", "⭐", "🌈", "⚡", "🍀", "🌸", "🌿", "🍎", "🥑", "🏖️", "✈️", "🚗", "🔮"],
  },
  {
    titleKey: "editor.floatingToolbar.emojiNumbers",
    emojis: ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "▶️", "🔄", "🔁", "⚡"],
  },
];

function toggleDropdown(name, event) {
  if (activeDropdown.value === name) {
    activeDropdown.value = null;
    return;
  }

  const trigger = event?.currentTarget;
  if (trigger) {
    const rect = trigger.getBoundingClientRect();
    let left = rect.left;

    if (name === "callout") {
      const menuWidth = 150;
      left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left));
    } else if (name === "chart") {
      const menuWidth = 270;
      left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left));
    } else if (name === "emoji") {
      const menuWidth = 246;
      left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left));
    } else if (name === "heading") {
      const menuWidth = 175;
      left = Math.max(10, Math.min(window.innerWidth - menuWidth - 10, rect.left));
    }

    dropdownPos.value = {
      top: Math.round(rect.bottom + 4),
      left: Math.round(left),
    };
  }

  activeDropdown.value = name;
}

function handleAction(type, payload = null) {
  activeDropdown.value = null;
  emit("format", { type, payload });
}

function handleClickOutside(e) {
  if (dropdownMenuRef.value && dropdownMenuRef.value.contains(e.target)) {
    return;
  }
  if (toolbarRef.value && toolbarRef.value.contains(e.target)) {
    return;
  }
  activeDropdown.value = null;
}

function handleWindowScroll(e) {
  if (dropdownMenuRef.value && (dropdownMenuRef.value === e?.target || dropdownMenuRef.value.contains(e?.target))) {
    return;
  }
  if (activeDropdown.value) {
    activeDropdown.value = null;
  }
}

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
  window.addEventListener("scroll", handleWindowScroll, true);
  window.addEventListener("resize", handleWindowScroll);
});

onBeforeUnmount(() => {
  document.removeEventListener("mousedown", handleClickOutside);
  window.removeEventListener("scroll", handleWindowScroll, true);
  window.removeEventListener("resize", handleWindowScroll);
});
</script>

<template>
  <div
    ref="toolbarRef"
    class="relative z-30 flex flex-col border-b border-slate-200/80 bg-[#fbfbfe] text-slate-700 select-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
    role="toolbar"
    :aria-label="t('editor.title')"
    @mousedown.prevent
  >
    <!-- Row 1: Rich Formatting Toolbar -->
    <div class="relative z-20 flex h-9 items-center gap-0.5 px-2.5 border-b border-slate-100 dark:border-slate-800/60">
      <!-- 1. Heading Dropdown Trigger -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom tooltip-start px-1.5 w-auto gap-0.5"
        :class="{ 'bg-slate-200/80 dark:bg-slate-700': activeDropdown === 'heading' }"
        :data-tip="t('editor.floatingToolbar.heading')"
        :aria-label="t('editor.floatingToolbar.heading')"
        @click="toggleDropdown('heading', $event)"
      >
        <span class="text-[13px] font-semibold font-sans tracking-tight leading-none">H</span>
        <AppIcon
          name="chevron-down"
          :size="12"
          class="text-slate-400 dark:text-slate-400 transition-transform duration-150"
          :class="{ 'rotate-180': activeDropdown === 'heading' }"
        />
      </button>

      <div class="divider"></div>

      <!-- Bold -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.bold')"
        :aria-label="t('editor.floatingToolbar.bold')"
        @click="handleAction('bold')"
      >
        <span class="text-[14px] font-bold font-serif leading-none">B</span>
      </button>

      <!-- Italic -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.italic')"
        :aria-label="t('editor.floatingToolbar.italic')"
        @click="handleAction('italic')"
      >
        <span class="text-[14px] italic font-serif leading-none">I</span>
      </button>

      <!-- Strikethrough -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.strikethrough')"
        :aria-label="t('editor.floatingToolbar.strikethrough')"
        @click="handleAction('strikethrough')"
      >
        <span class="text-[14px] line-through font-serif leading-none">S</span>
      </button>

      <!-- Underline -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.underline')"
        :aria-label="t('editor.floatingToolbar.underline')"
        @click="handleAction('underline')"
      >
        <span class="text-[14px] underline font-serif leading-none">U</span>
      </button>

      <!-- Highlighter -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.highlight')"
        :aria-label="t('editor.floatingToolbar.highlight')"
        @click="handleAction('highlight')"
      >
        <AppIcon name="highlighter" :size="16" />
      </button>

      <div class="divider"></div>

      <!-- Link -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.link')"
        :aria-label="t('editor.floatingToolbar.link')"
        @click="handleAction('link')"
      >
        <AppIcon name="link" :size="16" />
      </button>

      <!-- Image -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.image')"
        :aria-label="t('editor.floatingToolbar.image')"
        @click="handleAction('image')"
      >
        <AppIcon name="image" :size="16" />
      </button>

      <!-- Code (Inline) -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.code')"
        :aria-label="t('editor.floatingToolbar.code')"
        @click="handleAction('code')"
      >
        <AppIcon name="code" :size="16" />
      </button>

      <!-- Code Block -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.codeBlock')"
        :aria-label="t('editor.floatingToolbar.codeBlock')"
        @click="handleAction('code-block')"
      >
        <AppIcon name="square-code" :size="16" />
      </button>

      <!-- Quote -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom tooltip-end"
        :data-tip="t('editor.floatingToolbar.quote')"
        :aria-label="t('editor.floatingToolbar.quote')"
        @click="handleAction('quote')"
      >
        <AppIcon name="quote" :size="16" />
      </button>
    </div>

    <!-- Row 2: Secondary Tools -->
    <div class="relative z-10 flex h-9 items-center gap-1 px-2.5">
      <!-- 1. Bullet List (无序列表) -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom tooltip-start"
        :data-tip="t('editor.floatingToolbar.list')"
        :aria-label="t('editor.floatingToolbar.list')"
        @click="handleAction('list')"
      >
        <AppIcon name="list" :size="16" />
      </button>

      <!-- 2. Numbered List (有序列表) -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.listOrdered')"
        :aria-label="t('editor.floatingToolbar.listOrdered')"
        @click="handleAction('list-ordered')"
      >
        <AppIcon name="list-ordered" :size="16" />
      </button>

      <!-- 2. Horizontal Divider (分割线) -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.divider')"
        :aria-label="t('editor.floatingToolbar.divider')"
        @click="handleAction('divider')"
      >
        <AppIcon name="minus" :size="16" />
      </button>

      <!-- 3. Task List (待办列表) -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.task')"
        :aria-label="t('editor.floatingToolbar.task')"
        @click="handleAction('task')"
      >
        <AppIcon name="square" :size="15" />
      </button>

      <!-- 4. Emoji Picker Trigger (插入表情) -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :class="{ 'bg-slate-200/80 dark:bg-slate-700': activeDropdown === 'emoji' }"
        :data-tip="t('editor.floatingToolbar.emoji')"
        :aria-label="t('editor.floatingToolbar.emoji')"
        @click="toggleDropdown('emoji', $event)"
      >
        <AppIcon name="smile" :size="17" />
      </button>

      <!-- 5. Table (插入表格) -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom"
        :data-tip="t('editor.floatingToolbar.table')"
        :aria-label="t('editor.floatingToolbar.table')"
        @click="handleAction('table')"
      >
        <AppIcon name="table" :size="16" />
      </button>

      <!-- 6. Chart (插入图表) Dropdown Trigger -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom px-1.5 w-auto gap-0.5"
        :class="{ 'bg-slate-200/80 dark:bg-slate-700': activeDropdown === 'chart' }"
        :data-tip="t('editor.floatingToolbar.chart')"
        :aria-label="t('editor.floatingToolbar.chart')"
        @click="toggleDropdown('chart', $event)"
      >
        <AppIcon name="bar-chart" :size="16" />
        <AppIcon
          name="chevron-down"
          :size="12"
          class="text-slate-400 dark:text-slate-400 transition-transform duration-150"
          :class="{ 'rotate-180': activeDropdown === 'chart' }"
        />
      </button>

      <!-- 7. Callout (提示块) Dropdown Trigger -->
      <button
        type="button"
        class="tool-btn tooltip tooltip-bottom tooltip-end px-1.5 w-auto gap-0.5"
        :class="{ 'bg-slate-200/80 dark:bg-slate-700': activeDropdown === 'callout' }"
        :data-tip="t('editor.floatingToolbar.callout')"
        :aria-label="t('editor.floatingToolbar.callout')"
        @click="toggleDropdown('callout', $event)"
      >
        <AppIcon name="info" :size="16" />
        <AppIcon
          name="chevron-down"
          :size="12"
          class="text-slate-400 dark:text-slate-400 transition-transform duration-150"
          :class="{ 'rotate-180': activeDropdown === 'callout' }"
        />
      </button>
    </div>

    <!-- Teleported Global Dropdowns (Always Topmost, Never Clipped or Obscured) -->
    <Teleport to="body">
      <!-- Heading Dropdown Menu -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="activeDropdown === 'heading'"
          ref="dropdownMenuRef"
          class="fixed z-[9999] min-w-[175px] rounded-xl border border-slate-200/90 bg-white/98 p-1.5 shadow-2xl backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-800/98 select-none text-slate-700 dark:text-slate-200"
          :style="{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }"
          @mousedown.prevent
        >
          <button
            v-for="item in headingOptions"
            :key="item.level"
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/80 transition text-left cursor-pointer"
            @click="handleAction('heading', item.level)"
          >
            <span :class="item.style">{{ t(item.labelKey) }}</span>
            <span class="text-[10px] font-mono text-slate-400">{{ item.tag }}</span>
          </button>
          <div class="my-1 border-t border-slate-100 dark:border-slate-700/60"></div>
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/80 transition text-left cursor-pointer"
            @click="handleAction('paragraph')"
          >
            <span>{{ t('editor.floatingToolbar.paragraph') }}</span>
            <span class="text-[10px] font-mono text-slate-400">P</span>
          </button>
        </div>
      </Transition>

      <!-- Callout Dropdown Menu -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="activeDropdown === 'callout'"
          ref="dropdownMenuRef"
          class="fixed z-[9999] min-w-[150px] rounded-xl border border-slate-200/90 bg-white/98 p-1.5 shadow-2xl backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-800/98 select-none text-slate-700 dark:text-slate-200"
          :style="{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }"
          @mousedown.prevent
        >
          <button
            v-for="callout in calloutTypes"
            :key="callout.id"
            type="button"
            class="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/80 transition text-left cursor-pointer"
            @click="handleAction('callout', callout.id)"
          >
            <span class="h-2 w-2 rounded-full shrink-0" :class="callout.bg"></span>
            <span class="truncate">{{ t(callout.labelKey) }}</span>
          </button>
        </div>
      </Transition>

      <!-- Chart Dropdown Menu -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="activeDropdown === 'chart'"
          ref="dropdownMenuRef"
          class="fixed z-[9999] w-[270px] rounded-xl border border-slate-200/90 bg-white/98 p-2 shadow-2xl backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-800/98 select-none text-slate-700 dark:text-slate-200 flex flex-col gap-1"
          :style="{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }"
          @mousedown.prevent
        >
          <button
            v-for="item in chartOptions"
            :key="item.id"
            type="button"
            class="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
            @click="handleAction('chart', item.id)"
          >
            <div class="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <AppIcon :name="item.icon" :size="16" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-medium text-slate-800 dark:text-slate-100 text-xs">{{ t(item.labelKey) }}</span>
              <span class="text-[11px] text-slate-400 dark:text-slate-400 truncate">{{ t(item.descKey) }}</span>
            </div>
          </button>

          <div class="h-px bg-slate-100 dark:bg-slate-700/80 my-0.5"></div>

          <!-- Syntax & Usage Tips -->
          <div class="rounded-lg bg-slate-50 dark:bg-slate-900/60 p-2 border border-slate-100 dark:border-slate-700/50 flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <div class="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <AppIcon name="sparkles" :size="12" class="text-amber-500" />
              <span>{{ t('editor.floatingToolbar.chartTipsTitle') }}</span>
            </div>
            <ul class="space-y-0.5 pl-3 list-disc marker:text-slate-400 text-[10.5px] leading-relaxed">
              <li>{{ t('editor.floatingToolbar.chartTip1') }}</li>
              <li>{{ t('editor.floatingToolbar.chartTip2') }}</li>
              <li>{{ t('editor.floatingToolbar.chartTip3') }}</li>
            </ul>
          </div>
        </div>
      </Transition>

      <!-- Emoji Picker Dropdown -->
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="opacity-0 scale-95 -translate-y-1"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="activeDropdown === 'emoji'"
          ref="dropdownMenuRef"
          class="fixed z-[9999] w-[246px] rounded-xl border border-slate-200/90 bg-white/98 p-2.5 shadow-2xl backdrop-blur-md dark:border-slate-700/90 dark:bg-slate-800/98 select-none text-slate-700 dark:text-slate-200"
          :style="{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }"
        >
          <div class="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            <span>{{ t('editor.floatingToolbar.emoji') }}</span>
            <span class="text-[10px] text-slate-400 font-normal">98 款精选</span>
          </div>
          <div
            class="max-h-[250px] overflow-y-auto overscroll-contain pr-1 custom-scrollbar space-y-2.5"
            @wheel.stop
          >
            <div v-for="group in emojiGroups" :key="group.titleKey">
              <div class="mb-1 px-1 text-[10px] font-medium text-slate-400 dark:text-slate-400">
                {{ t(group.titleKey) }}
              </div>
              <div class="grid grid-cols-7 gap-1">
                <button
                  v-for="emoji in group.emojis"
                  :key="emoji"
                  type="button"
                  class="flex h-7 w-7 items-center justify-center rounded-md text-base hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer hover:scale-115 active:scale-95"
                  @mousedown.prevent
                  @click="handleAction('emoji', emoji)"
                >
                  {{ emoji }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tool-btn {
  display: inline-flex;
  height: 28px;
  min-width: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: rgb(71 85 105);
  background-color: transparent;
  transition-property: color, background-color, transform;
  transition-duration: 100ms;
  cursor: pointer;
}

/* DaisyUI Tooltip Integration & Polish */
.tool-btn.tooltip {
  display: inline-flex;
}

.tool-btn.tooltip:before {
  font-size: 11px;
  font-weight: 500;
  padding: 3px 8px;
  white-space: nowrap;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  z-index: 50;
}

.tool-btn.tooltip:after {
  z-index: 50;
}

:global(.dark) .tool-btn {
  color: rgb(203 213 225);
}

.tool-btn:hover {
  background-color: rgba(226, 232, 240, 0.7);
  color: rgb(15 23 42);
}

:global(.dark) .tool-btn:hover {
  background-color: rgba(51, 65, 85, 0.7);
  color: rgb(255 255 255);
}

.tool-btn:active {
  transform: scale(0.94);
}

.divider {
  height: 16px;
  width: 1px;
  background-color: rgba(203, 213, 225, 0.6);
  margin-left: 2px;
  margin-right: 2px;
  flex-shrink: 0;
}

:global(.dark) .divider {
  background-color: rgba(71, 85, 105, 0.6);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.65);
}
</style>
