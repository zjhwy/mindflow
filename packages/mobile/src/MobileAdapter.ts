/**
 * 移动端适配层 - 文档视觉规范第8.2节
 * 设备检测、触摸手势系统、响应式布局、虚拟键盘适配、性能策略
 */
export class MobileAdapter {
  // 断点常量
  static readonly BREAKPOINT_MOBILE = 768;
  static readonly BREAKPOINT_TABLET = 1024;

  /** 检测是否移动设备 */
  static isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  /** 检测是否为触摸设备 */
  static isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }

  /** 检测是否为小屏设备 (<768px) */
  static isSmallScreen(): boolean {
    return window.innerWidth < MobileAdapter.BREAKPOINT_MOBILE;
  }

  /** 检测是否平板 */
  static isTablet(): boolean {
    return (
      /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent) ||
      (MobileAdapter.isTouchDevice() && window.innerWidth >= MobileAdapter.BREAKPOINT_MOBILE && window.innerWidth < MobileAdapter.BREAKPOINT_TABLET)
    );
  }

  /** iOS 检测 */
  static isIOS(): boolean {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  /** Android 检测 */
  static isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  /** 获取最小触摸目标尺寸 (WCAG 2.1: 44px) */
  static getTouchTargetSize(): number {
    return 44;
  }

  /** 安全可视高度（减去虚拟键盘和底部导航栏） */
  static getSafeViewportHeight(): number {
    return window.innerHeight - (MobileAdapter.isMobile() ? 60 : 0);
  }

  /** 获取屏幕类型 */
  static getScreenType(): 'mobile' | 'tablet' | 'desktop' {
    if (MobileAdapter.isSmallScreen() || (MobileAdapter.isMobile() && window.innerWidth < MobileAdapter.BREAKPOINT_TABLET)) {
      return 'mobile';
    }
    if (window.innerWidth < 1200) {
      return 'tablet';
    }
    return 'desktop';
  }
}
