#!/usr/bin/env npx tsx
// examples/03-list.ts — Demonstrates listing installed cognitives with filters

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
  printHeader('03 — List: Query Installed Cognitives');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create and install cognitives (2 skills + 1 rule) ──────
    printStep(2, 'Create and install 3 cognitives (2 skills + 1 rule)');

    await writeCognitive(
      sourceDir,
      'skill',
      'testing-patterns',
      'Unit testing best practices',
      '# Testing Patterns\n\nWrite tests before code.\nKeep tests focused and isolated.',
    );
    console.log('  Written: skill / testing-patterns');

    await writeCognitive(
      sourceDir,
      'skill',
      'error-handling',
      'Error handling strategies',
      '# Error Handling\n\nUse Result types for expected failures.\nThrow only for unexpected errors.',
    );
    console.log('  Written: skill / error-handling');

    await writeCognitive(
      sourceDir,
      'rule',
      'naming-conventions',
      'Project naming conventions',
      '# Naming Conventions\n\nUse camelCase for variables.\nUse PascalCase for types and classes.',
    );
    console.log('  Written: rule / naming-conventions');

    const addResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });

    if (isOk(addResult)) {
      console.log(`\n  Installed ${addResult.value.installed.length} cognitive(s).`);
    } else {
      console.log('  Failed to install cognitives — see error.');
      printResult('sdk.add', addResult);
    }

    // ── Step 3: List all cognitives ────────────────────────────────────
    printStep(3, 'List ALL installed cognitives');
    const allResult = await sdk.list();
    printResult('sdk.list (all)', allResult);

    if (isOk(allResult)) {
      console.log(`\n  Total count: ${allResult.value.count}`);
      const rows = allResult.value.cognitives.map((cog) => ({
        name: cog.name,
        type: cog.cognitiveType,
        source: cog.source,
        installedAt: cog.installedAt,
      }));
      printTable(rows);
    }

    // ── Step 4: Filter by skills only ──────────────────────────────────
    printStep(4, 'List only SKILL cognitives');
    const skillsResult = await sdk.list({ cognitiveType: 'skill' });
    printResult('sdk.list (skills)', skillsResult);

    if (isOk(skillsResult)) {
      console.log(`\n  Skill count: ${skillsResult.value.count}`);
      const rows = skillsResult.value.cognitives.map((cog) => ({
        name: cog.name,
        type: cog.cognitiveType,
      }));
      printTable(rows);
    }

    // ── Step 5: Filter by rules only ───────────────────────────────────
    printStep(5, 'List only RULE cognitives');
    const rulesResult = await sdk.list({ cognitiveType: 'rule' });
    printResult('sdk.list (rules)', rulesResult);

    if (isOk(rulesResult)) {
      console.log(`\n  Rule count: ${rulesResult.value.count}`);
      const rows = rulesResult.value.cognitives.map((cog) => ({
        name: cog.name,
        type: cog.cognitiveType,
      }));
      printTable(rows);
    }

    // ── Step 6: Summary of filtered counts ─────────────────────────────
    printStep(6, 'Summary of filtered counts');
    const allCount = isOk(allResult) ? allResult.value.count : 0;
    const skillCount = isOk(skillsResult) ? skillsResult.value.count : 0;
    const ruleCount = isOk(rulesResult) ? rulesResult.value.count : 0;

    console.log(`  All cognitives : ${allCount}`);
    console.log(`  Skills         : ${skillCount}`);
    console.log(`  Rules          : ${ruleCount}`);
    console.log(`  Accounted for  : ${skillCount + ruleCount} / ${allCount}`);

    // ── Step 7: Cleanup ────────────────────────────────────────────────
    printStep(7, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
