/**
 * ONE-TIME MIGRATION SCRIPT
 * ==========================
 * Adds `track: "unverified"` to every existing submission that predates
 * the verified/unverified split. Run this ONCE, before deploying the new
 * app code, and before publishing the updated firebase-rules.json (the
 * new rules REQUIRE a `track` field on every submission, so un-migrated
 * old records would otherwise become unreadable/unwritable under the new
 * rules' validation — though existing data that already passed validation
 * under the OLD rules is not retroactively deleted, new writes to sibling
 * paths could be blocked if rules are misconfigured, so do this first).
 *
 * WHAT IT DOES
 * - Reads every record under `submissions/`
 * - If a record has no `track` field, sets it to "unverified"
 * - Leaves everything else untouched
 * - Does NOT touch fraud_detection, flagged_submissions, or config
 *
 * HOW TO RUN
 * 1. Go to Firebase Console → Project Settings → Service Accounts
 * 2. Click "Generate new private key" — downloads a JSON file
 * 3. Save it locally as service-account.json (DO NOT commit this file)
 * 4. In this scripts/ folder: npm install firebase-admin --no-save
 * 5. Run: node migrate-add-track-field.js ./service-account.json
 * 6. Check the console output for how many records were updated
 *
 * This script is idempotent — safe to run more than once. Records that
 * already have a `track` field are skipped.
 */

const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = process.argv[2];

if (!serviceAccountPath) {
  console.error('Usage: node migrate-add-track-field.js <path-to-service-account.json>');
  process.exit(1);
}

const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL || undefined,
});

async function migrate() {
  const db = admin.database();
  const submissionsRef = db.ref('submissions');

  console.log('Reading existing submissions...');
  const snapshot = await submissionsRef.once('value');

  if (!snapshot.exists()) {
    console.log('No submissions found. Nothing to migrate.');
    process.exit(0);
  }

  const updates = {};
  let totalCount = 0;
  let migratedCount = 0;

  snapshot.forEach((child) => {
    totalCount += 1;
    const record = child.val();
    if (!record.track) {
      updates[`${child.key}/track`] = 'unverified';
      migratedCount += 1;
    }
  });

  console.log(`Found ${totalCount} total submissions.`);
  console.log(`${migratedCount} records need the "track" field added.`);

  if (migratedCount === 0) {
    console.log('Nothing to do — all records already tagged.');
    process.exit(0);
  }

  console.log('Applying update...');
  await submissionsRef.update(updates);

  console.log(`Done. ${migratedCount} records tagged as "unverified".`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
