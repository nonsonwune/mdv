/**
 * Design Tokens
 * Centralized design values for consistent UI across the application
 */

export const tokens = {
  colors: {
    // Primary brand colors (Maroon)
    primary: {
      50: 'var(--maroon-50)',
      100: 'var(--maroon-100)',
      200: 'var(--maroon-200)',
      300: 'var(--maroon-300)',
      400: 'var(--maroon-400)',
      500: 'var(--maroon-500)',
      600: 'var(--maroon-600)',
      700: 'var(--maroon-700)', // Main brand color
      800: 'var(--maroon-800)',
      900: 'var(--maroon-900)',
    },
    
    // Neutral colors
    neutral: {
      0: 'var(--paper)',
      50: 'var(--neutral-50)',
      100: 'var(--neutral-100)',
      200: 'var(--neutral-200)',
      300: 'var(--neutral-300)',
      400: 'var(--neutral-400)',
      500: 'var(--neutral-500)',
      600: 'var(--neutral-600)',
      700: 'var(--neutral-700)',
      800: 'var(--neutral-800)',
      900: 'var(--neutral-900)',
      950: 'var(--neutral-950)',
    },
    
    // Semantic colors
    success: {
      light: 'var(--success-light)',
      DEFAULT: 'var(--success)',
      dark: 'var(--success-dark)',
    },
    warning: {
      light: 'var(--warning-light)',
      DEFAULT: 'var(--warning)',
      dark: 'var(--warning-dark)',
    },
    danger: {
      light: 'var(--danger-light)',
      DEFAULT: 'var(--danger)',
      dark: 'var(--danger-dark)',
    },
    info: {
      light: 'var(--info-light)',
      DEFAULT: 'var(--info)',
      dark: 'var(--info-dark)',
    },
    
    // Text colors
    text: {
      primary: 'var(--ink-900)',
      secondary: 'var(--ink-700)',
      tertiary: 'var(--ink-600)',
      muted: 'var(--ink-500)',
      disabled: 'var(--ink-400)',
      placeholder: 'var(--ink-300)',
      inverse: 'var(--paper)',
    },
    
    // Background colors
    background: {
      primary: 'var(--paper)',
      secondary: 'var(--paper-raised)',
      overlay: 'var(--paper-overlay)',
      muted: 'var(--neutral-50)',
      disabled: 'var(--neutral-100)',
    },
  },
  
  spacing: {
    0: 'var(--space-0)',
    1: 'var(--space-1)', // 0.25rem - 4px
    2: 'var(--space-2)', // 0.5rem - 8px
    3: 'var(--space-3)', // 0.75rem - 12px
    4: 'var(--space-4)', // 1rem - 16px
    5: 'var(--space-5)', // 1.25rem - 20px
    6: 'var(--space-6)', // 1.5rem - 24px
    8: 'var(--space-8)', // 2rem - 32px
    10: 'var(--space-10)', // 2.5rem - 40px
    12: 'var(--space-12)', // 3rem - 48px
    16: 'var(--space-16)', // 4rem - 64px
    20: 'var(--space-20)', // 5rem - 80px
    24: 'var(--space-24)', // 6rem - 96px
  },
  
  typography: {
    fontFamily: {
      sans: 'var(--font-sans)',
      mono: 'var(--font-mono)',
    },
    fontSize: {
      xs: 'var(--text-xs)', // 0.75rem - 12px
      sm: 'var(--text-sm)', // 0.875rem - 14px
      base: 'var(--text-base)', // 1rem - 16px
      lg: 'var(--text-lg)', // 1.125rem - 18px
      xl: 'var(--text-xl)', // 1.25rem - 20px
      '2xl': 'var(--text-2xl)', // 1.5rem - 24px
      '3xl': 'var(--text-3xl)', // 1.875rem - 30px
      '4xl': 'var(--text-4xl)', // 2.25rem - 36px
      '5xl': 'var(--text-5xl)', // 3rem - 48px
      '6xl': 'var(--text-6xl)', // 3.75rem - 60px
    },
    fontWeight: {
      light: 'var(--font-light)',
      normal: 'var(--font-normal)',
      medium: 'var(--font-medium)',
      semibold: 'var(--font-semibold)',
      bold: 'var(--font-bold)',
      extrabold: 'var(--font-extrabold)',
    },
    lineHeight: {
      none: 'var(--leading-none)',
      tight: 'var(--leading-tight)',
      snug: 'var(--leading-snug)',
      normal: 'var(--leading-normal)',
      relaxed: 'var(--leading-relaxed)',
      loose: 'var(--leading-loose)',
    },
  },
  
  borderRadius: {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    base: 'var(--radius-base)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    '2xl': 'var(--radius-2xl)',
    '3xl': 'var(--radius-3xl)',
    full: 'var(--radius-full)',
  },
  
  shadows: {
    xs: 'var(--shadow-xs)',
    sm: 'var(--shadow-sm)',
    md: 'var(--shadow-md)',
    lg: 'var(--shadow-lg)',
    xl: 'var(--shadow-xl)',
    '2xl': 'var(--shadow-2xl)',
    inner: 'var(--shadow-inner)',
    none: 'none',
  },
  
  transitions: {
    none: 'var(--transition-none)',
    all: 'var(--transition-all)',
    colors: 'var(--transition-colors)',
    opacity: 'var(--transition-opacity)',
    shadow: 'var(--transition-shadow)',
    transform: 'var(--transition-transform)',
  },
  
  zIndex: {
    0: 'var(--z-0)',
    10: 'var(--z-10)',
    20: 'var(--z-20)',
    30: 'var(--z-30)',
    40: 'var(--z-40)',
    50: 'var(--z-50)',
    modal: 'var(--z-modal)',
    popover: 'var(--z-popover)',
    dropdown: 'var(--z-dropdown)',
    toast: 'var(--z-toast)',
    tooltip: 'var(--z-tooltip)',
  },
  
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      linear: 'linear',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
} as const

// Type helpers
export type ColorToken = keyof typeof tokens.colors
export type SpacingToken = keyof typeof tokens.spacing
export type FontSizeToken = keyof typeof tokens.typography.fontSize
export type ShadowToken = keyof typeof tokens.shadows
export type RadiusToken = keyof typeof tokens.borderRadius

// Utility function to get CSS variable value
export function getCSSVariable(variable: string): string {
  if (typeof window === 'undefined') return variable
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
}

// Utility function to apply tokens as inline styles
export function tokenStyles(styles: Record<string, string>): React.CSSProperties {
  return styles as React.CSSProperties
}
