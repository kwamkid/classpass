// scripts/migratePackagesToMultiCourse.ts
import { initializeApp } from 'firebase/app'
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc,
  writeBatch,
  getDoc 
} from 'firebase/firestore'

// Firebase config - ใส่ config ของคุณ
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migratePackages() {
  console.log('🚀 Starting package migration...')
  
  try {
    // Get all packages
    const packagesSnapshot = await getDocs(collection(db, 'credit_packages'))
    console.log(`Found ${packagesSnapshot.size} packages to migrate`)
    
    let migrated = 0
    let skipped = 0
    
    // Use batch for better performance
    const batch = writeBatch(db)
    let batchCount = 0
    
    for (const packageDoc of packagesSnapshot.docs) {
      const data = packageDoc.data()
      
      // Skip if already migrated
      if (data.applicableCourseIds !== undefined) {
        console.log(`⏭️  Package ${packageDoc.id} already migrated`)
        skipped++
        continue
      }
      
      // Migrate courseId to applicableCourseIds
      const updateData = {
        applicableCourseIds: data.courseId ? [data.courseId] : [],
        isUniversal: false
      }
      
      batch.update(doc(db, 'credit_packages', packageDoc.id), updateData)
      migrated++
      batchCount++
      
      // Commit batch every 500 documents
      if (batchCount >= 500) {
        await batch.commit()
        console.log(`✅ Migrated ${migrated} packages so far...`)
        batchCount = 0
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit()
    }
    
    console.log(`✅ Package migration complete!`)
    console.log(`   - Migrated: ${migrated} packages`)
    console.log(`   - Skipped: ${skipped} packages`)
    
  } catch (error) {
    console.error('❌ Error during package migration:', error)
  }
}

async function migrateStudentCredits() {
  console.log('🚀 Starting student credits migration...')
  
  try {
    const creditsSnapshot = await getDocs(collection(db, 'student_credits'))
    console.log(`Found ${creditsSnapshot.size} student credits to migrate`)
    
    let migrated = 0
    let skipped = 0
    let errors = 0
    
    const batch = writeBatch(db)
    let batchCount = 0
    
    for (const creditDoc of creditsSnapshot.docs) {
      const data = creditDoc.data()
      
      // Skip if already migrated
      if (data.applicableCourseIds !== undefined) {
        console.log(`⏭️  Credit ${creditDoc.id} already migrated`)
        skipped++
        continue
      }
      
      try {
        // Get package data to copy applicableCourseIds
        let applicableCourseIds = []
        let isUniversal = false
        
        if (data.packageId) {
          const packageDoc = await getDoc(doc(db, 'credit_packages', data.packageId))
          if (packageDoc.exists()) {
            const packageData = packageDoc.data()
            applicableCourseIds = packageData.applicableCourseIds || [data.courseId] || []
            isUniversal = packageData.isUniversal || false
          }
        }
        
        // Fallback to courseId if no package data
        if (applicableCourseIds.length === 0 && data.courseId) {
          applicableCourseIds = [data.courseId]
        }
        
        const updateData = {
          applicableCourseIds,
          isUniversal
        }
        
        batch.update(doc(db, 'student_credits', creditDoc.id), updateData)
        migrated++
        batchCount++
        
        // Commit batch every 500 documents
        if (batchCount >= 500) {
          await batch.commit()
          console.log(`✅ Migrated ${migrated} credits so far...`)
          batchCount = 0
        }
        
      } catch (error) {
        console.error(`❌ Error migrating credit ${creditDoc.id}:`, error)
        errors++
      }
    }
    
    // Commit remaining
    if (batchCount > 0) {
      await batch.commit()
    }
    
    console.log(`✅ Student credits migration complete!`)
    console.log(`   - Migrated: ${migrated} credits`)
    console.log(`   - Skipped: ${skipped} credits`)
    console.log(`   - Errors: ${errors} credits`)
    
  } catch (error) {
    console.error('❌ Error during student credits migration:', error)
  }
}

// Run migrations
async function runMigration() {
  console.log('🔄 Starting ClassPass Multi-Course Migration')
  console.log('=====================================')
  
  // Migrate packages first
  await migratePackages()
  
  console.log('\n')
  
  // Then migrate student credits
  await migrateStudentCredits()
  
  console.log('\n✨ Migration completed!')
  process.exit(0)
}

// Execute
runMigration().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})