#!/usr/bin/env npx tsx
// examples/04-find.ts — Demonstrates searching for available cognitives in a source

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
  printHeader('04 — Find: Discover Available Cognitives');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create source cognitives ─────────────────────────────
    printStep(2, 'Create source cognitives to discover');

    await writeCognitive(
      sourceDir,
      'skill',
      'react-patterns',
      'React best practices',
      '# React Patterns\n\nUse hooks...',
    );
    console.log('  Created: skill/react-patterns');

    await writeCognitive(
      sourceDir,
      'prompt',
      'code-review-prompt',
      'Code review checklist',
      '# Review Prompt\n\nCheck for...',
    );
    console.log('  Created: prompt/code-review-prompt');

    await writeCognitive(
      sourceDir,
      'rule',
      'naming-conventions',
      'Naming rules',
      '# Naming\n\nUse camelCase...',
    );
    console.log('  Created: rule/naming-conventions');

    await writeCognitive(
      sourceDir,
      'skill',
      'testing-guide',
      'Testing patterns',
      '# Testing\n\nWrite unit tests...',
    );
    console.log('  Created: skill/testing-guide');

    // ── Step 3: Find all available cognitives ────────────────────────
    printStep(3, 'Find all available cognitives in source');
    const findAllResult = await sdk.find(sourceDir);
    printResult('sdk.find(sourceDir)', findAllResult);

    // ── Step 4: Print discovered cognitives as a table ───────────────
    printStep(4, 'Discovered cognitives table');
    if (isOk(findAllResult)) {
      console.log(`  Total found: ${findAllResult.value.total}`);
      console.log(`  Source: ${findAllResult.value.source}`);
      const rows = findAllResult.value.results.map((c) => ({
        name: c.name,
        type: c.cognitiveType,
        description: c.description,
        installed: c.installed,
      }));
      printTable(rows);
    }

    // ── Step 5: Find only skills ─────────────────────────────────────
    printStep(5, 'Find only skill-type cognitives');
    const findSkillsResult = await sdk.find(sourceDir, { cognitiveType: 'skill' });
    printResult('sdk.find(sourceDir, { cognitiveType: "skill" })', findSkillsResult);

    // ── Step 6: Print filtered results ───────────────────────────────
    printStep(6, 'Filtered results (skills only)');
    if (isOk(findSkillsResult)) {
      console.log(`  Total skills found: ${findSkillsResult.value.total}`);
      const rows = findSkillsResult.value.results.map((c) => ({
        name: c.name,
        type: c.cognitiveType,
        description: c.description,
        installed: c.installed,
      }));
      printTable(rows);
    }

    // ── Step 7: Install one cognitive, then find again ───────────────
    printStep(7, 'Install one cognitive, then find again to show installed status');
    const addResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });
    if (isOk(addResult)) {
      console.log(`  Installed ${addResult.value.installed.length} cognitive(s)`);
    }

    const findAfterInstall = await sdk.find(sourceDir);
    printResult('sdk.find(sourceDir) — after install', findAfterInstall);

    if (isOk(findAfterInstall)) {
      const rows = findAfterInstall.value.results.map((c) => ({
        name: c.name,
        type: c.cognitiveType,
        installed: c.installed,
      }));
      printTable(rows);
    }

    // ── Step 8: Cleanup ──────────────────────────────────────────────
    printStep(8, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
