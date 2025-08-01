// src/services/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// Environment check
const env = {
  mode: import.meta.env.MODE,
  isProd: import.meta.env.PROD,
  isDev: import.meta.env.DEV,
  hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  apiKeyLength: import.meta.env.VITE_FIREBASE_API_KEY?.length || 0
}

console.log('Environment check:', env)

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Validate config
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId']
const missingFields = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig])

if (missingFields.length > 0) {
  console.error('❌ Missing Firebase configuration:', missingFields)
  console.error('Current config:', {
    ...firebaseConfig,
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 10)}...` : undefined
  })
  
  throw new Error(`Missing Firebase configuration: ${missingFields.join(', ')}. Please check your .env file.`)
}

// Initialize Firebase
let app
try {
  app = initializeApp(firebaseConfig)
  console.log('🔥 Firebase initialized:', !!app)
} catch (error) {
  console.error('Failed to initialize Firebase:', error)
  throw error
}

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Set persistence to LOCAL (default is LOCAL, but let's be explicit)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Firebase Auth persistence set to LOCAL')
  })
  .catch((error) => {
    console.error('❌ Error setting auth persistence:', error)
  })

export default app