// AUTO-GENERATED -- DO NOT EDIT

export interface GeneratedAgentDirConfig {
  readonly local: string;
  readonly global: string | undefined;
}

export interface GeneratedDetectRule {
  readonly homeDir?: string;
  readonly xdgConfig?: string;
  readonly cwdDir?: string;
  readonly absolutePath?: string;
  readonly envVar?: string;
  readonly envResolved?: string;
}

export interface GeneratedAgentConfig {
  readonly name: string;
  readonly displayName: string;
  readonly localRoot: string;
  readonly globalRoot: string | undefined;
  readonly detect: readonly GeneratedDetectRule[];
  readonly dirs: Readonly<Record<string, GeneratedAgentDirConfig>>;
}

export const AGENT_CONFIGS: Record<string, GeneratedAgentConfig> = {
  'adal': {
    name: 'adal',
    displayName: 'Adal',
    localRoot: '.agents',
    globalRoot: '~/.adal',
    detect: [
      { homeDir: '.adal' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.adal/skills' },
      agent: { local: '.agents/agents', global: '~/.adal/agents' },
      prompt: { local: '.agents/prompts', global: '~/.adal/prompts' },
      rule: { local: '.agents/rules', global: '~/.adal/rules' },
    },
  },
  'aider': {
    name: 'aider',
    displayName: 'Aider',
    localRoot: '.aider',
    globalRoot: '~/.aider',
    detect: [
      { cwdDir: '.aider' },
    ],
    dirs: {
      skill: { local: '.aider/skills', global: '~/.aider/skills' },
      agent: { local: '.aider/agents', global: '~/.aider/agents' },
      prompt: { local: '.aider/prompts', global: '~/.aider/prompts' },
      rule: { local: '.aider/rules', global: '~/.aider/rules' },
    },
  },
  'amp': {
    name: 'amp',
    displayName: 'Amp',
    localRoot: '.agents',
    globalRoot: '~/.amp',
    detect: [
      { homeDir: '.amp' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.amp/skills' },
      agent: { local: '.agents/agents', global: '~/.amp/agents' },
      prompt: { local: '.agents/prompts', global: '~/.amp/prompts' },
      rule: { local: '.agents/rules', global: '~/.amp/rules' },
    },
  },
  'augment': {
    name: 'augment',
    displayName: 'Augment',
    localRoot: '.agents',
    globalRoot: '~/.augment',
    detect: [
      { homeDir: '.augment' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.augment/skills' },
      agent: { local: '.agents/agents', global: '~/.augment/agents' },
      prompt: { local: '.agents/prompts', global: '~/.augment/prompts' },
      rule: { local: '.agents/rules', global: '~/.augment/rules' },
    },
  },
  'bolt': {
    name: 'bolt',
    displayName: 'Bolt',
    localRoot: '.bolt',
    globalRoot: '~/.bolt',
    detect: [
      { cwdDir: '.bolt' },
    ],
    dirs: {
      skill: { local: '.bolt/skills', global: '~/.bolt/skills' },
      agent: { local: '.bolt/agents', global: '~/.bolt/agents' },
      prompt: { local: '.bolt/prompts', global: '~/.bolt/prompts' },
      rule: { local: '.bolt/rules', global: '~/.bolt/rules' },
    },
  },
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    localRoot: '.claude',
    globalRoot: '~/.claude',
    detect: [
      { cwdDir: '.claude' },
    ],
    dirs: {
      skill: { local: '.claude/skills', global: '~/.claude/skills' },
      agent: { local: '.claude/agents', global: '~/.claude/agents' },
      prompt: { local: '.claude/prompts', global: '~/.claude/prompts' },
      rule: { local: '.claude/rules', global: '~/.claude/rules' },
    },
  },
  'cline': {
    name: 'cline',
    displayName: 'Cline',
    localRoot: '.cline',
    globalRoot: '~/.cline',
    detect: [
      { cwdDir: '.cline' },
    ],
    dirs: {
      skill: { local: '.cline/skills', global: '~/.cline/skills' },
      agent: { local: '.cline/agents', global: '~/.cline/agents' },
      prompt: { local: '.cline/prompts', global: '~/.cline/prompts' },
      rule: { local: '.cline/rules', global: '~/.cline/rules' },
    },
  },
  'codex': {
    name: 'codex',
    displayName: 'Codex',
    localRoot: '.agents',
    globalRoot: '~/.codex',
    detect: [
      { homeDir: '.codex' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.codex/skills' },
      agent: { local: '.agents/agents', global: '~/.codex/agents' },
      prompt: { local: '.agents/prompts', global: '~/.codex/prompts' },
      rule: { local: '.agents/rules', global: '~/.codex/rules' },
    },
  },
  'cody': {
    name: 'cody',
    displayName: 'Cody',
    localRoot: '.cody',
    globalRoot: '~/.cody',
    detect: [
      { cwdDir: '.cody' },
    ],
    dirs: {
      skill: { local: '.cody/skills', global: '~/.cody/skills' },
      agent: { local: '.cody/agents', global: '~/.cody/agents' },
      prompt: { local: '.cody/prompts', global: '~/.cody/prompts' },
      rule: { local: '.cody/rules', global: '~/.cody/rules' },
    },
  },
  'continue': {
    name: 'continue',
    displayName: 'Continue',
    localRoot: '.continue',
    globalRoot: '~/.continue',
    detect: [
      { cwdDir: '.continue' },
    ],
    dirs: {
      skill: { local: '.continue/skills', global: '~/.continue/skills' },
      agent: { local: '.continue/agents', global: '~/.continue/agents' },
      prompt: { local: '.continue/prompts', global: '~/.continue/prompts' },
      rule: { local: '.continue/rules', global: '~/.continue/rules' },
    },
  },
  'crush': {
    name: 'crush',
    displayName: 'Crush',
    localRoot: '.crush',
    globalRoot: '~/.crush',
    detect: [
      { cwdDir: '.crush' },
    ],
    dirs: {
      skill: { local: '.crush/skills', global: '~/.crush/skills' },
      agent: { local: '.crush/agents', global: '~/.crush/agents' },
      prompt: { local: '.crush/prompts', global: '~/.crush/prompts' },
      rule: { local: '.crush/rules', global: '~/.crush/rules' },
    },
  },
  'cursor': {
    name: 'cursor',
    displayName: 'Cursor',
    localRoot: '.cursor',
    globalRoot: '~/.cursor',
    detect: [
      { cwdDir: '.cursor' },
    ],
    dirs: {
      skill: { local: '.cursor/skills', global: '~/.cursor/skills' },
      agent: { local: '.cursor/agents', global: '~/.cursor/agents' },
      prompt: { local: '.cursor/prompts', global: '~/.cursor/prompts' },
      rule: { local: '.cursor/rules', global: '~/.cursor/rules' },
    },
  },
  'devin': {
    name: 'devin',
    displayName: 'Devin',
    localRoot: '.devin',
    globalRoot: '~/.devin',
    detect: [
      { cwdDir: '.devin' },
    ],
    dirs: {
      skill: { local: '.devin/skills', global: '~/.devin/skills' },
      agent: { local: '.devin/agents', global: '~/.devin/agents' },
      prompt: { local: '.devin/prompts', global: '~/.devin/prompts' },
      rule: { local: '.devin/rules', global: '~/.devin/rules' },
    },
  },
  'double': {
    name: 'double',
    displayName: 'Double',
    localRoot: '.double',
    globalRoot: '~/.double',
    detect: [
      { cwdDir: '.double' },
    ],
    dirs: {
      skill: { local: '.double/skills', global: '~/.double/skills' },
      agent: { local: '.double/agents', global: '~/.double/agents' },
      prompt: { local: '.double/prompts', global: '~/.double/prompts' },
      rule: { local: '.double/rules', global: '~/.double/rules' },
    },
  },
  'duo': {
    name: 'duo',
    displayName: 'Duo',
    localRoot: '.duo',
    globalRoot: '~/.duo',
    detect: [
      { cwdDir: '.duo' },
    ],
    dirs: {
      skill: { local: '.duo/skills', global: '~/.duo/skills' },
      agent: { local: '.duo/agents', global: '~/.duo/agents' },
      prompt: { local: '.duo/prompts', global: '~/.duo/prompts' },
      rule: { local: '.duo/rules', global: '~/.duo/rules' },
    },
  },
  'gemini-cli': {
    name: 'gemini-cli',
    displayName: 'Gemini CLI',
    localRoot: '.agents',
    globalRoot: '~/.gemini',
    detect: [
      { homeDir: '.gemini' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.gemini/skills' },
      agent: { local: '.agents/agents', global: '~/.gemini/agents' },
      prompt: { local: '.agents/prompts', global: '~/.gemini/prompts' },
      rule: { local: '.agents/rules', global: '~/.gemini/rules' },
    },
  },
  'github-copilot': {
    name: 'github-copilot',
    displayName: 'GitHub Copilot',
    localRoot: '.github',
    globalRoot: '~/.github',
    detect: [
      { cwdDir: '.github' },
    ],
    dirs: {
      skill: { local: '.github/skills', global: '~/.github/skills' },
      agent: { local: '.github/agents', global: '~/.github/agents' },
      prompt: { local: '.github/prompts', global: '~/.github/prompts' },
      rule: { local: '.github/rules', global: '~/.github/rules' },
    },
  },
  'goose': {
    name: 'goose',
    displayName: 'Goose',
    localRoot: '.agents',
    globalRoot: '~/.goose',
    detect: [
      { homeDir: '.goose' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.goose/skills' },
      agent: { local: '.agents/agents', global: '~/.goose/agents' },
      prompt: { local: '.agents/prompts', global: '~/.goose/prompts' },
      rule: { local: '.agents/rules', global: '~/.goose/rules' },
    },
  },
  'grit': {
    name: 'grit',
    displayName: 'Grit',
    localRoot: '.grit',
    globalRoot: '~/.grit',
    detect: [
      { cwdDir: '.grit' },
    ],
    dirs: {
      skill: { local: '.grit/skills', global: '~/.grit/skills' },
      agent: { local: '.grit/agents', global: '~/.grit/agents' },
      prompt: { local: '.grit/prompts', global: '~/.grit/prompts' },
      rule: { local: '.grit/rules', global: '~/.grit/rules' },
    },
  },
  'junie': {
    name: 'junie',
    displayName: 'Junie',
    localRoot: '.agents',
    globalRoot: '~/.junie',
    detect: [
      { homeDir: '.junie' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.junie/skills' },
      agent: { local: '.agents/agents', global: '~/.junie/agents' },
      prompt: { local: '.agents/prompts', global: '~/.junie/prompts' },
      rule: { local: '.agents/rules', global: '~/.junie/rules' },
    },
  },
  'kiro-cli': {
    name: 'kiro-cli',
    displayName: 'Kiro CLI',
    localRoot: '.agents',
    globalRoot: '~/.kiro',
    detect: [
      { homeDir: '.kiro' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.kiro/skills' },
      agent: { local: '.agents/agents', global: '~/.kiro/agents' },
      prompt: { local: '.agents/prompts', global: '~/.kiro/prompts' },
      rule: { local: '.agents/rules', global: '~/.kiro/rules' },
    },
  },
  'kode': {
    name: 'kode',
    displayName: 'Kode',
    localRoot: '.kode',
    globalRoot: '~/.kode',
    detect: [
      { cwdDir: '.kode' },
    ],
    dirs: {
      skill: { local: '.kode/skills', global: '~/.kode/skills' },
      agent: { local: '.kode/agents', global: '~/.kode/agents' },
      prompt: { local: '.kode/prompts', global: '~/.kode/prompts' },
      rule: { local: '.kode/rules', global: '~/.kode/rules' },
    },
  },
  'lovable': {
    name: 'lovable',
    displayName: 'Lovable',
    localRoot: '.lovable',
    globalRoot: '~/.lovable',
    detect: [
      { cwdDir: '.lovable' },
    ],
    dirs: {
      skill: { local: '.lovable/skills', global: '~/.lovable/skills' },
      agent: { local: '.lovable/agents', global: '~/.lovable/agents' },
      prompt: { local: '.lovable/prompts', global: '~/.lovable/prompts' },
      rule: { local: '.lovable/rules', global: '~/.lovable/rules' },
    },
  },
  'mcpjam': {
    name: 'mcpjam',
    displayName: 'MCPJam',
    localRoot: '.mcpjam',
    globalRoot: '~/.mcpjam',
    detect: [
      { cwdDir: '.mcpjam' },
    ],
    dirs: {
      skill: { local: '.mcpjam/skills', global: '~/.mcpjam/skills' },
      agent: { local: '.mcpjam/agents', global: '~/.mcpjam/agents' },
      prompt: { local: '.mcpjam/prompts', global: '~/.mcpjam/prompts' },
      rule: { local: '.mcpjam/rules', global: '~/.mcpjam/rules' },
    },
  },
  'mentat': {
    name: 'mentat',
    displayName: 'Mentat',
    localRoot: '.mentat',
    globalRoot: '~/.mentat',
    detect: [
      { cwdDir: '.mentat' },
    ],
    dirs: {
      skill: { local: '.mentat/skills', global: '~/.mentat/skills' },
      agent: { local: '.mentat/agents', global: '~/.mentat/agents' },
      prompt: { local: '.mentat/prompts', global: '~/.mentat/prompts' },
      rule: { local: '.mentat/rules', global: '~/.mentat/rules' },
    },
  },
  'opencode': {
    name: 'opencode',
    displayName: 'OpenCode',
    localRoot: '.agents',
    globalRoot: '~/.opencode',
    detect: [
      { homeDir: '.opencode' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.opencode/skills' },
      agent: { local: '.agents/agents', global: '~/.opencode/agents' },
      prompt: { local: '.agents/prompts', global: '~/.opencode/prompts' },
      rule: { local: '.agents/rules', global: '~/.opencode/rules' },
    },
  },
  'pochi': {
    name: 'pochi',
    displayName: 'Pochi',
    localRoot: '.pochi',
    globalRoot: '~/.pochi',
    detect: [
      { cwdDir: '.pochi' },
    ],
    dirs: {
      skill: { local: '.pochi/skills', global: '~/.pochi/skills' },
      agent: { local: '.pochi/agents', global: '~/.pochi/agents' },
      prompt: { local: '.pochi/prompts', global: '~/.pochi/prompts' },
      rule: { local: '.pochi/rules', global: '~/.pochi/rules' },
    },
  },
  'qoder': {
    name: 'qoder',
    displayName: 'Qoder',
    localRoot: '.qoder',
    globalRoot: '~/.qoder',
    detect: [
      { cwdDir: '.qoder' },
    ],
    dirs: {
      skill: { local: '.qoder/skills', global: '~/.qoder/skills' },
      agent: { local: '.qoder/agents', global: '~/.qoder/agents' },
      prompt: { local: '.qoder/prompts', global: '~/.qoder/prompts' },
      rule: { local: '.qoder/rules', global: '~/.qoder/rules' },
    },
  },
  'replit': {
    name: 'replit',
    displayName: 'Replit',
    localRoot: '.replit',
    globalRoot: '~/.replit',
    detect: [
      { cwdDir: '.replit' },
    ],
    dirs: {
      skill: { local: '.replit/skills', global: '~/.replit/skills' },
      agent: { local: '.replit/agents', global: '~/.replit/agents' },
      prompt: { local: '.replit/prompts', global: '~/.replit/prompts' },
      rule: { local: '.replit/rules', global: '~/.replit/rules' },
    },
  },
  'roo': {
    name: 'roo',
    displayName: 'Roo',
    localRoot: '.roo',
    globalRoot: '~/.roo',
    detect: [
      { cwdDir: '.roo' },
    ],
    dirs: {
      skill: { local: '.roo/skills', global: '~/.roo/skills' },
      agent: { local: '.roo/agents', global: '~/.roo/agents' },
      prompt: { local: '.roo/prompts', global: '~/.roo/prompts' },
      rule: { local: '.roo/rules', global: '~/.roo/rules' },
    },
  },
  'sourcegraph': {
    name: 'sourcegraph',
    displayName: 'Sourcegraph',
    localRoot: '.sourcegraph',
    globalRoot: '~/.sourcegraph',
    detect: [
      { cwdDir: '.sourcegraph' },
    ],
    dirs: {
      skill: { local: '.sourcegraph/skills', global: '~/.sourcegraph/skills' },
      agent: { local: '.sourcegraph/agents', global: '~/.sourcegraph/agents' },
      prompt: { local: '.sourcegraph/prompts', global: '~/.sourcegraph/prompts' },
      rule: { local: '.sourcegraph/rules', global: '~/.sourcegraph/rules' },
    },
  },
  'supermaven': {
    name: 'supermaven',
    displayName: 'Supermaven',
    localRoot: '.supermaven',
    globalRoot: '~/.supermaven',
    detect: [
      { cwdDir: '.supermaven' },
    ],
    dirs: {
      skill: { local: '.supermaven/skills', global: '~/.supermaven/skills' },
      agent: { local: '.supermaven/agents', global: '~/.supermaven/agents' },
      prompt: { local: '.supermaven/prompts', global: '~/.supermaven/prompts' },
      rule: { local: '.supermaven/rules', global: '~/.supermaven/rules' },
    },
  },
  'sweep': {
    name: 'sweep',
    displayName: 'Sweep',
    localRoot: '.sweep',
    globalRoot: '~/.sweep',
    detect: [
      { cwdDir: '.sweep' },
    ],
    dirs: {
      skill: { local: '.sweep/skills', global: '~/.sweep/skills' },
      agent: { local: '.sweep/agents', global: '~/.sweep/agents' },
      prompt: { local: '.sweep/prompts', global: '~/.sweep/prompts' },
      rule: { local: '.sweep/rules', global: '~/.sweep/rules' },
    },
  },
  'tabnine': {
    name: 'tabnine',
    displayName: 'Tabnine',
    localRoot: '.tabnine',
    globalRoot: '~/.tabnine',
    detect: [
      { cwdDir: '.tabnine' },
    ],
    dirs: {
      skill: { local: '.tabnine/skills', global: '~/.tabnine/skills' },
      agent: { local: '.tabnine/agents', global: '~/.tabnine/agents' },
      prompt: { local: '.tabnine/prompts', global: '~/.tabnine/prompts' },
      rule: { local: '.tabnine/rules', global: '~/.tabnine/rules' },
    },
  },
  'trae': {
    name: 'trae',
    displayName: 'Trae',
    localRoot: '.agents',
    globalRoot: '~/.trae',
    detect: [
      { homeDir: '.trae' },
    ],
    dirs: {
      skill: { local: '.agents/skills', global: '~/.trae/skills' },
      agent: { local: '.agents/agents', global: '~/.trae/agents' },
      prompt: { local: '.agents/prompts', global: '~/.trae/prompts' },
      rule: { local: '.agents/rules', global: '~/.trae/rules' },
    },
  },
  'void': {
    name: 'void',
    displayName: 'Void',
    localRoot: '.void',
    globalRoot: '~/.void',
    detect: [
      { cwdDir: '.void' },
    ],
    dirs: {
      skill: { local: '.void/skills', global: '~/.void/skills' },
      agent: { local: '.void/agents', global: '~/.void/agents' },
      prompt: { local: '.void/prompts', global: '~/.void/prompts' },
      rule: { local: '.void/rules', global: '~/.void/rules' },
    },
  },
  'windsurf': {
    name: 'windsurf',
    displayName: 'Windsurf',
    localRoot: '.windsurf',
    globalRoot: '~/.windsurf',
    detect: [
      { cwdDir: '.windsurf' },
    ],
    dirs: {
      skill: { local: '.windsurf/skills', global: '~/.windsurf/skills' },
      agent: { local: '.windsurf/agents', global: '~/.windsurf/agents' },
      prompt: { local: '.windsurf/prompts', global: '~/.windsurf/prompts' },
      rule: { local: '.windsurf/rules', global: '~/.windsurf/rules' },
    },
  },
  'zed': {
    name: 'zed',
    displayName: 'Zed',
    localRoot: '.zed',
    globalRoot: '~/.zed',
    detect: [
      { cwdDir: '.zed' },
    ],
    dirs: {
      skill: { local: '.zed/skills', global: '~/.zed/skills' },
      agent: { local: '.zed/agents', global: '~/.zed/agents' },
      prompt: { local: '.zed/prompts', global: '~/.zed/prompts' },
      rule: { local: '.zed/rules', global: '~/.zed/rules' },
    },
  },
  'zencoder': {
    name: 'zencoder',
    displayName: 'ZenCoder',
    localRoot: '.zencoder',
    globalRoot: '~/.zencoder',
    detect: [
      { cwdDir: '.zencoder' },
    ],
    dirs: {
      skill: { local: '.zencoder/skills', global: '~/.zencoder/skills' },
      agent: { local: '.zencoder/agents', global: '~/.zencoder/agents' },
      prompt: { local: '.zencoder/prompts', global: '~/.zencoder/prompts' },
      rule: { local: '.zencoder/rules', global: '~/.zencoder/rules' },
    },
  },
};

export const AGENT_NAMES = [
  'adal',
  'aider',
  'amp',
  'augment',
  'bolt',
  'claude-code',
  'cline',
  'codex',
  'cody',
  'continue',
  'crush',
  'cursor',
  'devin',
  'double',
  'duo',
  'gemini-cli',
  'github-copilot',
  'goose',
  'grit',
  'junie',
  'kiro-cli',
  'kode',
  'lovable',
  'mcpjam',
  'mentat',
  'opencode',
  'pochi',
  'qoder',
  'replit',
  'roo',
  'sourcegraph',
  'supermaven',
  'sweep',
  'tabnine',
  'trae',
  'void',
  'windsurf',
  'zed',
  'zencoder',
] as const;
