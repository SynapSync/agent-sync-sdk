#!/usr/bin/env npx tsx
// examples/07-update.ts — Demonstrates checking for and applying updates

import { writeFile } from 'node:fs/promises';
import {
  setupTempProject,
  teardown,
  writeCognitive,
  printHeader,
  printStep,
  printResult,
  isOk,
} from './_helpers.js';

async function main() {
  printHeader('07 — Update: Check For and Apply Cognitive Updates');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create and install a cognitive ─────────────────────────
    printStep(2, 'Create a skill cognitive and install it');

    const skillPath = await writeCognitive(
      sourceDir,
      'skill',
      'logging-patterns',
      'Best practices for application logging',
      '# Logging Patterns\n\nUse structured logging with JSON output.\nInclude request IDs for traceability.',
    );
    console.log(`  Created source: ${skillPath}`);

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

    // ── Step 3: Check for updates (none expected) ──────────────────────
    printStep(3, 'Check for updates (checkOnly — none expected)');

    const checkBefore = await sdk.update({ checkOnly: true });
    printResult('sdk.update (checkOnly)', checkBefore);

    if (isOk(checkBefore)) {
      console.log(`  Updates available : ${checkBefore.value.updates.length}`);
      console.log(`  Up-to-date        : ${checkBefore.value.upToDate.length}`);
    }

    // ── Step 4: Modify the source file to simulate an upstream change ──
    printStep(4, 'Modify the source file (simulate upstream change)');

    const updatedContent = [
      '---',
      'name: logging-patterns',
      'description: Best practices for application logging',
      'category: general',
      '---',
      '# Logging Patterns (v2)',
      '',
      'Use structured logging with JSON output.',
      'Include request IDs for traceability.',
      'Add log levels: DEBUG, INFO, WARN, ERROR, FATAL.',
      'Rotate logs daily and retain for 30 days.',
    ].join('\n');

    await writeFile(skillPath, updatedContent, 'utf-8');
    console.log(`  Modified: ${skillPath}`);
    console.log('  Added new content about log levels and rotation.');

    // ── Step 5: Check for updates again (update now available) ─────────
    printStep(5, 'Check for updates (checkOnly — update available)');

    const checkAfter = await sdk.update({ checkOnly: true });
    printResult('sdk.update (checkOnly)', checkAfter);

    if (isOk(checkAfter)) {
      console.log(`  Updates available : ${checkAfter.value.updates.length}`);
      console.log(`  Up-to-date        : ${checkAfter.value.upToDate.length}`);

      for (const update of checkAfter.value.updates) {
        console.log(`\n  Pending update:`);
        console.log(`    Name         : ${update.name}`);
        console.log(`    Current hash : ${update.currentHash}`);
        console.log(`    New hash     : ${update.newHash}`);
        console.log(`    Applied      : ${update.applied}`);
      }
    }

    // ── Step 6: Apply the update ───────────────────────────────────────
    printStep(6, 'Apply the update (confirmed)');

    const applyResult = await sdk.update({ confirmed: true });
    printResult('sdk.update (confirmed)', applyResult);

    if (isOk(applyResult)) {
      console.log(`\n  Success  : ${applyResult.value.success}`);
      console.log(`  Message  : ${applyResult.value.message}`);

      for (const update of applyResult.value.updates) {
        console.log(`\n  Applied update:`);
        console.log(`    Name         : ${update.name}`);
        console.log(`    Current hash : ${update.currentHash}`);
        console.log(`    New hash     : ${update.newHash}`);
        console.log(`    Applied      : ${update.applied}`);
      }

      if (applyResult.value.errors.length > 0) {
        console.log('\n  Errors:');
        for (const err of applyResult.value.errors) {
          console.log(`    - ${JSON.stringify(err)}`);
        }
      }
    }

    // ── Step 7: Verify no more updates pending ─────────────────────────
    printStep(7, 'Verify no more updates pending');

    const finalCheck = await sdk.update({ checkOnly: true });
    printResult('sdk.update (final check)', finalCheck);

    if (isOk(finalCheck)) {
      console.log(`  Updates remaining : ${finalCheck.value.updates.length}`);
      console.log(`  Up-to-date        : ${finalCheck.value.upToDate.length}`);
    }

    // ── Step 8: Cleanup ────────────────────────────────────────────────
    printStep(8, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
