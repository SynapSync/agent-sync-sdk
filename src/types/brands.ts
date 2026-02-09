// ---------- Branding utility ----------

declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ---------- Domain brands ----------

/** A validated agent name (e.g., "claude-code", "cursor") */
export type AgentName = Brand<string, 'AgentName'>;

/** A validated cognitive name (e.g., "react-best-practices") */
export type CognitiveName = Brand<string, 'CognitiveName'>;

/** A sanitized filesystem-safe name */
export type SafeName = Brand<string, 'SafeName'>;

/** A validated source identifier (e.g., "owner/repo", "mintlify/bun.com") */
export type SourceIdentifier = Brand<string, 'SourceIdentifier'>;

// ---------- Brand constructors ----------

const AGENT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export function agentName(raw: string): AgentName {
  if (!AGENT_NAME_RE.test(raw)) {
    throw new Error(`Invalid agent name: "${raw}"`);
  }
  return raw as AgentName;
}

export function cognitiveName(raw: string): CognitiveName {
  if (!raw || raw.includes('/') || raw.includes('\\')) {
    throw new Error(`Invalid cognitive name: "${raw}"`);
  }
  return raw as CognitiveName;
}

export function safeName(raw: string): SafeName {
  if (!raw || /[/\\:]/.test(raw) || raw === '.' || raw === '..' || raw.includes('\0')) {
    throw new Error(`Unsafe name: "${raw}"`);
  }
  return raw as SafeName;
}

export function sourceIdentifier(raw: string): SourceIdentifier {
  if (!raw) throw new Error('Empty source identifier');
  return raw as SourceIdentifier;
}

// ---------- Type guards ----------

export function isAgentName(value: string): value is AgentName {
  return AGENT_NAME_RE.test(value);
}

export function isCognitiveName(value: string): value is CognitiveName {
  return value.length > 0 && !value.includes('/') && !value.includes('\\');
}
