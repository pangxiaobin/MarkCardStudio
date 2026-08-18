<script setup>
import { useI18n } from "vue-i18n";
import { APP_INFO } from "../config/appInfo.js";
import { useUpdater } from "../composables/useUpdater.js";
import AppIcon from "./AppIcon.vue";

defineEmits(["open-settings"]);
const { t } = useI18n();
const { isChecking, updateAvailable, isUpToDate, checkForUpdates } = useUpdater();
</script>

<template>
  <header
    class="flex min-h-[64px] shrink-0 items-center justify-between border-b border-slate-200/70 bg-white/90 px-6 py-3.5 backdrop-blur-[18px] dark:border-slate-800/80 dark:bg-slate-950/90 dark:text-slate-100">
    <div class="inline-flex items-center gap-3">
      <span class="brand-logo shrink-0">
        <img src="/logo.png" alt="MarkCard Studio" width="28" height="28" />
      </span>
      <div class="flex flex-col leading-tight">
        <strong class="text-[16px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
          MarkCard Studio
        </strong>
        <span class="text-[10px] font-medium font-mono text-slate-400 dark:text-slate-500">
          v{{ APP_INFO.version }}
        </span>
      </div>
    </div>

    <!-- Top Right Actions: Distinct Check for Updates + Settings -->
    <div class="inline-flex items-center gap-2.5">
      <!-- Check for Updates Button -->
      <button
        type="button"
        class="relative inline-flex h-8.5 w-8.5 items-center justify-center rounded-xl border transition-all duration-200 active:scale-95 disabled:opacity-60 cursor-pointer shadow-2xs"
        :class="[
          updateAvailable
            ? 'border-blue-400 bg-blue-500 text-white shadow-md shadow-blue-500/25 hover:bg-blue-600 animate-pulse'
            : 'border-blue-200/80 bg-blue-50/70 text-blue-600 hover:border-blue-300 hover:bg-blue-100/80 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-900/70'
        ]"
        :disabled="isChecking"
        :aria-label="t('settingsDialog.checkUpdate')"
        :title="
          isChecking
            ? t('settingsDialog.checkingUpdate')
            : updateAvailable
            ? t('settingsDialog.newVersionFound', { version: '' })
            : isUpToDate
            ? t('settingsDialog.upToDate')
            : t('settingsDialog.checkUpdate')
        "
        @click="checkForUpdates(false)"
      >
        <AppIcon
          :name="isChecking ? 'loader-2' : isUpToDate ? 'check-circle' : 'arrow-up-circle'"
          :size="18"
          :class="isChecking ? 'animate-spin' : ''"
        />

        <!-- Red Notification Badge Dot when update is available -->
        <span
          v-if="updateAvailable"
          class="absolute -top-1 -right-1 flex h-3 w-3"
        >
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"></span>
        </span>
      </button>

      <!-- Settings Button -->
      <button
        type="button"
        class="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-98 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 cursor-pointer"
        :aria-label="t('toolbar.settings')"
        :title="t('toolbar.settings')"
        @click="$emit('open-settings')"
      >
        <AppIcon name="settings" :size="15" class="text-slate-500 dark:text-slate-400" />
        <span>{{ t("toolbar.settings") }}</span>
      </button>
    </div>
  </header>
</template>
