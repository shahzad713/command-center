/**
 * scripts/resetDatabase.ts — DESTRUCTIVE DATA WIPE (Firebase Admin SDK)
 * =====================================================================
 * Permanently deletes EVERY document in the `accounts`, `videos`, `snapshots`
 * and `users` collections of the target Firebase project. There is no undo and
 * no backup taken. Run only when you truly intend to purge all data.
 *
 * SAFETY: this script refuses to run unless you pass `--yes` on the command line,
 * and it prints the target project id first so you can abort.
 *
 * ── How to run ────────────────────────────────────────────────────────────────
 * 1. Install the dev deps once (already added to package.json):
 *      npm install
 * 2. Get a service-account key with Firestore access:
 *      Firebase console -> Project settings -> Service accounts -> Generate new
 *      private key. Save it OUTSIDE the repo (it is a secret — never commit it).
 * 3. Point the Admin SDK at it and run:
 *      # PowerShell
 *      $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\serviceAccountKey.json"
 *      npm run reset:db -- --yes
 *
 *      # bash
 *      GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json npm run reset:db -- --yes
 *
 *    Optionally set the project explicitly:  $env:GOOGLE_CLOUD_PROJECT="tikok-account-management"
 * ────────────────────────────────────────────────────────────────────────────
 */
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const COLLECTIONS = ['accounts', 'videos', 'snapshots', 'users'] as const
const BATCH_SIZE = 400

async function deleteCollection(db: FirebaseFirestore.Firestore, name: string): Promise<number> {
  let total = 0
  // Repeatedly grab a page of docs and batch-delete until the collection is empty.
  for (;;) {
    const snap = await db.collection(name).limit(BATCH_SIZE).get()
    if (snap.empty) break
    const batch = db.batch()
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    total += snap.size
    process.stdout.write(`  ${name}: deleted ${total}\r`)
    if (snap.size < BATCH_SIZE) break
  }
  console.log(`  ${name}: deleted ${total} document(s).      `)
  return total
}

async function main() {
  if (!process.argv.includes('--yes')) {
    console.error(
      '\nRefusing to run without confirmation.\n' +
        'This PERMANENTLY deletes all documents in: ' + COLLECTIONS.join(', ') + '\n' +
        'Re-run with the --yes flag to proceed:  npm run reset:db -- --yes\n',
    )
    process.exit(1)
  }

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.VITE_FIREBASE_PROJECT_ID,
  })
  const db = getFirestore(app)
  const projectId = (app.options.projectId as string) || '(unknown — check GOOGLE_APPLICATION_CREDENTIALS)'

  console.log(`\n⚠️  Wiping Firestore for project: ${projectId}`)
  console.log(`   Collections: ${COLLECTIONS.join(', ')}\n`)

  let grand = 0
  for (const name of COLLECTIONS) {
    grand += await deleteCollection(db, name)
  }
  console.log(`\n✅ Done. Deleted ${grand} document(s) total.\n`)
  process.exit(0)
}

main().catch((error) => {
  console.error('\n❌ Reset failed:', error)
  process.exit(1)
})
