/** 全局 UI 层级规范 - 文档视觉规范7.1节 */
export const Z_INDEX = {
  BASE: 0,
  DROPDOWN: 100,
  STICKY: 200,
  MODAL_BACKDROP: 500,
  MODAL: 501,
  TOOLTIP: 600,
  NOTIFICATION: 700,
  WATERMARK: 9999,
} as const;
