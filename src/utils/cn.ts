// ============================================
// Fundly.id — className Merge Utility
// ============================================

/**
 * Merge multiple class names, filtering out falsy values
 * @example cn('base-class', isActive && 'active', className)
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
