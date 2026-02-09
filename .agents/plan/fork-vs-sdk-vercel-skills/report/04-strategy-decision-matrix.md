# Strategy Decision Matrix: Fork vs SDK vs Hybrid

> **Date**: 2026-02-09
> **Author**: Agent D -- Strategy Architect
> **Input**: Reports 01 (Upstream), 02 (Cognit Fork), 03 (Synapse-CLI)

---

## 1. Context

The user is building a CLI tool for managing AI agent instructions ("cognitives") across 39+ coding agents. Three codebases exist:

1. **vercel-labs/skills** (upstream) -- a <1-month-old, fast-moving CLI with 5K+ stars, 38 agents, and no programmatic API. CLI-only, single-bundle, no exports.
2. **cognit** (fork) -- an evolved fork adding cognitive types (skill/agent/prompt), YAML-based agent configs, modular architecture, and ~9,200 LOC. Still deeply coupled to Vercel infrastructure (telemetry, search).
3. **synapse-cli** (original) -- the user's independent project with 515 tests, 80% coverage, 5 runtime deps, REPL, 4-phase sync engine, doctor diagnostics. Never published; development pivoted to the fork.

The decision: how to move forward architecturally.

---

## 2. Strategy Options

### Strategy A: Permanent Fork with Upstream Sync

Maintain `cognit` as a long-lived fork. Periodically merge upstream changes from `vercel-labs/skills` (agent additions, bug fixes, new providers) into the fork.

**How it works:**
- Keep the current cognit codebase as-is
- Set up `vercel-labs/skills` as a git remote
- Periodically `git merge` or `git cherry-pick` upstream commits
- Resolve conflicts manually, especially in diverged areas (cognitive types, YAML agents, modular structure)
- Continue building features directly in the fork

### Strategy B: Upstream as Dependency (SDK/Wrapper)

Discard the fork. Start a clean project that consumes `vercel-labs/skills` as an npm dependency (or vendored source) and builds a differentiated layer on top.

**How it works:**
- `npm install skills` (or vendor specific source files)
- Build `cognit-cli` as a separate package that imports/wraps upstream modules
- Own layer handles: cognitive types, custom commands, YAML agent configs, UI/DX
- Upstream provides: agent registry, skill discovery, source parsing, providers

**Critical blocker:** The upstream package exposes **no programmatic API** -- only a CLI binary. No `main`, `exports`, or `types` fields in `package.json`. All deps bundled into a single `dist/cli.mjs`. This means SDK consumption is not possible without either (a) wrapping the CLI via child_process (fragile), (b) vendoring source files (maintenance burden), or (c) contributing an upstream refactor to split CLI/core (requires buy-in, high effort).

### Strategy C: Hybrid Architecture (Own Core + Selective Upstream Consumption)

Build a new project from scratch using the best components from all three codebases. Selectively vendor or adapt specific upstream modules where valuable, but own the core architecture entirely.

**How it works:**
- New clean project: `cognit-cli`
- **Own core**: CLI framework, command routing, cognitive type system, YAML agent configs, config management, sync engine, DX features
- **Adapted from upstream**: Agent registry data (39 agent definitions), source parser patterns, provider patterns
- **Ported from synapse-cli**: Logger, doctor diagnostics, AGENTS.md generator, test patterns, symlink management
- **No git-level fork relationship** -- no merge conflicts, no upstream tracking burden
- Monitor upstream for new agent additions and port as needed (data, not code)

---

## 3. Decision Matrix

| Criterion | Weight | A: Permanent Fork | B: SDK/Wrapper | C: Hybrid (Own Core) |
|-----------|--------|-------------------|----------------|----------------------|
| **Time-to-MVP** | High | **Fast** -- working code exists, ~9,200 LOC already functional | **Slow** -- no API to consume; must build shim layer or vendor source from scratch | **Medium** -- reuse patterns from synapse-cli (515 tests, 80% coverage) and cognit (YAML agents, cognitive types); new project but proven patterns |
| **Maintainability (12-24 mo)** | Critical | **Poor** -- upstream ships daily; merges increasingly painful as codebases diverge; 1,900-line `add.ts` merge conflicts guaranteed | **Poor** -- upstream may never expose an API; CLI wrapping breaks on any output format change; vendored files drift | **Excellent** -- own codebase, own pace; no merge debt; upstream monitored for data (new agents) not code |
| **Breaking change risk** | High | **Very High** -- lockfile format already broke (v2->v3); daily releases; no semver discipline; merging is manual triage | **High** -- CLI output format unstable; vendored source diverges; upstream API could materialize in incompatible form | **Low** -- no code coupling to upstream; only data dependency (agent definitions) which is additive |
| **Packaging complexity** | Medium | **Low** -- single package, already works | **High** -- must manage upstream dep version pinning, shim layer, potential bundling conflicts | **Low** -- single clean package, own build pipeline |
| **Developer experience (DX)** | Medium | **Mixed** -- fork stigma; contributors confused about upstream vs fork; hard to explain "why not just use skills?" | **Good** -- clean separation but complex setup for contributors | **Best** -- clean project, clear identity, easy onboarding, no fork baggage |
| **Independence** | High | **Low** -- structurally dependent on upstream; every upstream change is a potential merge conflict | **Medium** -- runtime dependency but own features are independent | **High** -- fully independent; upstream is a reference, not a dependency |
| **Feature velocity** | High | **Medium** -- constrained by need to keep mergeability; can't radically restructure without losing upstream compat | **Low** -- limited by upstream API surface (which doesn't exist) | **High** -- complete freedom to innovate; no upstream constraints |
| **Ecosystem compatibility** | Medium | **Good** -- fork can stay close to upstream SKILL.md format and agent paths | **Good** -- wrapping upstream ensures format compat | **Good** -- use same SKILL.md format and `.agents/` conventions voluntarily |
| **Bus factor / sustainability** | Critical | **Risky** -- depends on solo dev resolving merge conflicts with a codebase that has 30 commits/week from 20+ contributors | **Risky** -- depends on upstream not breaking their CLI interface | **Best** -- solo dev owns everything; complexity is self-determined |

### Scoring (1-5, 5=best)

| Criterion | Weight | A: Fork | B: SDK | C: Hybrid |
|-----------|--------|---------|--------|-----------|
| Time-to-MVP | 3x | 5 (15) | 2 (6) | 3 (9) |
| Maintainability | 4x | 2 (8) | 2 (8) | 5 (20) |
| Breaking change risk | 3x | 1 (3) | 2 (6) | 5 (15) |
| Packaging | 2x | 4 (8) | 2 (4) | 4 (8) |
| DX | 2x | 3 (6) | 3 (6) | 5 (10) |
| Independence | 3x | 2 (6) | 3 (9) | 5 (15) |
| Feature velocity | 3x | 3 (9) | 2 (6) | 5 (15) |
| Ecosystem compat | 2x | 4 (8) | 4 (8) | 4 (8) |
| Sustainability | 4x | 2 (8) | 2 (8) | 5 (20) |
| **TOTAL** | **26x** | **71** | **61** | **120** |

---

## 4. Detailed Pros/Cons

### Strategy A: Permanent Fork

**Pros:**
- Fastest path to something working (code already exists)
- Inherits 39 agent definitions, 4 providers, lock file system
- Can cherry-pick upstream bug fixes
- YAML agent config and cognitive types are already built

**Cons:**
- Upstream ships ~30 commits/week -- merge debt is unsustainable for a solo developer
- The monolithic `add.ts` (1,900 lines upstream, 1,244 lines in fork) is a merge conflict magnet
- Still coupled to Vercel infrastructure (telemetry to `add-skill.vercel.sh`, search via `skills.sh`)
- Lock file format already broke once (v2->v3) -- will break again
- Fork identity problem: "why not just use skills?" is hard to answer when 80% of code is upstream
- ~20 `@deprecated` backward-compat aliases add noise and maintenance cost
- Provider/source code duplication within the fork is unresolved tech debt
- Update command uses `npx` child process spawning -- fragile and inherited from upstream

### Strategy B: Upstream as Dependency

**Pros:**
- Clean separation between upstream functionality and custom layer
- Bug fixes from upstream come "for free" via version bumps
- Lighter maintenance if API were stable

**Cons:**
- **Dealbreaker: No API exists.** The package only exports a CLI binary. There are no exported functions, types, or modules (Report 01, Section 4).
- CLI wrapping via `child_process` is fragile, slow (npx overhead), and limited to parsing stdout
- Vendoring source files creates the same maintenance burden as a fork but without git merge tooling
- Contributing an upstream refactor (split CLI/core) requires Vercel buy-in and may never happen
- The upstream is <1 month old with no semver discipline -- version pinning is unreliable
- Still depends on Vercel infrastructure for telemetry and search

### Strategy C: Hybrid Architecture (Own Core + Selective Adaptation)

**Pros:**
- Complete architectural freedom -- no upstream code constraints
- Cherry-pick the *best ideas* from all three codebases without inheriting tech debt
- YAML agent configs (from cognit) are the standout innovation -- keep and improve
- Cognitive type system (skill/agent/prompt) can be designed properly from day one
- Synapse-CLI's 515 tests and patterns provide a tested foundation
- Synapse-CLI's proven components (logger, doctor, AGENTS.md generator) are directly portable
- No merge conflicts, no fork stigma, no upstream dependency
- Can adopt the SKILL.md format standard voluntarily without code coupling
- Full control over telemetry, search, registry, and all infrastructure
- Solo developer sustainability: complexity is self-determined

**Cons:**
- Slower initial development than fork (no working code to start from)
- Must manually track new agent additions upstream (data porting, not code merging)
- Loses the benefit of community bug fixes that go to upstream
- Must rebuild provider system (mintlify, huggingface, well-known) if those are needed

---

## 5. Recommendation

**Strategy C: Hybrid Architecture** is the clear winner.

### Rationale

1. **The SDK strategy (B) is not viable.** The upstream package has no programmatic API. This is not a theoretical limitation -- it is a hard architectural constraint (Report 01, Section 4: "There is NO programmatic API"). Without upstream buy-in to split CLI/core, this strategy requires either fragile CLI wrapping or source vendoring, both of which are worse than a fork.

2. **The fork strategy (A) is unsustainable for a solo developer.** The upstream ships 30 commits/week from 20+ contributors. Merge conflicts in the 1,900-line `add.ts` alone would consume significant maintenance time. The fork has already accumulated tech debt: ~20 deprecated aliases, provider/source duplication, Vercel infrastructure coupling, and a `npx` child process update mechanism.

3. **The hybrid strategy (C) offers the best sustainability profile.** A solo developer maintaining this project needs:
   - Full control over complexity (no upstream-imposed merge conflicts)
   - The ability to ship features without worrying about merge compatibility
   - A clean codebase with clear identity
   - Reuse of proven patterns without inheriting debt

4. **The user has already built two codebases.** Synapse-CLI has 515 tests and 80% coverage. Cognit has the YAML agent config system and cognitive types. The hybrid approach lets them combine the best of both without starting from zero.

5. **The only real value from upstream is data, not code.** The 39 agent definitions, SKILL.md format convention, and provider URL patterns are data that can be ported. The code (CLI routing, prompts, bundle pipeline) adds no unique value over what the user has already built.

### Migration Path

1. Start a new `cognit-cli` project with clean architecture
2. Port YAML agent configs and compile pipeline from cognit (the standout innovation)
3. Port logger, doctor, AGENTS.md generator, test patterns from synapse-cli
4. Design proper cognitive type system (3 types: skill/agent/prompt) from day one
5. Build own provider adapters (reference upstream patterns, don't copy code)
6. Adopt SKILL.md format standard voluntarily -- interop without coupling
7. Monitor upstream for new agent additions -- port as YAML data files, not code merges

---

*Strategy decision by Agent D -- Strategy Architect*
*Cross-references: Reports 01 (upstream), 02 (cognit fork), 03 (synapse-cli)*
