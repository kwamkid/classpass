// src/config/fonts.ts

// Font stack configuration
export const fontFamily = {
  // Main font stack with proper fallbacks
  sans: [
    'IBM Plex Sans Thai',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
    // Fallback for iOS
    '-apple-system',
    'BlinkMacSystemFont',
    // Fallback for Android
    'Roboto',
    // Fallback for Windows
    'Segoe UI',
    // Emoji support
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol',
  ].join(', '),
  
  // Monospace font for code
  mono: [
    'IBM Plex Mono',
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ].join(', '),
}

// Font weight mappings
export const fontWeight = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
}

// Initialize fonts
export function initializeFonts() {
  // Check if fonts are loaded
  if ('fonts' in document) {
    document.fonts.ready.then(() => {
      console.log('Fonts loaded successfully')
    }).catch((error) => {
      console.error('Font loading error:', error)
    })
  }
  
  // Add CSS custom properties
  const root = document.documentElement
  root.style.setProperty('--font-sans', fontFamily.sans)
  root.style.setProperty('--font-mono', fontFamily.mono)
}