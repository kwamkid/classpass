// src/components/common/FontLoader.tsx
import { useEffect, useState } from 'react'

export function FontLoader({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, setFontsLoaded] = useState(false)
  
  useEffect(() => {
    if ('fonts' in document) {
      document.fonts.ready.then(() => {
        setFontsLoaded(true)
      }).catch((error) => {
        console.error('Font loading error:', error)
        // Set to true anyway to not block the app
        setFontsLoaded(true)
      })
    } else {
      // For browsers that don't support Font Loading API
      setFontsLoaded(true)
    }
  }, [])
  
  // Always render children, but with a class to handle font loading state
  return (
    <div className={fontsLoaded ? 'fonts-loaded' : 'fonts-loading'}>
      {children}
    </div>
  )
}