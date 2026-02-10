#!/usr/bin/env npx tsx
// examples/09-events.ts — Demonstrates subscribing to SDK events for tracking and logging

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

interface EventLogEntry {
  event: string;
  detail: string;
  timestamp: number;
}

async function main() {
  printHeader('09 — Events: Subscribe to SDK Events');
  const { tempDir, projectDir, sourceDir, sdk } = await setupTempProject();

  try {
    // ── Step 1: Setup ──────────────────────────────────────────────────
    printStep(1, 'Temp project created');
    console.log(`  Project dir : ${projectDir}`);
    console.log(`  Source dir  : ${sourceDir}`);

    // ── Step 2: Create event log and subscribe ─────────────────────────
    printStep(2, 'Subscribe to SDK events');

    const eventLog: EventLogEntry[] = [];

    const unsubStart = sdk.on('operation:start', (payload) => {
      eventLog.push({
        event: 'operation:start',
        detail: `Operation "${payload.operation}" started`,
        timestamp: Date.now(),
      });
    });

    const unsubComplete = sdk.on('operation:complete', (payload) => {
      eventLog.push({
        event: 'operation:complete',
        detail: `Operation "${payload.operation}" completed in ${payload.durationMs}ms`,
        timestamp: Date.now(),
      });
    });

    const unsubDiscovery = sdk.on('discovery:found', (payload) => {
      eventLog.push({
        event: 'discovery:found',
        detail: `Discovered "${payload.cognitive.name}" (${payload.type})`,
        timestamp: Date.now(),
      });
    });

    const unsubInstallStart = sdk.on('install:start', (payload) => {
      eventLog.push({
        event: 'install:start',
        detail: `Installing "${payload.cognitive}" for ${payload.agent} (${payload.mode})`,
        timestamp: Date.now(),
      });
    });

    const unsubInstallComplete = sdk.on('install:complete', (payload) => {
      eventLog.push({
        event: 'install:complete',
        detail: `Installed "${payload.cognitive}" for ${payload.agent}`,
        timestamp: Date.now(),
      });
    });

    console.log('  Subscribed to: operation:start, operation:complete, discovery:found, install:start, install:complete');

    // ── Step 3: Create source cognitives ────────────────────────────────
    printStep(3, 'Create source cognitives');

    await writeCognitive(
      sourceDir,
      'skill',
      'testing-strategies',
      'Effective testing strategies',
      '# Testing Strategies\n\nWrite unit tests first.\nUse integration tests for boundaries.',
    );
    console.log('  Created: testing-strategies (skill)');

    await writeCognitive(
      sourceDir,
      'rule',
      'naming-conventions',
      'Consistent naming conventions',
      '# Naming Conventions\n\nUse camelCase for variables.\nUse PascalCase for classes and types.',
    );
    console.log('  Created: naming-conventions (rule)');

    // ── Step 4: Run sdk.add() to generate events ───────────────────────
    printStep(4, 'Install cognitives (generates events)');

    const addResult = await sdk.add(sourceDir, {
      agents: ['claude-code'],
      confirmed: true,
    });
    printResult('sdk.add (install)', addResult);

    // ── Step 5: Print captured event log ───────────────────────────────
    printStep(5, 'Print captured event log');

    console.log(`  Captured ${eventLog.length} event(s):\n`);
    const rows = eventLog.map((entry, index) => ({
      '#': index + 1,
      event: entry.event,
      detail: entry.detail,
    }));
    printTable(rows);

    // ── Step 6: Demonstrate sdk.once() for one-shot handler ────────────
    printStep(6, 'Demonstrate sdk.once() — one-shot event handler');

    let onceCount = 0;
    sdk.once('operation:start', (payload) => {
      onceCount++;
      console.log(`  [once] Fired for operation: ${payload.operation}`);
    });

    console.log('  Registered once() handler for operation:start');

    // Run two operations — only the first should trigger the once handler
    const listResult1 = await sdk.list();
    if (isOk(listResult1)) {
      console.log(`  First list: ${listResult1.value.count} cognitive(s)`);
    }

    const listResult2 = await sdk.list();
    if (isOk(listResult2)) {
      console.log(`  Second list: ${listResult2.value.count} cognitive(s)`);
    }

    console.log(`  once() handler fired ${onceCount} time(s) (expected: 1)`);

    // ── Step 7: Demonstrate unsubscribe ────────────────────────────────
    printStep(7, 'Demonstrate unsubscribe');

    const beforeCount = eventLog.length;
    console.log(`  Event log size before unsubscribe: ${beforeCount}`);

    // Unsubscribe all event handlers
    unsubStart();
    unsubComplete();
    unsubDiscovery();
    unsubInstallStart();
    unsubInstallComplete();
    console.log('  Unsubscribed from all events.');

    // Run an operation — no new events should be captured
    await sdk.list();
    const afterCount = eventLog.length;
    console.log(`  Event log size after operation: ${afterCount}`);
    console.log(`  New events captured: ${afterCount - beforeCount} (expected: 0)`);

    // ── Step 8: Cleanup ────────────────────────────────────────────────
    printStep(8, 'Dispose SDK and clean up');
    await sdk.dispose();
    console.log('\nExample completed successfully!');
  } finally {
    await teardown(tempDir);
  }
}

main().catch(console.error);
