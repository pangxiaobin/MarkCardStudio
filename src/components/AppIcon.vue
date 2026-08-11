<script setup>
import { computed } from "vue";
import {
  AlignLeft,
  ArrowUpCircle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Download,
  DownloadCloud,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderOpen,
  Heading2,
  Heading3,
  HeartHandshake,
  Info,
  Languages,
  Layers,
  LayoutGrid,
  List,
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
  Save,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Split,
  Square,
  SunMedium,
  Undo2,
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
  "align-left": AlignLeft,
  "arrow-up-circle": ArrowUpCircle,
  calendar: Calendar,
  check: Check,
  "check-circle": CheckCircle2,
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
  "folder-open": FolderOpen,
  "heading-2": Heading2,
  "heading-3": Heading3,
  "heart-handshake": HeartHandshake,
  info: Info,
  languages: Languages,
  layers: Layers,
  "layout-grid": LayoutGrid,
  list: List,
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
  "refresh-cw": RefreshCw,
  save: Save,
  settings: Settings2,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  split: Split,
  square: Square,
  sun: SunMedium,
  undo: Undo2,
  x: X,
};

const iconComponent = computed(() => iconMap[props.name] ?? FileText);
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
