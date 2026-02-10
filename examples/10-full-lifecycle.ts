#!/usr/bin/env npx tsx
// examples/10-full-lifecycle.ts — Complete end-to-end workflow demonstrating all SDK operations

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

interface OperationSummary {
  step: number;
  operation: string;
  success: boolean;
  detail: string;
}

async function main() {
  printHeader('10 — Full Lifecycle: End-to-End Cognitive Workflow');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();
  const summary: OperationSummary[] = [];

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Init — create a custom skill ───────────────────────────
    printStep(2, 'Init — scaffold a custom skill');

    const initResult = await sdk.init('custom-debugging', 'skill', {
      description: 'Advanced debugging techniques and tools',
    });
    printResult('sdk.init', initResult);

    if (isOk(initResult)) {
      summary.push({
        step: 2,
        operation: 'init',
        success: true,
        detail: `Created "${initResult.value.cognitiveType}" at ${initResult.value.path} (${initResult.value.files.length} files)`,
      });
    } else {
      summary.push({ step: 2, operation: 'init', success: false, detail: 'Init failed' });
    }

    // ── Step 3: Create source cognitives ────────────────────────────────
    printStep(3, 'Create source cognitives with writeCognitive');

    await writeCognitive(
      sourceDir,
      'skill',
      'security-audit',
      'Security auditing checklist',
      '# Security Audit\n\nCheck for injection vulnerabilities.\nValidate all user inputs.\nReview authentication flows.',
    );
    console.log('  Created: security-audit (skill)');

    await writeCognitive(
      sourceDir,
      'rule',
      'commit-standards',
      'Git commit message standards',
      '# Commit Standards\n\nUse conventional commits format.\nInclude ticket reference in the body.',
    );
    console.log('  Created: commit-standards (rule)');

    await writeCognitive(
      sourceDir,
      'prompt',
      'refactor-helper',
      'Guided refactoring assistant',
      '# Refactor Helper\n\nAnalyze code complexity.\nSuggest extract-method refactoring.\nIdentify duplicate logic.',
    );
    console.log('  Created: refactor-helper (prompt)');

    // ── Step 4: Add — install from source ──────────────────────────────
    printStep(4, 'Add — install cognitives from source');

    const addResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.add', addResult);

    if (isOk(addResult)) {
      const names = addResult.value.installed.map((c) => c.name).join(', ');
      summary.push({
        step: 4,
        operation: 'add',
        success: true,
        detail: `Installed ${addResult.value.installed.length} cognitive(s): ${names}`,
      });
    } else {
      summary.push({ step: 4, operation: 'add', success: false, detail: 'Add failed' });
    }

    // ── Step 5: List — show everything installed ───────────────────────
    printStep(5, 'List — show all installed cognitives');

    const listResult = await sdk.list();
    printResult('sdk.list', listResult);

    if (isOk(listResult)) {
      const rows = listResult.value.cognitives.map((cog) => ({
        name: cog.name,
        type: cog.cognitiveType,
      }));
      printTable(rows);
      summary.push({
        step: 5,
        operation: 'list',
        success: true,
        detail: `Found ${listResult.value.count} cognitive(s)`,
      });
    } else {
      summary.push({ step: 5, operation: 'list', success: false, detail: 'List failed' });
    }

    // ── Step 6: Find — search available in source ──────────────────────
    printStep(6, 'Find — discover cognitives in source directory');

    const findResult = await sdk.find(sourceDir);
    printResult('sdk.find', findResult);

    if (isOk(findResult)) {
      const rows = findResult.value.results.map((cog) => ({
        name: cog.name,
        type: cog.cognitiveType,
      }));
      printTable(rows);
      summary.push({
        step: 6,
        operation: 'find',
        success: true,
        detail: `Discovered ${findResult.value.total} cognitive(s) in source`,
      });
    } else {
      summary.push({ step: 6, operation: 'find', success: false, detail: 'Find failed' });
    }

    // ── Step 7: Check — verify integrity ───────────────────────────────
    printStep(7, 'Check — verify installation integrity');

    const checkResult = await sdk.check();
    printResult('sdk.check', checkResult);

    if (isOk(checkResult)) {
      console.log(`  Healthy : ${checkResult.value.healthy.length}`);
      console.log(`  Issues  : ${checkResult.value.issues.length}`);

      for (const name of checkResult.value.healthy) {
        console.log(`    [OK] ${name}`);
      }
      summary.push({
        step: 7,
        operation: 'check',
        success: true,
        detail: `${checkResult.value.healthy.length} healthy, ${checkResult.value.issues.length} issues`,
      });
    } else {
      summary.push({ step: 7, operation: 'check', success: false, detail: 'Check failed' });
    }

    // ── Step 8: Update — check for updates (none expected) ─────────────
    printStep(8, 'Update — check for updates');

    const updateResult = await sdk.update({ checkOnly: true });
    printResult('sdk.update (checkOnly)', updateResult);

    if (isOk(updateResult)) {
      console.log(`  Updates available : ${updateResult.value.updates.length}`);
      console.log(`  Up-to-date        : ${updateResult.value.upToDate.length}`);
      summary.push({
        step: 8,
        operation: 'update',
        success: true,
        detail: `${updateResult.value.updates.length} updates, ${updateResult.value.upToDate.length} up-to-date`,
      });
    } else {
      summary.push({ step: 8, operation: 'update', success: false, detail: 'Update failed' });
    }

    // ── Step 9: Sync — synchronize installation ────────────────────────
    printStep(9, 'Sync — synchronize installation state');

    const syncResult = await sdk.sync({ confirmed: true });
    printResult('sdk.sync', syncResult);

    if (isOk(syncResult)) {
      console.log(`  Fixed     : ${syncResult.value.fixed}`);
      console.log(`  Remaining : ${syncResult.value.remaining}`);
      summary.push({
        step: 9,
        operation: 'sync',
        success: true,
        detail: `${syncResult.value.fixed} fixed, ${syncResult.value.remaining} remaining`,
      });
    } else {
      summary.push({ step: 9, operation: 'sync', success: false, detail: 'Sync failed' });
    }

    // ── Step 10: Remove — remove one cognitive ─────────────────────────
    printStep(10, 'Remove — remove the commit-standards cognitive');

    const removeResult = await sdk.remove(['commit-standards']);
    printResult('sdk.remove', removeResult);

    if (isOk(removeResult)) {
      const removedNames = removeResult.value.removed.map((r) => r.name).join(', ');
      console.log(`  Removed  : ${removedNames || '(none)'}`);
      console.log(`  Not found: ${removeResult.value.notFound.join(', ') || '(none)'}`);
      summary.push({
        step: 10,
        operation: 'remove',
        success: true,
        detail: `Removed ${removeResult.value.removed.length}, not found ${removeResult.value.notFound.length}`,
      });
    } else {
      summary.push({ step: 10, operation: 'remove', success: false, detail: 'Remove failed' });
    }

    // ── Step 11: List — verify removal ─────────────────────────────────
    printStep(11, 'List — verify removal');

    const listAfter = await sdk.list();
    printResult('sdk.list (after removal)', listAfter);

    if (isOk(listAfter)) {
      const rows = listAfter.value.cognitives.map((cog) => ({
        name: cog.name,
        type: cog.cognitiveType,
      }));
      printTable(rows);
      summary.push({
        step: 11,
        operation: 'list (post-remove)',
        success: true,
        detail: `${listAfter.value.count} cognitive(s) remaining`,
      });
    } else {
      summary.push({ step: 11, operation: 'list (post-remove)', success: false, detail: 'List failed' });
    }

    // ── Step 12: Dispose — cleanup SDK ─────────────────────────────────
    printStep(12, 'Dispose SDK');
    await sdk.dispose();
    summary.push({ step: 12, operation: 'dispose', success: true, detail: 'SDK disposed' });

    // ── Step 13: Print summary of all operations ───────────────────────
    printStep(13, 'Operation summary');

    console.log('\n  Full lifecycle summary:\n');
    const summaryRows = summary.map((entry) => ({
      step: entry.step,
      operation: entry.operation,
      status: entry.success ? 'OK' : 'FAIL',
      detail: entry.detail,
    }));
    printTable(summaryRows);

    const passed = summary.filter((s) => s.success).length;
    const failed = summary.filter((s) => !s.success).length;
    console.log(`\n  Total: ${summary.length} operations — ${passed} passed, ${failed} failed`);

    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
