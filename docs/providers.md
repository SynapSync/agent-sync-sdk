# Provider System

The provider system is responsible for resolving source strings (URLs, shorthand references, local paths) into `RemoteCognitive` objects that can be installed into agent directories. Providers are registered in a `ProviderRegistry` and evaluated in priority order using a first-match-wins strategy.

---

## Architecture

### HostProvider Interface

Every provider must implement the `HostProvider` interface:

```typescript
interface HostProvider {
  readonly id: string;
  readonly displayName: string;
  match(source: string): ProviderMatch;
  fetchCognitive(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive | null>;
  fetchAll(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive[]>;
  toRawUrl(url: string): string;
  getSourceIdentifier(source: string): string;
}
```

| Method | Description |
|--------|-------------|
| `match` | Tests whether this provider can handle the given source string. Returns a `ProviderMatch` indicating whether it matches and an optional canonical `sourceIdentifier`. |
| `fetchCognitive` | Fetches a single cognitive from the source. Returns `null` if not found. |
| `fetchAll` | Fetches all cognitives from the source (e.g., all skills in a repository). |
| `toRawUrl` | Converts a source URL to its raw content URL (e.g., GitHub blob URL to raw URL). |
| `getSourceIdentifier` | Extracts a canonical source identifier from the source string. |

### ProviderMatch

```typescript
interface ProviderMatch {
  matches: boolean;
  sourceIdentifier?: SourceIdentifier;
}
```

When `matches` is `true`, the provider claims the source string. The optional `sourceIdentifier` provides the canonical form (e.g., `"owner/repo"` for a full GitHub URL).

### ProviderFetchOptions

```typescript
interface ProviderFetchOptions {
  cognitiveType?: CognitiveType;
  subpath?: string;
  ref?: string;
  nameFilter?: string;
  timeout?: number;
  signal?: AbortSignal;
}
```

| Option | Description |
|--------|-------------|
| `cognitiveType` | Filter results to a specific cognitive type |
| `subpath` | Look within a subdirectory of the source |
| `ref` | Git ref (branch, tag, commit) to fetch from |
| `nameFilter` | Filter cognitives by name pattern |
| `timeout` | Request timeout in milliseconds |
| `signal` | AbortSignal for cancellation |

### ProviderRegistry

The registry manages provider instances and performs source resolution.

```typescript
interface ProviderRegistry {
  register(provider: HostProvider): void;
  findProvider(url: string): HostProvider | null;
  getAll(): readonly HostProvider[];
}
```

| Method | Description |
|--------|-------------|
| `register` | Adds a provider to the registry. Providers are evaluated in registration order. |
| `findProvider` | Returns the first provider whose `match()` returns `{ matches: true }` for the given URL, or `null` if no provider matches. |
| `getAll` | Returns all registered providers in priority order. |

---

## Built-in Providers

Providers are registered in the following priority order. The first provider whose `match()` succeeds handles the request.

### 1. Custom Providers

**Priority:** Highest (registered first)

User-specified providers passed via `config.providers.custom` are registered before all built-in providers. This allows overriding default behavior for specific source patterns.

```typescript
const sdk = createAgentSyncSDK({
  providers: { custom: [myCustomProvider] },
});
```

### 2. GitHub Provider

| Property | Value |
|----------|-------|
| **ID** | `'github'` |
| **Display Name** | `'GitHub'` |

**Matches:**
- Full GitHub URLs: `https://github.com/owner/repo`
- GitHub blob URLs: `https://github.com/owner/repo/blob/main/path/to/SKILL.md`
- GitHub tree URLs: `https://github.com/owner/repo/tree/main/subpath`
- Shorthand: `owner/repo`
- Shorthand with ref: `owner/repo@branch`

**Behavior:**
- Uses the GitHub API when a token is available for efficient fetching
- Falls back to git clone when no token is available or for complex source structures
- Supports `GITHUB_TOKEN` and `GH_TOKEN` environment variables for authenticating private repository access
- Respects `config.providers.githubToken` for programmatic token configuration
- Clones are shallow (respects `config.git.depth`) with timeout (`config.git.cloneTimeoutMs`)

### 3. Local Provider

| Property | Value |
|----------|-------|
| **ID** | `'local'` |
| **Display Name** | `'Local'` |

**Matches:**
- Absolute paths: `/path/to/cognitives`
- Relative paths: `./my-cognitives`, `../shared-skills`
- Dot references: `.`, `..`
- Windows drive paths: `C:\path\to\cognitives`

**Behavior:**
- Scans the local directory structure for cognitive files (`SKILL.md`, `AGENT.md`, `PROMPT.md`, `RULE.md`)
- Resolves relative paths against the current working directory
- Does not perform any network requests

### 4. Mintlify Provider

| Property | Value |
|----------|-------|
| **ID** | `'mintlify'` |
| **Display Name** | `'Mintlify'` |

**Matches:** URLs containing `mintlify.com`

**Status:** Stub implementation. Currently matches but does not fetch cognitives. Reserved for future integration with Mintlify documentation sites.

### 5. HuggingFace Provider

| Property | Value |
|----------|-------|
| **ID** | `'huggingface'` |
| **Display Name** | `'Hugging Face'` |

**Matches:** URLs containing `huggingface.co`

**Status:** Stub implementation. Currently matches but does not fetch cognitives. Reserved for future integration with Hugging Face model cards and datasets.

### 6. WellKnown Provider

| Property | Value |
|----------|-------|
| **ID** | `'wellknown'` |
| **Display Name** | `'Well-Known Endpoint'` |

**Matches:** HTTPS URLs that are:
- Not known git hosting platforms (github.com, gitlab.com, bitbucket.org, huggingface.co)
- Not direct cognitive file URLs (not ending in `/SKILL.md`, `/AGENT.md`, etc.)

**Behavior:**
- Looks for a well-known endpoint at `<origin>/.well-known/cognitives/index.json`
- Falls back to `<origin>/.well-known/skills/index.json` for backwards compatibility
- The index file lists available cognitives and their download URLs

### 7. DirectURL Provider

| Property | Value |
|----------|-------|
| **ID** | `'direct-url'` |
| **Display Name** | `'Direct URL'` |

**Matches:** HTTPS URLs ending with one of:
- `/SKILL.md`
- `/AGENT.md`
- `/PROMPT.md`
- `/RULE.md`

**Status:** Stub implementation. Reserved for future direct-download support.

---

## Source Resolution Examples

The following table shows how different source strings are resolved to providers:

| Source String | Matched Provider | Source Identifier |
|---------------|-----------------|-------------------|
| `owner/repo` | GitHub | `owner/repo` |
| `owner/repo@v2` | GitHub | `owner/repo` |
| `https://github.com/owner/repo` | GitHub | `owner/repo` |
| `https://github.com/owner/repo/tree/main/skills` | GitHub | `owner/repo` |
| `https://github.com/owner/repo/blob/main/skills/SKILL.md` | GitHub | `owner/repo` |
| `./my-cognitives` | Local | `./my-cognitives` |
| `../shared/skills` | Local | `../shared/skills` |
| `/absolute/path/to/cognitives` | Local | `/absolute/path/to/cognitives` |
| `https://mintlify.com/docs/example` | Mintlify | _(stub)_ |
| `https://huggingface.co/org/model` | HuggingFace | _(stub)_ |
| `https://example.com/my-tools` | WellKnown | `example.com` |
| `https://cdn.example.com/skills/SKILL.md` | DirectURL | _(stub)_ |

---

## Custom Provider Implementation Guide

You can implement a custom `HostProvider` to support proprietary registries, internal artifact stores, or any other cognitive source.

### Complete Example

```typescript
import {
  createAgentSyncSDK,
  sourceIdentifier,
  safeName,
  type HostProvider,
  type ProviderMatch,
  type ProviderFetchOptions,
  type RemoteCognitive,
  type SourceIdentifier,
} from '@synapsync/agent-sync-sdk';

const myRegistryProvider: HostProvider = {
  id: 'my-registry',
  displayName: 'My Internal Registry',

  match(source: string): ProviderMatch {
    // Match sources like "registry:package-name"
    if (source.startsWith('registry:')) {
      return {
        matches: true,
        sourceIdentifier: sourceIdentifier(source),
      };
    }
    return { matches: false };
  },

  async fetchCognitive(
    source: string,
    options?: ProviderFetchOptions,
  ): Promise<RemoteCognitive | null> {
    const packageName = source.replace('registry:', '');
    const response = await fetch(
      `https://internal-registry.example.com/api/cognitives/${packageName}`,
    );

    if (!response.ok) return null;

    const data = await response.json();

    return {
      name: data.name,
      description: data.description,
      content: data.content,
      installName: safeName(packageName),
      sourceUrl: source,
      providerId: this.id,
      sourceIdentifier: sourceIdentifier(source),
      type: options?.cognitiveType ?? data.type ?? 'skill',
      metadata: data.metadata ?? {},
    };
  },

  async fetchAll(
    source: string,
    options?: ProviderFetchOptions,
  ): Promise<RemoteCognitive[]> {
    const packageName = source.replace('registry:', '');
    const response = await fetch(
      `https://internal-registry.example.com/api/packages/${packageName}/cognitives`,
    );

    if (!response.ok) return [];

    const items = await response.json();
    return items.map((item: any) => ({
      name: item.name,
      description: item.description,
      content: item.content,
      installName: safeName(item.slug),
      sourceUrl: source,
      providerId: this.id,
      sourceIdentifier: sourceIdentifier(source),
      type: item.type,
      metadata: item.metadata ?? {},
    }));
  },

  toRawUrl(url: string): string {
    const packageName = url.replace('registry:', '');
    return `https://internal-registry.example.com/raw/${packageName}`;
  },

  getSourceIdentifier(source: string): string {
    return source; // "registry:package-name" is already canonical
  },
};
```

### Registering the Custom Provider

```typescript
const sdk = createAgentSyncSDK({
  providers: {
    custom: [myRegistryProvider],
  },
});

// Now you can use your custom source format:
const result = await sdk.add('registry:my-awesome-skill', {
  agents: ['cursor'],
  confirmed: true,
});
```

Custom providers are registered with the highest priority, so they are evaluated before all built-in providers. If multiple custom providers are provided, they are evaluated in array order.

### Tips for Custom Providers

- Always return `{ matches: false }` promptly for sources your provider does not handle.
- Use a unique, descriptive `id` to avoid conflicts with built-in provider IDs.
- Respect `options.signal` for cancellation support in long-running fetch operations.
- Respect `options.timeout` by setting appropriate deadlines on network requests.
- Return `null` from `fetchCognitive` rather than throwing when a cognitive is not found.
- Use the `safeName()` constructor to ensure `installName` values are filesystem-safe.

---

## See Also

- [Type System](./type-system.md) — Branded types, `RemoteCognitive`, and `ProviderFetchOptions`
- [API Reference](./api-reference.md) — SDK methods that use the provider system
