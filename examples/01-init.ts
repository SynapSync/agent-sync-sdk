#!/usr/bin/env npx tsx
// examples/01-init.ts — Demonstrates scaffolding new cognitive files with sdk.init()

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  setupTempProject,
  teardown,
  printHeader,
  printStep,
  printResult,
  isOk,
} from './_helpers.js';

async function main() {
  printHeader('01 — Init: Scaffold Cognitive Files');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create a skill ─────────────────────────────────────────
    printStep(2, 'Initialize a new skill cognitive');
    const skillResult = await sdk.init('my-first-skill', 'skill', {
      description: 'A custom skill for code reviews',
    });
    printResult('sdk.init (skill)', skillResult);

    // ── Step 3: Verify success ─────────────────────────────────────────
    printStep(3, 'Verify the result');
    if (isOk(skillResult)) {
      console.log(`  success : ${skillResult.value.success}`);
      console.log(`  path    : ${skillResult.value.path}`);
      console.log(`  type    : ${skillResult.value.cognitiveType}`);
      console.log(`  files   : ${skillResult.value.files.join(', ')}`);
    } else {
      console.log('  Init failed — see error above.');
    }

    // ── Step 4: Show created path and files ────────────────────────────
    printStep(4, 'Show the created path and files');
    if (isOk(skillResult)) {
      console.log(`  Created at: ${skillResult.value.path}`);
      for (const file of skillResult.value.files) {
        console.log(`    - ${file}`);
      }
    }

    // ── Step 5: Read and display the generated SKILL.md ────────────────
    printStep(5, 'Read the generated SKILL.md content');
    if (isOk(skillResult)) {
      const skillMdPath = join(skillResult.value.path, 'SKILL.md');
      try {
        const content = await readFile(skillMdPath, 'utf-8');
        console.log('  --- SKILL.md content ---');
        console.log(content);
        console.log('  --- end ---');
      } catch {
        console.log(`  Could not read ${skillMdPath}`);
      }
    }

    // ── Step 6: Create a rule ──────────────────────────────────────────
    printStep(6, 'Initialize a rule cognitive');
    const ruleResult = await sdk.init('my-rule', 'rule', {
      description: 'A project coding rule',
    });
    printResult('sdk.init (rule)', ruleResult);

    // ── Step 7: Show that all 4 types can be created ───────────────────
    printStep(7, 'Create all four cognitive types');
    const types = ['skill', 'agent', 'prompt', 'rule'] as const;
    for (const cogType of types) {
      const name = `demo-${cogType}`;
      const result = await sdk.init(name, cogType, {
        description: `Example ${cogType} cognitive`,
      });
      const status = isOk(result) ? 'OK' : 'ERR';
      console.log(`  [${status}] ${cogType} -> ${name}`);
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
