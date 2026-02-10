#!/usr/bin/env npx tsx
// examples/05-remove.ts — Demonstrates removing installed cognitives

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
  printHeader('05 — Remove: Uninstall Cognitives');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create and install 3 cognitives ──────────────────────
    printStep(2, 'Create and install 3 cognitives');

    await writeCognitive(sourceDir, 'skill', 'skill-a', 'Skill A desc', '# Skill A');
    await writeCognitive(sourceDir, 'skill', 'skill-b', 'Skill B desc', '# Skill B');
    await writeCognitive(sourceDir, 'rule', 'rule-c', 'Rule C desc', '# Rule C');
    console.log('  Created: skill-a, skill-b, rule-c');

    const addResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.add (install all 3)', addResult);

    if (isOk(addResult)) {
      console.log(`  Installed: ${addResult.value.installed.map((c) => c.name).join(', ')}`);
    }

    // ── Step 3: List to confirm 3 installed ──────────────────────────
    printStep(3, 'List installed cognitives (expect 3)');
    const listBefore = await sdk.list();
    printResult('sdk.list()', listBefore);

    if (isOk(listBefore)) {
      console.log(`  Installed count: ${listBefore.value.count}`);
    }

    // ── Step 4: Remove one cognitive ─────────────────────────────────
    printStep(4, 'Remove a single cognitive (skill-a)');
    const removeOne = await sdk.remove(['skill-a'], {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.remove(["skill-a"])', removeOne);

    if (isOk(removeOne)) {
      console.log(`  Removed: ${removeOne.value.removed.map((r) => r.name).join(', ')}`);
      console.log(`  Not found: ${removeOne.value.notFound.length === 0 ? '(none)' : removeOne.value.notFound.join(', ')}`);
    }

    // ── Step 5: List to confirm 2 remaining ──────────────────────────
    printStep(5, 'List installed cognitives (expect 2)');
    const listAfterOne = await sdk.list();
    printResult('sdk.list()', listAfterOne);

    if (isOk(listAfterOne)) {
      console.log(`  Installed count: ${listAfterOne.value.count}`);
    }

    // ── Step 6: Remove two cognitives at once ────────────────────────
    printStep(6, 'Remove two cognitives at once (skill-b, rule-c)');
    const removeTwo = await sdk.remove(['skill-b', 'rule-c'], {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.remove(["skill-b", "rule-c"])', removeTwo);

    if (isOk(removeTwo)) {
      console.log(`  Removed: ${removeTwo.value.removed.map((r) => r.name).join(', ')}`);
    }

    // ── Step 7: List to confirm 0 remaining ──────────────────────────
    printStep(7, 'List installed cognitives (expect 0)');
    const listEmpty = await sdk.list();
    printResult('sdk.list()', listEmpty);

    if (isOk(listEmpty)) {
      console.log(`  Installed count: ${listEmpty.value.count}`);
    }

    // ── Step 8: Remove nonexistent cognitive ─────────────────────────
    printStep(8, 'Remove a nonexistent cognitive');
    const removeGhost = await sdk.remove(['nonexistent'], {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.remove(["nonexistent"])', removeGhost);

    if (isOk(removeGhost)) {
      console.log(`  Removed: ${removeGhost.value.removed.length === 0 ? '(none)' : removeGhost.value.removed.map((r) => r.name).join(', ')}`);
      console.log(`  Not found: ${removeGhost.value.notFound.join(', ')}`);
    }

    // ── Step 9: Cleanup ──────────────────────────────────────────────
    printStep(9, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
