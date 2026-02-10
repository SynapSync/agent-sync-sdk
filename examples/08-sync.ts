#!/usr/bin/env npx tsx
// examples/08-sync.ts — Demonstrates synchronizing and repairing the installation state

import {
  setupTempProject,
  teardown,
  writeCognitive,
  printHeader,
  printStep,
  printResult,
  printTable,
  isOk,
} from './_helpers.js';

async function main() {
  printHeader('08 — Sync: Synchronize and Repair Installation State');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create and install cognitives ──────────────────────────
    printStep(2, 'Create source cognitives and install them');

    await writeCognitive(
      sourceDir,
      'skill',
      'api-design',
      'RESTful API design patterns',
      '# API Design\n\nUse consistent naming conventions.\nVersion your APIs from day one.',
    );
    console.log('  Created: api-design (skill)');

    await writeCognitive(
      sourceDir,
      'rule',
      'error-handling',
      'Error handling standards',
      '# Error Handling\n\nAlways use custom error classes.\nNever swallow exceptions silently.',
    );
    console.log('  Created: error-handling (rule)');

    await writeCognitive(
      sourceDir,
      'prompt',
      'code-review-checklist',
      'Checklist for code reviews',
      '# Code Review Checklist\n\nCheck for security issues.\nVerify test coverage.\nReview error handling.',
    );
    console.log('  Created: code-review-checklist (prompt)');

    const addResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.add (install)', addResult);

    if (!isOk(addResult)) {
      console.log('  Installation failed — cannot continue.');
      return;
    }
    console.log(`  Installed ${addResult.value.installed.length} cognitive(s).`);

    // ── Step 3: Dry-run sync to inspect issues ─────────────────────────
    printStep(3, 'Sync dry run — inspect issues without fixing');

    const dryRunResult = await sdk.sync({ dryRun: true });
    printResult('sdk.sync (dryRun)', dryRunResult);

    if (isOk(dryRunResult)) {
      console.log(`  Success   : ${dryRunResult.value.success}`);
      console.log(`  Issues    : ${dryRunResult.value.issues.length}`);
      console.log(`  Fixed     : ${dryRunResult.value.fixed}`);
      console.log(`  Remaining : ${dryRunResult.value.remaining}`);
      console.log(`  Message   : ${dryRunResult.value.message}`);

      if (dryRunResult.value.issues.length > 0) {
        console.log('\n  Detected issues:');
        const rows = dryRunResult.value.issues.map((issue) => ({
          name: issue.name,
          type: issue.type,
          description: issue.description,
          fixed: issue.fixed,
        }));
        printTable(rows);
      } else {
        console.log('  No issues detected — installation is healthy.');
      }
    }

    // ── Step 4: Full sync to repair any issues ─────────────────────────
    printStep(4, 'Sync confirmed — repair any issues');

    const syncResult = await sdk.sync({ confirmed: true });
    printResult('sdk.sync (confirmed)', syncResult);

    if (isOk(syncResult)) {
      console.log(`\n  Success   : ${syncResult.value.success}`);
      console.log(`  Fixed     : ${syncResult.value.fixed}`);
      console.log(`  Remaining : ${syncResult.value.remaining}`);
      console.log(`  Message   : ${syncResult.value.message}`);

      if (syncResult.value.issues.length > 0) {
        console.log('\n  Issues and their status:');
        const rows = syncResult.value.issues.map((issue) => ({
          name: issue.name,
          type: issue.type,
          description: issue.description,
          fixed: issue.fixed,
        }));
        printTable(rows);
      } else {
        console.log('  No issues found — everything is in sync.');
      }
    }

    // ── Step 5: Verify with a health check ─────────────────────────────
    printStep(5, 'Verify with sdk.check()');

    const checkResult = await sdk.check();
    printResult('sdk.check (post-sync)', checkResult);

    if (isOk(checkResult)) {
      console.log(`\n  Healthy : ${checkResult.value.healthy.length} cognitive(s)`);
      console.log(`  Issues  : ${checkResult.value.issues.length}`);

      for (const name of checkResult.value.healthy) {
        console.log(`    [OK] ${name}`);
      }

      for (const issue of checkResult.value.issues) {
        console.log(`    [ISSUE] ${JSON.stringify(issue)}`);
      }
    }

    // ── Step 6: Cleanup ────────────────────────────────────────────────
    printStep(6, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
