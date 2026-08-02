/**
 * scripts/commit-data.js
 * 
 * Conflict-free git commit+push for the flight price scraper.
 * 
 * Strategy:
 *   1. Read newly-scraped records from the local flights_db.json
 *   2. Fetch latest origin/main
 *   3. Merge: take remote DB as base, append only records not already there
 *   4. Hard-reset working tree to origin/main (clean slate)
 *   5. Write merged DB + regenerate sitemaps
 *   6. Stage all, commit, push
 *   7. Retry up to 3 times in case of a race-condition push rejection
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_PATH = path.resolve(__dirname, '..', 'p', 'VJtracker', 'flights_db.json');
const SITEMAP_SCRIPT = path.resolve(__dirname, 'generate-sitemap.js');

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', ...opts });
}

function loadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function recordKey(r) {
  return `${r.crawlTimestamp}|${r.route}|${r.carrier}|${r.leadDays}`;
}

async function main() {
  // ── 1. Read locally scraped data ─────────────────────────────
  console.log('\n[1] Reading locally scraped DB...');
  const localData = loadJSON(DB_PATH);
  console.log(`    Local records: ${localData.length}`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n[Attempt ${attempt}/3]`);

    try {
      // ── 2. Fetch latest remote ────────────────────────────────
      console.log('[2] Fetching origin/main...');
      run('git fetch origin main');

      // ── 3. Read remote DB ─────────────────────────────────────
      console.log('[3] Loading remote flights_db.json...');
      let remoteData = [];
      try {
        const raw = run('git show origin/main:p/VJtracker/flights_db.json');
        remoteData = JSON.parse(raw);
        console.log(`    Remote records: ${remoteData.length}`);
      } catch (e) {
        console.log('    No remote DB found, starting fresh.');
      }

      // ── 4. Merge: only new records ────────────────────────────
      console.log('[4] Merging records...');
      const remoteKeys = new Set(remoteData.map(recordKey));
      const newRecords = localData.filter(r => !remoteKeys.has(recordKey(r)));
      console.log(`    New records to add: ${newRecords.length}`);
      const merged = remoteData.concat(newRecords);

      // ── 5. Hard-reset to origin/main (clean working tree) ─────
      console.log('[5] Resetting working tree to origin/main...');
      run('git reset --hard origin/main');

      // ── 6. Write merged DB ────────────────────────────────────
      console.log('[6] Writing merged flights_db.json...');
      fs.writeFileSync(DB_PATH, JSON.stringify(merged, null, 2), 'utf8');
      console.log(`    Total records in DB: ${merged.length}`);

      // ── 7. Regenerate sitemaps ────────────────────────────────
      console.log('[7] Regenerating sitemaps...');
      run(`node "${SITEMAP_SCRIPT}"`);

      // ── 8. Stage, commit, push ────────────────────────────────
      console.log('[8] Staging all changes...');
      run('git add -A');

      const statusOut = run('git status --short');
      if (!statusOut.trim()) {
        console.log('    No changes to commit. Done.');
        process.exit(0);
      }

      const timestamp = new Date().toUTCString();
      console.log(`[9] Committing: "Auto-update flight prices: ${timestamp}"`);
      run(`git commit -m "Auto-update flight prices: ${timestamp}"`);

      console.log('[10] Pushing to origin/main...');
      run('git push origin main');

      console.log('\n✓ Done! Flight prices committed and pushed.');
      process.exit(0);

    } catch (err) {
      console.error(`\n✗ Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 3) {
        console.log('   Retrying in 3 seconds...');
        await new Promise(r => setTimeout(r, 3000));
      } else {
        console.error('All 3 attempts failed. Exiting with error.');
        process.exit(1);
      }
    }
  }
}

main();
