import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Debug: ตรวจสอบว่ามี environment variables หรือไม่
console.log('Environment check:', {
  mode: import.meta.env.MODE,
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  apiKeyLength: import.meta.env.VITE_FIREBASE_API_KEY?.length || 0
})

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Validate config
if (!firebaseConfig.apiKey) {
  console.error('Firebase API Key is missing!')
  console.error('Available env vars:', Object.keys(import.meta.env))
}

// Initialize Firebase
export const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Helper to check if Firebase is initialized
export const isFirebaseInitialized = () => {
  try {
    return app.name !== undefined
  } catch {
    return false
  }
}

console.log('🔥 Firebase initialized:', isFirebaseInitialized())