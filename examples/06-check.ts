#!/usr/bin/env npx tsx
// examples/06-check.ts — Demonstrates health-checking the cognitive installation

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
  printHeader('06 — Check: Health-Check Cognitive Installation');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Check on empty project ───────────────────────────────
    printStep(2, 'Health check on empty project (no cognitives installed)');
    const emptyCheck = await sdk.check();
    printResult('sdk.check() — empty project', emptyCheck);

    if (isOk(emptyCheck)) {
      console.log(`  Success : ${emptyCheck.value.success}`);
      console.log(`  Healthy : ${emptyCheck.value.healthy.length} cognitive(s)`);
      console.log(`  Issues  : ${emptyCheck.value.issues.length} issue(s)`);
      console.log(`  Message : ${emptyCheck.value.message}`);
    }

    // ── Step 3: Create and install cognitives ────────────────────────
    printStep(3, 'Create and install cognitives');

    await writeCognitive(
      sourceDir,
      'skill',
      'api-design',
      'API design best practices',
      '# API Design\n\nUse RESTful conventions...',
    );
    await writeCognitive(
      sourceDir,
      'rule',
      'error-handling',
      'Error handling rules',
      '# Error Handling\n\nAlways use try/catch...',
    );
    await writeCognitive(
      sourceDir,
      'prompt',
      'debug-prompt',
      'Debugging assistant prompt',
      '# Debug Prompt\n\nAnalyze the stack trace...',
    );
    console.log('  Created: api-design, error-handling, debug-prompt');

    const addResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.add (install all)', addResult);

    if (isOk(addResult)) {
      console.log(`  Installed: ${addResult.value.installed.map((c) => c.name).join(', ')}`);
    }

    // ── Step 4: Check after installation ─────────────────────────────
    printStep(4, 'Health check after installation');
    const postInstallCheck = await sdk.check();
    printResult('sdk.check() — after install', postInstallCheck);

    if (isOk(postInstallCheck)) {
      console.log(`  Success : ${postInstallCheck.value.success}`);
      console.log(`  Healthy : ${postInstallCheck.value.healthy.length} cognitive(s)`);
      console.log(`  Issues  : ${postInstallCheck.value.issues.length} issue(s)`);
      console.log(`  Message : ${postInstallCheck.value.message}`);
    }

    // ── Step 5: Print the health report ──────────────────────────────
    printStep(5, 'Detailed health report');

    if (isOk(postInstallCheck)) {
      console.log('  Healthy cognitives:');
      for (const name of postInstallCheck.value.healthy) {
        console.log(`    [OK] ${name}`);
      }

      if (postInstallCheck.value.issues.length > 0) {
        console.log('\n  Issues detected:');
        const issueRows = postInstallCheck.value.issues.map((issue) => ({
          name: issue.name,
          type: issue.type,
          severity: issue.severity,
          description: issue.description,
        }));
        printTable(issueRows);
      } else {
        console.log('\n  No issues detected — all cognitives are healthy.');
      }
    }

    // ── Step 6: Cleanup ──────────────────────────────────────────────
    printStep(6, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
