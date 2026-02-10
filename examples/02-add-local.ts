#!/usr/bin/env npx tsx
// examples/02-add-local.ts — Demonstrates adding cognitives from a local directory

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
  printHeader('02 — Add (Local Source): Install Cognitives from Disk');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create source cognitives on disk ───────────────────────
    printStep(2, 'Write source cognitive files');

    const skillPath1 = await writeCognitive(
      sourceDir,
      'skill',
      'react-patterns',
      'React best practices',
      '# React Patterns\n\nUse functional components with hooks.\nPrefer composition over inheritance.',
    );
    console.log(`  Created: ${skillPath1}`);

    const skillPath2 = await writeCognitive(
      sourceDir,
      'skill',
      'typescript-tips',
      'TypeScript productivity tips',
      '# TypeScript Tips\n\nPrefer interfaces over types for object shapes.\nUse strict mode and exhaustive checks.',
    );
    console.log(`  Created: ${skillPath2}`);

    const rulePath = await writeCognitive(
      sourceDir,
      'rule',
      'code-review',
      'Code review guidelines',
      '# Code Review\n\nAlways review for security vulnerabilities.\nCheck error handling and edge cases.',
    );
    console.log(`  Created: ${rulePath}`);

    // ── Step 3: Discovery mode (no confirmed flag) ─────────────────────
    printStep(3, 'Discover available cognitives (dry run)');
    const discoveryResult = await sdk.add(sourceDir);
    printResult('sdk.add (discovery)', discoveryResult);

    // ── Step 4: Print discovered cognitives ────────────────────────────
    printStep(4, 'Show discovered cognitives');
    if (isOk(discoveryResult) && discoveryResult.value.available) {
      const rows = discoveryResult.value.available.map((cog) => ({
        name: cog.name,
        type: cog.cognitiveType,
        description: cog.description,
      }));
      printTable(rows);
      console.log(`\n  Found ${rows.length} cognitive(s) ready to install.`);
    } else {
      console.log('  No available cognitives returned.');
    }

    // ── Step 5: Install with confirmed flag ────────────────────────────
    printStep(5, 'Install cognitives (confirmed)');
    const installResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.add (install)', installResult);

    // ── Step 6: Print installed cognitives with agent paths ────────────
    printStep(6, 'Show installed cognitives and agent paths');
    if (isOk(installResult)) {
      for (const installed of installResult.value.installed) {
        console.log(`  Cognitive: ${installed.name} (${installed.cognitiveType})`);
        for (const agentInfo of installed.agents) {
          console.log(`    Agent : ${agentInfo.agent}`);
          console.log(`    Path  : ${agentInfo.path}`);
          console.log(`    Mode  : ${agentInfo.mode}`);
        }
      }

      if (installResult.value.failed.length > 0) {
        console.log('\n  Failed installations:');
        for (const fail of installResult.value.failed) {
          console.log(`    - ${JSON.stringify(fail)}`);
        }
      }

      console.log(`\n  Source: ${installResult.value.source}`);
      console.log(`  Message: ${installResult.value.message}`);
    }

    // ── Step 7: Cleanup ────────────────────────────────────────────────
    printStep(7, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
