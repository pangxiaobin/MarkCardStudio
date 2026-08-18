<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useUpdater } from "../composables/useUpdater";
import AppIcon from "./AppIcon.vue";

const { t } = useI18n();
const {
  updateAvailable,
  updateInfo,
  isDownloading,
  downloadProgress,
  errorMsg,
  toastNotice,
  startDownloadAndInstall,
  dismissUpdate,
} = useUpdater();

const versionTag = computed(() => updateInfo.value?.version || "");
const bodyText = computed(() => updateInfo.value?.body || "");
</script>

<template>
  <Teleport to="body">
    <!-- Floating Toast Notification for Check Feedback -->
    <div
      v-if="toastNotice"
      class="fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2.5 rounded-full px-4 py-2.5 text-xs font-semibold shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 duration-200"
      :class="[
        toastNotice.type === 'success'
          ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
          : toastNotice.type === 'error'
          ? 'bg-red-600 text-white border-red-500 shadow-red-600/20'
          : 'bg-slate-900/90 text-slate-100 border-slate-700 shadow-slate-900/30 dark:bg-slate-100/90 dark:text-slate-900 dark:border-slate-300'
      ]"
    >
      <AppIcon
        :name="toastNotice.type === 'success' ? 'check-circle' : toastNotice.type === 'error' ? 'alert-circle' : 'info'"
        :size="16"
      />
      <span>{{ toastNotice.message }}</span>
    </div>

    <!-- Update Available Modal -->
    <div
      v-if="updateAvailable"
      class="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <section
        class="w-[min(480px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
      >
        <!-- Dialog Header -->
        <div class="flex items-start gap-4 px-6 pt-6 pb-4">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 shadow-sm shadow-blue-500/10 dark:bg-blue-950/60 dark:text-blue-400">
            <AppIcon name="sparkles" :size="22" />
          </span>
          <div class="min-w-0 pt-0.5">
            <div class="flex items-center gap-2">
              <h2 class="text-base font-bold text-slate-900 dark:text-slate-100">
                {{ t("settingsDialog.updateAvailableTitle") }}
              </h2>
              <span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                v{{ versionTag }}
              </span>
            </div>
            <p class="mt-1.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
              {{ t("settingsDialog.updateAvailableDesc", { version: `v${versionTag}` }) }}
            </p>
          </div>
        </div>

        <!-- Release Notes Section (if available) -->
        <div v-if="bodyText" class="mx-6 my-2 max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300 whitespace-pre-wrap">
          <strong class="block mb-1 font-semibold text-slate-800 dark:text-slate-200">{{ t("settingsDialog.releaseNotes") }}:</strong>
          {{ bodyText }}
        </div>

        <!-- Error Message (if any) -->
        <div v-if="errorMsg" class="mx-6 my-2 rounded-xl bg-red-50 p-3 text-xs text-red-600 dark:bg-red-950/60 dark:text-red-300">
          {{ errorMsg }}
        </div>

        <!-- Download Progress Bar -->
        <div v-if="isDownloading" class="mx-6 my-4 space-y-2">
          <div class="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>{{ downloadProgress < 100 ? t("settingsDialog.downloading", { progress: downloadProgress }) : t("settingsDialog.installing") }}</span>
            <span>{{ downloadProgress }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              :style="{ width: `${downloadProgress}%` }"
            ></div>
          </div>
        </div>

        <!-- Action Footer -->
        <footer class="flex justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/50">
          <button
            v-if="!isDownloading"
            type="button"
            class="h-9 rounded-xl border border-slate-300/80 bg-white px-4 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            @click="dismissUpdate"
          >
            {{ t("settingsDialog.dismiss") }}
          </button>

          <button
            type="button"
            class="inline-flex h-9 items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 cursor-pointer"
            :disabled="isDownloading"
            @click="startDownloadAndInstall"
          >
            <AppIcon v-if="!isDownloading" name="download" :size="15" />
            <AppIcon v-else name="loader-2" :size="15" class="animate-spin" />
            <span>{{ isDownloading ? t("settingsDialog.downloading", { progress: downloadProgress }) : t("settingsDialog.downloadAndInstall") }}</span>
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>
