# Examples

Executable examples demonstrating each operation of `@synapsync/agent-sync-sdk`.

## Running

Each example is self-contained and uses temporary directories (no cleanup needed):

```bash
npx tsx examples/01-init.ts
```

## Examples

| # | File | Operation | Description |
|---|------|-----------|-------------|
| 01 | `01-init.ts` | `init` | Scaffold new cognitive files (skill, rule, prompt, agent) |
| 02 | `02-add-local.ts` | `add` | Discover and install cognitives from a local directory |
| 03 | `03-list.ts` | `list` | List installed cognitives with filters |
| 04 | `04-find.ts` | `find` | Search available cognitives in a source without installing |
| 05 | `05-remove.ts` | `remove` | Remove installed cognitives |
| 06 | `06-check.ts` | `check` | Health check — verify system integrity |
| 07 | `07-update.ts` | `update` | Detect and apply updates from source |
| 08 | `08-sync.ts` | `sync` | Repair and synchronize the installation state |
| 09 | `09-events.ts` | `events` | Subscribe to SDK events for logging and tracking |
| 10 | `10-full-lifecycle.ts` | all | Complete end-to-end workflow |

## Shared Helpers

`_helpers.ts` provides reusable utilities:

- `setupTempProject()` — creates a temp directory with project, source, and SDK instance
- `writeCognitive()` — writes a cognitive file (SKILL.md, RULE.md, etc.) to a source directory
- `teardown()` — cleans up the temp directory
- `printHeader()`, `printStep()`, `printResult()`, `printTable()` — formatted console output
