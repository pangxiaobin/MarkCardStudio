const STICKER_ROOT = "/stickers/openmoji";

const COVER_STICKERS = {
  "theme-warm": [
    { src: `${STICKER_ROOT}/1F970.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/2728.svg`, position: "bottom-left" },
  ],
  "theme-fresh": [
    { src: `${STICKER_ROOT}/1F98B.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F331.svg`, position: "bottom-left" },
  ],
  "theme-ink": [
    { src: `${STICKER_ROOT}/1F4A1.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F4CA.svg`, position: "bottom-left" },
  ],
  "theme-apple-notes": [
    { src: `${STICKER_ROOT}/270F.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F4CC.svg`, position: "bottom-left" },
  ],
  "theme-instagram": [
    { src: `${STICKER_ROOT}/1F4F8.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F49C.svg`, position: "bottom-left" },
  ],
  "theme-spiral": [
    { src: `${STICKER_ROOT}/1F4CE.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/2B50.svg`, position: "bottom-left" },
  ],
  "theme-newspaper": [
    { src: `${STICKER_ROOT}/1F4F0.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/2615.svg`, position: "bottom-left" },
  ],
  "theme-cyberpunk": [
    { src: `${STICKER_ROOT}/1F916.svg`, position: "bottom-right" },
    { src: `${STICKER_ROOT}/1F680.svg`, position: "bottom-left" },
  ],
  "theme-ali-orange": [
    { src: `${STICKER_ROOT}/2728.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F4A1.svg`, position: "bottom-left" },
  ],
  "theme-byte-pulse": [
    { src: `${STICKER_ROOT}/1F680.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F4A1.svg`, position: "bottom-left" },
  ],
  "theme-macos-window": [
    { src: `${STICKER_ROOT}/1F4F8.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F4CC.svg`, position: "bottom-left" },
  ],
  "theme-bauhaus": [
    { src: `${STICKER_ROOT}/2B50.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/2B50.svg`, position: "bottom-left" },
  ],
  "theme-swiss-grid": [
    { src: `${STICKER_ROOT}/1F4CA.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/270F.svg`, position: "bottom-left" },
  ],
  "theme-riso-jam": [
    { src: `${STICKER_ROOT}/1F49C.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F970.svg`, position: "bottom-left" },
  ],
  "theme-y2k-chrome": [
    { src: `${STICKER_ROOT}/2728.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F49C.svg`, position: "bottom-left" },
  ],
  "theme-blueprint": [
    { src: `${STICKER_ROOT}/1F4CE.svg`, position: "top-right" },
    { src: `${STICKER_ROOT}/1F4CA.svg`, position: "bottom-left" },
  ],
};

export function getCoverStickers(themeClass) {
  return COVER_STICKERS[themeClass] || COVER_STICKERS["theme-warm"];
}
