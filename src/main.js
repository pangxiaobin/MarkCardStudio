import { createApp } from "vue";
import App from "./App.vue";
import { i18n, initializeAppPreferences } from "./i18n/index.js";
import "./styles/app.css";

initializeAppPreferences();
createApp(App).use(i18n).mount("#app");
