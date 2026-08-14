import { markRaw, ref, shallowRef, toRaw } from "vue";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

const LAST_CHECK_KEY = "markcard_last_update_check_time";
const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const AUTO_CHECK_TIMEOUT = 3000; // 3 seconds timeout for auto startup check
const MANUAL_CHECK_TIMEOUT = 10000; // 10 seconds timeout for manual check

const isChecking = ref(false);
const updateAvailable = ref(false);
const updateInfo = shallowRef(null);
const isDownloading = ref(false);
const downloadProgress = ref(0);
const errorMsg = ref("");
const isUpToDate = ref(false);
const toastNotice = ref(null); // { message, type: 'success' | 'error' | 'info' }

let toastTimer = null;

function showToast(message, type = "info", duration = 3500) {
  if (toastTimer) clearTimeout(toastTimer);
  toastNotice.value = { message, type };
  toastTimer = setTimeout(() => {
    toastNotice.value = null;
    toastTimer = null;
  }, duration);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

export function useUpdater() {
  async function checkForUpdates(isAutoCheck = false) {
    // Graceful fallback for non-Tauri browser environment
    if (typeof window === "undefined" || !window.__TAURI_INTERNALS__) {
      if (!isAutoCheck) {
        errorMsg.value = "Web browser mode does not support Tauri app updates";
        showToast("当前处于 Web 浏览器模式，暂不支持桌面应用自动更新", "info");
      }
      return null;
    }

    if (isAutoCheck) {
      const autoUpdateEnabled = localStorage.getItem("markcard_studio_auto_update_preference_v1") !== "false";
      if (!autoUpdateEnabled) {
        return null;
      }

      const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
      if (lastCheck && Date.now() - Number(lastCheck) < CHECK_INTERVAL) {
        return null;
      }
    }

    isChecking.value = true;
    errorMsg.value = "";
    isUpToDate.value = false;

    try {
      const timeoutMs = isAutoCheck ? AUTO_CHECK_TIMEOUT : MANUAL_CHECK_TIMEOUT;
      const update = await withTimeout(check(), timeoutMs);

      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));

      if (update && update.available) {
        updateAvailable.value = true;
        updateInfo.value = markRaw(update);
        return update;
      }

      updateAvailable.value = false;
      updateInfo.value = null;
      isUpToDate.value = true;
      if (!isAutoCheck) {
        showToast("当前已是最新版本！", "success");
      }
      return null;
    } catch (err) {
      if (isAutoCheck) {
        console.warn("[AutoUpdate] Startup check skipped or timed out:", err?.message || err);
      } else {
        console.error("[UpdateCheck] Error checking for updates:", err);
        const msg = err?.message?.includes("Timeout")
          ? "网络连接超时，请检查是否能正常访问网络"
          : `检查更新失败: ${err?.message || "网络异常"}`;
        errorMsg.value = msg;
        showToast(msg, "error", 4500);
      }
      return null;
    } finally {
      isChecking.value = false;
    }
  }

  async function startDownloadAndInstall() {
    const rawUpdate = toRaw(updateInfo.value);
    if (!rawUpdate) return;

    isDownloading.value = true;
    downloadProgress.value = 0;
    errorMsg.value = "";

    try {
      let downloadedBytes = 0;
      let totalBytes = 0;

      await rawUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            totalBytes = event.data.contentLength || 0;
            break;
          case "Progress":
            downloadedBytes += event.data.chunkLength;
            if (totalBytes > 0) {
              downloadProgress.value = Math.round((downloadedBytes / totalBytes) * 100);
            }
            break;
          case "Finished":
            downloadProgress.value = 100;
            break;
        }
      });

      await relaunch();
    } catch (err) {
      console.error("[UpdateInstall] Download or install failed:", err);
      errorMsg.value = err?.message || String(err);
      showToast(`更新下载/安装失败: ${err?.message || err}`, "error", 5000);
    } finally {
      isDownloading.value = false;
    }
  }

  function dismissUpdate() {
    updateAvailable.value = false;
  }

  return {
    isChecking,
    updateAvailable,
    updateInfo,
    isDownloading,
    downloadProgress,
    errorMsg,
    isUpToDate,
    toastNotice,
    checkForUpdates,
    startDownloadAndInstall,
    dismissUpdate,
  };
}
