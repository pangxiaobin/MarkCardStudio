<script setup>
import { computed } from "vue";
import {
  AlertCircle,
  AlignLeft,
  ArrowUpCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleHelp,
  Download,
  DownloadCloud,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderOpen,
  Hash,
  Heading2,
  Heading3,
  HeartHandshake,
  Info,
  Languages,
  Layers,
  LayoutGrid,
  List,
  Loader,
  Loader2,
  Maximize2,
  Minus,
  Moon,
  Monitor,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Power,
  Quote,
  Redo2,
  RefreshCw,
  RotateCw,
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Split,
  Square,
  SunMedium,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "@lucide/vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 16,
  },
  strokeWidth: {
    type: Number,
    default: 2,
  },
});

const iconMap = {
  "alert-circle": AlertCircle,
  "circle-alert": CircleAlert,
  "align-left": AlignLeft,
  "arrow-up-circle": ArrowUpCircle,
  calendar: Calendar,
  check: Check,
  "check-circle": CheckCircle2,
  "check-circle-2": CheckCircle2,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  "circle-help": CircleHelp,
  download: Download,
  "download-cloud": DownloadCloud,
  "external-link": ExternalLink,
  "file-plus-2": FilePlus2,
  "file-text": FileText,
  document: FileText,
  "folder-open": FolderOpen,
  hash: Hash,
  "heading-2": Heading2,
  "heading-3": Heading3,
  "heart-handshake": HeartHandshake,
  info: Info,
  languages: Languages,
  layers: Layers,
  "layout-grid": LayoutGrid,
  list: List,
  loader: Loader2,
  "loader-2": Loader2,
  spinner: Loader2,
  maximize: Maximize2,
  minus: Minus,
  moon: Moon,
  monitor: Monitor,
  palette: Palette,
  "panel-left-close": PanelLeftClose,
  "panel-left-open": PanelLeftOpen,
  "panel-right-close": PanelRightClose,
  "panel-right-open": PanelRightOpen,
  plus: Plus,
  power: Power,
  quote: Quote,
  redo: Redo2,
  refresh: RefreshCw,
  "refresh-cw": RefreshCw,
  "rotate-cw": RotateCw,
  save: Save,
  settings: Settings2,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  split: Split,
  square: Square,
  sun: SunMedium,
  "trash-2": Trash2,
  type: Type,
  undo: Undo2,
  upload: Upload,
  x: X,
};

const iconComponent = computed(() => {
  if (!props.name) return null;
  return iconMap[props.name] || null;
});
</script>

<template>
  <component
    :is="iconComponent"
    v-bind="$attrs"
    :size="size"
    :stroke-width="strokeWidth"
    class="app-icon"
  />
</template>
