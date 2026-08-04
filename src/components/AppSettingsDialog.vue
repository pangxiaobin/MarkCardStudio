<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_INFO } from "../config/appInfo.js";
import { useAppPreferences } from "../i18n/index.js";
import AppIcon from "./AppIcon.vue";

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);
const { t } = useI18n();
const {
  languagePreference,
  appearancePreference,
  setLanguagePreference,
  setAppearancePreference,
} = useAppPreferences();

const activeSection = ref("general");
const closeButtonRef = ref(null);
const dialogRef = ref(null);
const isLanguageDropdownOpen = ref(false);
const languageDropdownRef = ref(null);

let previouslyFocusedElement = null;

const sections = computed(() => [
  { id: "general", label: t("settingsDialog.general"), icon: "settings" },
  { id: "about", label: t("settingsDialog.about"), icon: "info" },
  { id: "support", label: t("settingsDialog.support"), icon: "heart-handshake" },
]);

const activeSectionTitle = computed(() => {
  const section = sections.value.find((item) => item.id === activeSection.value);
  return section?.label ?? t("settingsDialog.general");
});

const languageOptions = computed(() => [
  { value: "system", label: t("settingsDialog.followSystem") },
  { value: "zh-CN", label: t("settingsDialog.chinese") },
  { value: "en-US", label: t("settingsDialog.english") },
]);

const currentLanguageLabel = computed(() => {
  const option = languageOptions.value.find((opt) => opt.value === languagePreference.value);
  return option ? option.label : t("settingsDialog.followSystem");
});

const appearanceOptions = computed(() => [
  { value: "system", label: t("settingsDialog.systemAppearance"), icon: "monitor" },
  { value: "light", label: t("settingsDialog.light"), icon: "sun" },
  { value: "dark", label: t("settingsDialog.dark"), icon: "moon" },
]);

const authorDetails = computed(() => [
  { label: t("settingsDialog.author"), value: APP_INFO.author.name },
  {
    label: t("settingsDialog.github"),
    value: APP_INFO.author.github,
    href: APP_INFO.author.github,
  },
  {
    label: t("settingsDialog.website"),
    value: APP_INFO.author.website,
    href: APP_INFO.author.website,
  },
  {
    label: t("settingsDialog.email"),
    value: APP_INFO.author.email,
    href: APP_INFO.author.email ? `mailto:${APP_INFO.author.email}` : "",
  },
].filter((item) => item.value));

async function openDetailLink(event, href) {
  if (!isTauri()) return;

  event.preventDefault();
  await openUrl(href);
}

function close() {
  isLanguageDropdownOpen.value = false;
  emit("close");
}

function selectLanguage(value) {
  setLanguagePreference(value);
  isLanguageDropdownOpen.value = false;
}

function handleClickOutside(event) {
  if (
    isLanguageDropdownOpen.value &&
    languageDropdownRef.value &&
    !languageDropdownRef.value.contains(event.target)
  ) {
    isLanguageDropdownOpen.value = false;
  }
}

function handleKeydown(event) {
  if (!props.open) return;

  if (event.key === "Escape") {
    if (isLanguageDropdownOpen.value) {
      isLanguageDropdownOpen.value = false;
      return;
    }
    close();
    return;
  }

  if (event.key !== "Tab") return;

  const focusableElements = Array.from(
    dialogRef.value?.querySelectorAll(
      'button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ) || [],
  ).filter((element) => element.getClientRects().length > 0);

  if (!focusableElements.length) {
    event.preventDefault();
    dialogRef.value?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      previouslyFocusedElement = document.activeElement;
      activeSection.value = "general";
      isLanguageDropdownOpen.value = false;
      await nextTick();
      closeButtonRef.value?.focus();
      return;
    }

    isLanguageDropdownOpen.value = false;
    await nextTick();
    previouslyFocusedElement?.focus?.();
    previouslyFocusedElement = null;
  },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  document.addEventListener("mousedown", handleClickOutside);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
  document.removeEventListener("mousedown", handleClickOutside);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      @mousedown.self="close"
    >
      <section
        ref="dialogRef"
        class="grid h-[min(540px,calc(100vh-2rem))] w-[min(720px,calc(100vw-2rem))] grid-cols-[190px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-label="t('settingsDialog.title')"
      >
        <!-- Sidebar Navigation -->
        <aside class="flex min-h-0 flex-col border-r border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
          <div class="flex items-center gap-2.5 px-2 py-2.5">
            <span class="grid h-7.5 w-7.5 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
              <AppIcon name="settings" :size="15" />
            </span>
            <strong class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t("settingsDialog.title") }}</strong>
          </div>

          <nav class="mt-4 space-y-1.5" :aria-label="t('settingsDialog.title')">
            <button
              v-for="section in sections"
              :key="section.id"
              type="button"
              class="relative flex h-9.5 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs font-semibold transition-all duration-200 cursor-pointer"
              :class="
                activeSection === section.id
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
              "
              :aria-current="activeSection === section.id ? 'page' : undefined"
              @click="activeSection = section.id"
            >
              <!-- Active Indicator Bar -->
              <span
                v-if="activeSection === section.id"
                class="absolute left-1 top-2 bottom-2 w-1 rounded-full bg-blue-600 dark:bg-blue-400"
              ></span>

              <AppIcon
                :name="section.icon"
                :size="15"
                :class="activeSection === section.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'"
              />
              <span>{{ section.label }}</span>
            </button>
          </nav>

          <div class="mt-auto border-t border-slate-200/70 px-2 pt-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
            {{ APP_INFO.name }} {{ APP_INFO.version }}
          </div>
        </aside>

        <!-- Main Content Area -->
        <div class="flex min-w-0 flex-col bg-white dark:bg-slate-900">
          <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200/80 px-6 dark:border-slate-800">
            <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">
              {{ activeSectionTitle }}
            </h2>
            <button
              ref="closeButtonRef"
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
              :aria-label="t('settingsDialog.close')"
              :title="t('settingsDialog.close')"
              @click="close"
            >
              <AppIcon name="x" :size="16" />
            </button>
          </header>

          <main class="min-h-0 flex-1 overflow-y-auto p-6">
            <!-- General Settings -->
            <div v-if="activeSection === 'general'" class="space-y-7">
              <!-- Language Selector Custom Dropdown -->
              <section class="space-y-3">
                <div>
                  <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t("settingsDialog.language") }}</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ t("settingsDialog.languageDescription") }}</p>
                </div>

                <div class="relative" ref="languageDropdownRef">
                  <button
                    type="button"
                    class="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 px-3.5 text-xs font-medium text-slate-800 shadow-2xs transition-all hover:border-blue-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-100 dark:hover:border-blue-600/50 dark:hover:bg-slate-800 dark:focus:border-blue-500 cursor-pointer"
                    :aria-expanded="isLanguageDropdownOpen"
                    @click="isLanguageDropdownOpen = !isLanguageDropdownOpen"
                  >
                    <div class="flex items-center gap-3">
                      <span class="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        <AppIcon name="languages" :size="15" />
                      </span>
                      <span class="font-semibold text-slate-800 dark:text-slate-100">{{ currentLanguageLabel }}</span>
                    </div>

                    <AppIcon
                      name="chevron-down"
                      :size="14"
                      class="text-slate-400 transition-transform duration-200"
                      :class="isLanguageDropdownOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''"
                    />
                  </button>

                  <!-- Custom Dropdown Popover Menu -->
                  <div
                    v-if="isLanguageDropdownOpen"
                    class="absolute left-0 right-0 top-full mt-1.5 z-30 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-lg animate-in fade-in zoom-in-95 duration-150 dark:border-slate-700/90 dark:bg-slate-800/95"
                  >
                    <button
                      v-for="option in languageOptions"
                      :key="option.value"
                      type="button"
                      class="flex h-9.5 w-full items-center justify-between rounded-lg px-3 text-xs font-medium transition-colors cursor-pointer"
                      :class="
                        languagePreference === option.value
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                          : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-700/70'
                      "
                      @click="selectLanguage(option.value)"
                    >
                      <span>{{ option.label }}</span>
                      <AppIcon
                        v-if="languagePreference === option.value"
                        name="check"
                        :size="14"
                        class="text-blue-600 dark:text-blue-400"
                      />
                    </button>
                  </div>
                </div>
              </section>

              <!-- Appearance Radio Group -->
              <section class="space-y-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                <div>
                  <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t("settingsDialog.appearance") }}</h3>
                  <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ t("settingsDialog.appearanceDescription") }}</p>
                </div>
                <div class="grid grid-cols-3 gap-3" role="radiogroup" :aria-label="t('settingsDialog.appearance')">
                  <button
                    v-for="option in appearanceOptions"
                    :key="option.value"
                    type="button"
                    role="radio"
                    class="relative flex h-21 flex-col items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer"
                    :class="
                      appearancePreference === option.value
                        ? 'border-2 border-blue-600 bg-blue-50/70 text-blue-700 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300 shadow-2xs'
                        : 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'
                    "
                    :aria-checked="appearancePreference === option.value"
                    @click="setAppearancePreference(option.value)"
                  >
                    <!-- Checkmark badge on selected appearance -->
                    <span
                      v-if="appearancePreference === option.value"
                      class="absolute top-2 right-2 grid h-4 w-4 place-items-center rounded-full bg-blue-600 text-white dark:bg-blue-500"
                    >
                      <AppIcon name="check" :size="10" />
                    </span>

                    <AppIcon :name="option.icon" :size="19" :class="appearancePreference === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400'" />
                    <span>{{ option.label }}</span>
                  </button>
                </div>
              </section>
            </div>

            <!-- About Section -->
            <div v-else-if="activeSection === 'about'" class="space-y-6">
              <section class="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/50">
                <span class="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200/50 dark:bg-slate-900 dark:ring-slate-700/50">
                  <img src="/logo.png" :alt="APP_INFO.name" width="48" height="48" />
                </span>
                <div>
                  <h3 class="text-base font-bold text-slate-800 dark:text-slate-100">{{ APP_INFO.name }}</h3>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ t("settingsDialog.appInformation") }}</p>
                </div>
              </section>

              <dl class="divide-y divide-slate-100 rounded-xl border border-slate-200/80 dark:divide-slate-800 dark:border-slate-800 overflow-hidden">
                <div class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt class="text-slate-500 dark:text-slate-400">{{ t("settingsDialog.version") }}</dt>
                  <dd class="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{{ APP_INFO.version }}</dd>
                </div>
                <div class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt class="text-slate-500 dark:text-slate-400">{{ t("settingsDialog.license") }}</dt>
                  <dd class="text-slate-800 dark:text-slate-100 font-medium">{{ APP_INFO.license }}</dd>
                </div>
                <div v-for="detail in authorDetails" :key="detail.label" class="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <dt class="text-slate-500 dark:text-slate-400">{{ detail.label }}</dt>
                  <dd class="min-w-0 truncate text-slate-800 dark:text-slate-100 font-medium">
                    <a
                      v-if="detail.href"
                      :href="detail.href"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-blue-600 underline decoration-blue-300 underline-offset-2 transition-colors hover:text-blue-700 dark:text-blue-400 dark:decoration-blue-700 dark:hover:text-blue-300"
                      :title="detail.value"
                      @click="openDetailLink($event, detail.href)"
                    >
                      {{ detail.value }}
                    </a>
                    <template v-else>{{ detail.value }}</template>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Support Section -->
            <div v-else class="space-y-5">
              <header>
                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-100">{{ t("settingsDialog.supportTitle") }}</h3>
                <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ t("settingsDialog.supportDescription") }}</p>
              </header>

              <div class="grid grid-cols-[160px_minmax(0,1fr)] gap-4">
                <section class="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ t("settingsDialog.donation") }}</h4>
                  <p class="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{{ t("settingsDialog.donationDescription") }}</p>
                  <img
                    src="/wx_sponsor.webp"
                    :alt="t('settingsDialog.donationQrAlt')"
                    width="828"
                    height="828"
                    class="mt-3 aspect-square w-full rounded-lg object-cover"
                  />
                </section>

                <section class="flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/50">
                  <h4 class="text-xs font-bold text-slate-800 dark:text-slate-100">{{ t("settingsDialog.wechatOfficialAccount") }}</h4>
                  <p class="mt-1 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{{ t("settingsDialog.wechatDescription") }}</p>
                  <div class="mt-3 flex flex-1 items-center">
                    <img
                      src="/wx.webp"
                      :alt="t('settingsDialog.wechatQrAlt')"
                      width="2694"
                      height="910"
                      class="w-full rounded-lg object-contain"
                    />
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </section>
    </div>
  </Teleport>
</template>
