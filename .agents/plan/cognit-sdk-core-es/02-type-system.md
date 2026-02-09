# 02 - Sistema de Tipos Completo

**Autor:** Agent A -- Arquitecto del Núcleo del SDK
**Fecha:** 2026-02-09
**Estado:** Plan

---

## 1. Tipos Marcados (Branded Types) (`types/branded.ts`)

Los tipos marcados evitan la mezcla accidental de IDs de cadena de diferentes dominios.

```typescript
// ---------- Utilidad de Marcado ----------

declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ---------- Marcas de Dominio ----------

/** Un nombre de agente validado (ej., "claude-code", "cursor") */
export type AgentName = Brand<string, 'AgentName'>;

/** Un nombre de cognitivo validado (ej., "react-best-practices") */
export type CognitiveName = Brand<string, 'CognitiveName'>;

/** Un nombre sanitizado y seguro para el sistema de archivos */
export type SafeName = Brand<string, 'SafeName'>;

/** Un identificador de origen validado (ej., "owner/repo", "mintlify/bun.com") */
export type SourceIdentifier = Brand<string, 'SourceIdentifier'>;

// ---------- Constructores de Marcas ----------

export function agentName(raw: string): AgentName {
  // Validación: minúsculas, alfanumérico + guiones
  if (!/^[a-z0-9][a-z0-9-]*$/.test(raw)) {
    throw new Error(`Nombre de agente inválido: "${raw}"`);
  }
  return raw as AgentName;
}

export function cognitiveName(raw: string): CognitiveName {
  if (!raw || raw.includes('/') || raw.includes('')) {
    throw new Error(`Nombre de cognitivo inválido: "${raw}"`);
  }
  return raw as CognitiveName;
}

export function safeName(raw: string): SafeName {
  // No debe contener separadores de ruta, puntos solos o bytes nulos
  if (!raw || /[/\:]/.test(raw) || raw === '.' || raw === '..' || raw.includes('\0')) {
    throw new Error(`Nombre no seguro: "${raw}"`);
  }
  return raw as SafeName;
}

export function sourceIdentifier(raw: string): SourceIdentifier {
  if (!raw) throw new Error('Identificador de origen vacío');
  return raw as SourceIdentifier;
}
```

---

## 2. Tipo Result (`types/result.ts`)

```typescript
import type { CognitError } from '../errors/base.js';

/**
 * Unión discriminada para operaciones que pueden fallar con errores esperados.
 * Úsela en lugar de lanzar excepciones para fallos recuperables.
 */
export type Result<T, E extends CognitError = CognitError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Crear un resultado de éxito */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Crear un resultado de fallo */
export function err<E extends CognitError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Desempaquetar un resultado o lanzar el error */
export function unwrap<T, E extends CognitError>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/** Mapear el valor de éxito de un resultado */
export function mapResult<T, U, E extends CognitError>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}
```

---

## 3. Tipos Cognitivos (`types/cognitive.ts`)

```typescript
import type { CognitiveName } from './branded.js';

// ---------- CognitiveType ----------

/**
 * Los tipos cognitivos compatibles.
 * Esta es una unión de literales de cadena generada a partir de config/cognitive-types.yaml en tiempo de compilación.
 * Se muestra aquí como la fuente de verdad para el sistema de tipos.
 */
export type CognitiveType = 'skill' | 'agent' | 'prompt' | 'rule';

/**
 * Configuración para un tipo cognitivo (generada a partir de YAML).
 * Mapea cada tipo a sus convenciones del sistema de archivos.
 */
export interface CognitiveTypeConfig {
  /** Nombre del subdirectorio (ej., "skills", "prompts") */
  readonly subdir: string;
  /** Nombre canónico del archivo (ej., "SKILL.md", "PROMPT.md") */
  readonly fileName: string;
}

/**
 * Mapeo completo de tipos cognitivos a sus configuraciones.
 * La aserción 'as const' asegura que se preserven los tipos literales.
 */
export const COGNITIVE_TYPE_CONFIGS = {
  skill:  { subdir: 'skills',  fileName: 'SKILL.md' },
  agent:  { subdir: 'agents',  fileName: 'AGENT.md' },
  prompt: { subdir: 'prompts', fileName: 'PROMPT.md' },
  rule:   { subdir: 'rules',   fileName: 'RULE.md' },
} as const satisfies Record<CognitiveType, CognitiveTypeConfig>;

/** Nombres de subdirectorios indexados por tipo cognitivo */
export const COGNITIVE_SUBDIRS: Record<CognitiveType, string> = {
  skill:  COGNITIVE_TYPE_CONFIGS.skill.subdir,
  agent:  COGNITIVE_TYPE_CONFIGS.agent.subdir,
  prompt: COGNITIVE_TYPE_CONFIGS.prompt.subdir,
  rule:   COGNITIVE_TYPE_CONFIGS.rule.subdir,
};

/** Nombres de archivos indexados por tipo cognitivo */
export const COGNITIVE_FILE_NAMES: Record<CognitiveType, string> = {
  skill:  COGNITIVE_TYPE_CONFIGS.skill.fileName,
  agent:  COGNITIVE_TYPE_CONFIGS.agent.fileName,
  prompt: COGNITIVE_TYPE_CONFIGS.prompt.fileName,
  rule:   COGNITIVE_TYPE_CONFIGS.rule.fileName,
};

/** El nombre canónico del directorio de agentes */
export const AGENTS_DIR = '.agents' as const;

// ---------- Cognitive ----------

/**
 * Un cognitivo descubierto en el sistema de archivos.
 * Este es el tipo de datos central: cada cognitivo descubierto resuelve a esta forma.
 */
export interface Cognitive {
  /** Nombre para mostrar del frontmatter */
  readonly name: CognitiveName;

  /** Descripción legible por humanos del frontmatter */
  readonly description: string;

  /** Ruta absoluta al directorio del cognitivo */
  readonly path: string;

  /** El tipo de cognitivo */
  readonly type: CognitiveType;

  /** Contenido bruto del archivo (SKILL.md, AGENT.md, etc.) para hashing */
  readonly rawContent: string;

  /** Metadatos adicionales del frontmatter */
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ---------- Subtipos específicos por tipo ----------

/**
 * Un cognitivo de tipo Skill: instrucciones orientadas a tareas para un agente.
 */
export interface Skill extends Cognitive {
  readonly type: 'skill';
}

/**
 * Un cognitivo de tipo Prompt: plantillas de prompts reutilizables.
 */
export interface Prompt extends Cognitive {
  readonly type: 'prompt';
}

/**
 * Un cognitivo de tipo Rule: reglas y restricciones de comportamiento.
 */
export interface Rule extends Cognitive {
  readonly type: 'rule';
}

/**
 * Un AgentCognitive: definiciones de persona/comportamiento.
 * Nombrado AgentCognitive para evitar colisión con AgentConfig.
 */
export interface AgentCognitive extends Cognitive {
  readonly type: 'agent';
}

// ---------- Cognitivo remoto ----------

/**
 * Un cognitivo obtenido de un proveedor remoto (aún no en disco).
 */
export interface RemoteCognitive {
  /** Nombre para mostrar del frontmatter */
  readonly name: string;

  /** Descripción del frontmatter */
  readonly description: string;

  /** Contenido markdown completo incluyendo el frontmatter */
  readonly content: string;

  /** Nombre seguro para el sistema de archivos para el directorio de instalación */
  readonly installName: SafeName;

  /** La URL de origen original */
  readonly sourceUrl: string;

  /** ID del proveedor que obtuvo esto */
  readonly providerId: string;

  /** Identificador de origen para seguimiento (ej., "mintlify/bun.com") */
  readonly sourceIdentifier: SourceIdentifier;

  /** El tipo de cognitivo */
  readonly type: CognitiveType;

  /** Metadatos adicionales del frontmatter */
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ---------- CognitiveRef (referencia ligera) ----------

/**
 * Referencia ligera a un cognitivo, sin contenido.
 * Se usa en resultados de listas, cargas útiles de eventos, etc.
 */
export interface CognitiveRef {
  readonly name: CognitiveName;
  readonly type: CognitiveType;
  readonly path: string;
  readonly description: string;
}
```

---

## 4. Tipos de Agentes (`types/agent.ts`)

```typescript
import type { AgentName } from './branded.js';
import type { CognitiveType } from './cognitive.js';

// ---------- AgentType ----------

/**
 * Unión de todos los identificadores de agentes conocidos.
 * Generado en tiempo de compilación a partir de agents/*.yaml.
 * Se muestra aquí con valores representativos.
 */
export type AgentType =
  | 'adal'
  | 'amp'
  | 'augment'
  | 'claude-code'
  | 'cline'
  | 'codex'
  | 'cursor'
  | 'gemini-cli'
  | 'github-copilot'
  | 'goose'
  | 'junie'
  | 'kiro-cli'
  | 'opencode'
  | 'roo'
  | 'trae'
  | 'windsurf'
  // ... 39+ en total, generados desde YAML
  ;

// ---------- AgentConfig ----------

/**
 * Configuración de directorio para un tipo cognitivo específico dentro de un agente.
 */
export interface AgentDirConfig {
  /** Ruta relativa para instalación local del proyecto (ej., ".cursor/skills") */
  readonly local: string;
  /** Ruta absoluta para instalación global, o 'undefined' si no es compatible */
  readonly global: string | undefined;
}

/**
 * Configuración completa para un único agente de codificación de IA.
 * Generada a partir de agents/*.yaml en tiempo de compilación.
 */
export interface AgentConfig {
  /** Identificador legible por máquina (ej., "claude-code") */
  readonly name: AgentName;

  /** Nombre para mostrar legible por humanos (ej., "Claude Code") */
  readonly displayName: string;

  /** Mapeos de directorios para cada tipo cognitivo */
  readonly dirs: Readonly<Record<CognitiveType, AgentDirConfig>>;

  /** Función asíncrona para detectar si este agente está instalado en el sistema */
  readonly detectInstalled: () => Promise<boolean>;

  /** Si se debe mostrar este agente en la lista universal de agentes. Por defecto: true */
  readonly showInUniversalList: boolean;
}

// ---------- AgentDetectionResult ----------

/**
 * Resultado de detectar agentes instalados.
 */
export interface AgentDetectionResult {
  /** El agente que fue detectado */
  readonly agent: AgentType;

  /** El nombre para mostrar del agente */
  readonly displayName: string;

  /** Si el agente se encontró instalado */
  readonly installed: boolean;

  /** Si este agente usa el directorio universal .agents/ */
  readonly isUniversal: boolean;
}

// ---------- Interfaz AgentRegistry ----------

/**
 * Registro que proporciona acceso a las configuraciones de los agentes.
 * Esta es la interfaz pública; la implementación es interna.
 */
export interface AgentRegistry {
  /** Obtener todos los tipos de agentes registrados */
  getAll(): ReadonlyMap<AgentType, AgentConfig>;

  /** Obtener una configuración de agente específica. Devuelve undefined si no se encuentra. */
  get(type: AgentType): AgentConfig | undefined;

  /** Obtener agentes que usan el directorio universal .agents/<tipo> */
  getUniversalAgents(cognitiveType?: CognitiveType): AgentType[];

  /** Obtener agentes que tienen directorios específicos por agente (necesitan symlinks) */
  getNonUniversalAgents(cognitiveType?: CognitiveType): AgentType[];

  /** Verificar si un agente usa el directorio universal para un tipo cognitivo dado */
  isUniversal(type: AgentType, cognitiveType?: CognitiveType): boolean;

  /** Obtener la ruta del directorio para un agente específico + tipo cognitivo + ámbito */
  getDir(type: AgentType, cognitiveType: CognitiveType, scope: 'local' | 'global'): string | undefined;

  /** Detectar qué agentes están instalados en este sistema */
  detectInstalled(): Promise<AgentDetectionResult[]>;

  /** Registrar un agente adicional en tiempo de ejecución */
  register(config: AgentConfig): void;
}
```

---

## 5. Tipos de Proveedores (`types/provider.ts`)

```typescript
import type { CognitiveType } from './cognitive.js';
import type { RemoteCognitive } from './cognitive.js';
import type { SourceIdentifier } from './branded.js';

// ---------- SourceDescriptor ----------

/**
 * Describe una entrada de origen analizada (URL, ruta, abreviatura).
 * Esta es la salida del SourceParser.
 */
export interface SourceDescriptor {
  /** El tipo de origen */
  readonly kind: 'github' | 'gitlab' | 'git' | 'local' | 'direct-url' | 'well-known';

  /** La URL o ruta resuelta */
  readonly url: string;

  /** Subruta dentro del origen (ej., "skills/react" dentro de un repo) */
  readonly subpath?: string;

  /** Ruta del sistema de archivos local (para el tipo 'local') */
  readonly localPath?: string;

  /** Referencia de Git (rama/etiqueta/commit) */
  readonly ref?: string;

  /** Filtro: solo instalar cognitivos que coincidan con este nombre */
  readonly nameFilter?: string;

  /** Filtro: solo instalar cognitivos de este tipo */
  readonly typeFilter?: CognitiveType;
}

// ---------- ParsedSource (alias para compatibilidad) ----------
export type ParsedSource = SourceDescriptor;

// ---------- ProviderMatch ----------

/**
 * Resultado de verificar si una URL pertenece a un proveedor.
 */
export interface ProviderMatch {
  /** Si la URL coincide con este proveedor */
  readonly matches: boolean;
  /** Identificador de origen para seguimiento/agrupación */
  readonly sourceIdentifier?: SourceIdentifier;
}

// ---------- HostProvider ----------

/**
 * Interfaz para proveedores de hosting de cognitivos remotos.
 * Cada proveedor sabe cómo obtener cognitivos de un tipo específico de host remoto.
 */
export interface HostProvider {
  /** Identificador único del proveedor (ej., "mintlify", "huggingface") */
  readonly id: string;

  /** Nombre legible por humanos del proveedor */
  readonly displayName: string;

  /**
   * Verificar si una URL pertenece a este proveedor.
   */
  match(url: string): ProviderMatch;

  /**
   * Obtener y analizar un cognitivo de la URL dada.
   * Devuelve null si la URL es válida para este proveedor pero no se encontró ningún cognitivo.
   */
  fetchCognitive(url: string): Promise<RemoteCognitive | null>;

  /**
   * Convertir una URL orientada al usuario a una URL de contenido bruto (raw).
   * Por ejemplo: URL de blob de GitHub -> URL de raw.githubusercontent.com.
   */
  toRawUrl(url: string): string;

  /**
   * Obtener un identificador de origen estable para agrupación/seguimiento.
   */
  getSourceIdentifier(url: string): SourceIdentifier;
}

// ---------- ProviderRegistry ----------

/**
 * Registro de proveedores de host. Admite registro dinámico.
 */
export interface ProviderRegistry {
  /** Registrar un nuevo proveedor */
  register(provider: HostProvider): void;

  /** Buscar el primer proveedor que coincida con la URL dada */
  findProvider(url: string): HostProvider | null;

  /** Obtener todos los proveedores registrados */
  getAll(): readonly HostProvider[];
}

// ---------- SourceParser ----------

/**
 * Analiza cadenas de origen brutas en SourceDescriptors estructurados.
 */
export interface SourceParser {
  /**
   * Analizar una cadena de origen bruta (URL, ruta o abreviatura como "owner/repo").
   */
  parse(source: string): SourceDescriptor;

  /**
   * Extraer owner/repo de un descriptor de origen de GitHub o GitLab.
   * Devuelve undefined para orígenes que no sean git.
   */
  getOwnerRepo(source: SourceDescriptor): string | undefined;
}

// ---------- GitClient ----------

/**
 * Abstracción para operaciones de git.
 */
export interface GitClient {
  /**
   * Clonar un repositorio en un directorio temporal.
   * Devuelve la ruta al directorio temporal.
   */
  clone(url: string, options?: GitCloneOptions): Promise<string>;

  /**
   * Limpiar un directorio de clonación temporal.
   */
  cleanup(tempDir: string): Promise<void>;
}

export interface GitCloneOptions {
  /** Profundidad de clonación. Por defecto: 1 (superficial) */
  readonly depth?: number;
  /** Tiempo de espera en milisegundos */
  readonly timeoutMs?: number;
  /** Referencia específica para clonar */
  readonly ref?: string;
}
```

---

## 6. Tipos de Instalador (`types/installer.ts`)

```typescript
import type { AgentType } from './agent.js';
import type { CognitiveType, Cognitive, RemoteCognitive } from './cognitive.js';
import type { SafeName } from './branded.js';

// ---------- InstallMode ----------

/** Cómo se vinculan los archivos cognitivos a los directorios del agente */
export type InstallMode = 'symlink' | 'copy';

// ---------- InstallScope ----------

/** Dónde instalar: local del proyecto o global del usuario */
export type InstallScope = 'project' | 'global';

// ---------- InstallTarget ----------

/** Especifica dónde y cómo instalar un cognitivo para un único agente */
export interface InstallTarget {
  /** El agente para el cual se instala */
  readonly agent: AgentType;
  /** Ámbito local del proyecto o global */
  readonly scope: InstallScope;
  /** Modo de instalación */
  readonly mode: InstallMode;
}

// ---------- InstallResult ----------

/**
 * Resultado de instalar un único cognitivo para un único agente.
 */
export interface InstallResult {
  /** Si la instalación tuvo éxito */
  readonly success: boolean;

  /** El agente para el cual se instaló */
  readonly agent: AgentType;

  /** El nombre del cognitivo */
  readonly cognitiveName: string;

  /** El tipo de cognitivo */
  readonly cognitiveType: CognitiveType;

  /** Ruta de instalación final */
  readonly path: string;

  /** Ruta canónica (para el modo symlink, el origen del enlace) */
  readonly canonicalPath?: string;

  /** El modo que se utilizó realmente */
  readonly mode: InstallMode;

  /** Si la creación del symlink falló y se recurrió a la copia */
  readonly symlinkFailed?: boolean;

  /** Mensaje de error si success es false */
  readonly error?: string;
}

// ---------- InstallRequest ----------

/**
 * Una solicitud para instalar un cognitivo. Unifica cognitivos locales y remotos.
 */
export type InstallRequest =
  | { readonly kind: 'local'; readonly cognitive: Cognitive }
  | { readonly kind: 'remote'; readonly cognitive: RemoteCognitive }
  | { readonly kind: 'wellknown'; readonly cognitive: WellKnownCognitive };

/**
 * Un cognitivo de tipo well-known con múltiples archivos.
 */
export interface WellKnownCognitive {
  readonly name: string;
  readonly installName: SafeName;
  readonly description: string;
  readonly type: CognitiveType;
  readonly sourceUrl: string;
  readonly files: ReadonlyMap<string, string>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ---------- Interfaz Installer ----------

/**
 * Maneja las operaciones de archivos reales para instalar cognitivos.
 */
export interface Installer {
  /**
   * Instalar un cognitivo para un agente específico.
   */
  install(
    request: InstallRequest,
    target: InstallTarget,
    options: InstallerOptions,
  ): Promise<InstallResult>;

  /**
   * Eliminar un cognitivo instalado del directorio de un agente.
   */
  remove(
    cognitiveName: string,
    cognitiveType: CognitiveType,
    target: InstallTarget,
  ): Promise<boolean>;
}

export interface InstallerOptions {
  /** Directorio de trabajo para instalaciones locales del proyecto */
  readonly cwd: string;
}
```

---

## 7. Tipos de Bloqueo (`types/lock.ts`)

```typescript
import type { CognitiveType } from './cognitive.js';
import type { SourceIdentifier } from './branded.js';

// ---------- Versión de Bloqueo ----------

/** Versión actual del esquema del archivo de bloqueo */
export const LOCK_VERSION = 5 as const;

// ---------- LockEntry ----------

/**
 * Una entrada individual en el archivo de bloqueo que representa un cognitivo instalado.
 */
export interface LockEntry {
  /** Identificador de origen normalizado (ej., "owner/repo") */
  readonly source: SourceIdentifier;

  /** El tipo de proveedor/origen (ej., "github", "mintlify") */
  readonly sourceType: string;

  /** La URL original utilizada para instalar (para volver a obtener) */
  readonly sourceUrl: string;

  /** Subruta dentro del repositorio de origen */
  readonly cognitivePath?: string;

  /**
   * Hash de la carpeta del cognitivo para detección de actualizaciones.
   * Para orígenes GitHub: Git tree SHA.
   * Para otros orígenes: SHA-256 del contenido.
   */
  readonly contentHash: string;

  /** El tipo de cognitivo */
  readonly cognitiveType: CognitiveType;

  /** Marca de tiempo ISO de la primera instalación */
  readonly installedAt: string;

  /** Marca de tiempo ISO de la última actualización */
  readonly updatedAt: string;
}

// ---------- LockFile ----------

/**
 * La estructura completa del archivo de bloqueo.
 */
export interface LockFile {
  /** Versión del esquema */
  readonly version: typeof LOCK_VERSION;

  /** Mapa de nombre de cognitivo -> entrada de bloqueo */
  readonly cognitives: Readonly<Record<string, LockEntry>>;

  /** Última lista de agentes seleccionados (preferencia del usuario) */
  readonly lastSelectedAgents?: readonly string[];
}

// ---------- LockManager ----------

/**
 * Gestiona la lectura, escritura y consulta del archivo de bloqueo.
 */
export interface LockManager {
  /** Leer el archivo de bloqueo actual. Devuelve vacío si no se encuentra. */
  read(): Promise<LockFile>;

  /** Escribir el archivo de bloqueo en disco */
  write(lock: LockFile): Promise<void>;

  /** Añadir o actualizar una entrada de cognitivo */
  addEntry(name: string, entry: Omit<LockEntry, 'installedAt' | 'updatedAt'>): Promise<void>;

  /** Eliminar una entrada de cognitivo. Devuelve true si existía. */
  removeEntry(name: string): Promise<boolean>;

  /** Obtener una entrada específica */
  getEntry(name: string): Promise<LockEntry | null>;

  /** Obtener todas las entradas */
  getAllEntries(): Promise<Readonly<Record<string, LockEntry>>>;

  /** Obtener entradas agrupadas por origen */
  getBySource(): Promise<ReadonlyMap<SourceIdentifier, { names: string[]; entry: LockEntry }>>;

  /** Obtener/guardar los últimos agentes seleccionados */
  getLastSelectedAgents(): Promise<readonly string[] | undefined>;
  saveLastSelectedAgents(agents: readonly string[]): Promise<void>;
}
```

---

## 8. Tipos de Operación (`types/operations.ts`)

```typescript
import type { AgentType } from './agent.js';
import type { CognitiveType, Cognitive, CognitiveRef, RemoteCognitive } from './cognitive.js';
import type { InstallMode, InstallScope, InstallResult } from './installer.js';
import type { LockEntry } from './lock.js';

// ============================================================
// ADD
// ============================================================

export interface AddOptions {
  /** Agentes de destino. Si está vacío, el consumidor debe seleccionar entre los agentes detectados. */
  readonly agents?: readonly AgentType[];

  /** Ámbito de instalación */
  readonly scope?: InstallScope;

  /** Modo de instalación */
  readonly mode?: InstallMode;

  /** Directorio de trabajo */
  readonly cwd?: string;

  /** Solo instalar cognitivos de este tipo */
  readonly typeFilter?: CognitiveType;

  /** Solo instalar cognitivos que coincidan con estos nombres */
  readonly nameFilter?: readonly string[];

  /**
   * Si el origen contiene múltiples cognitivos, ¿debemos instalarlos todos
   * o el consumidor debe seleccionar? Cuando es true, instala todos los descubiertos.
   */
  readonly installAll?: boolean;
}

export interface AddResult {
  /** Origen que fue resuelto */
  readonly source: string;

  /** Todos los cognitivos que fueron descubiertos */
  readonly discovered: readonly CognitiveRef[];

  /** Cognitivos que se instalaron realmente (después del filtrado) */
  readonly installed: readonly InstallResultEntry[];

  /** Entradas de bloqueo que se crearon/actualizaron */
  readonly lockEntries: readonly string[];
}

export interface InstallResultEntry {
  /** El cognitivo que fue instalado */
  readonly cognitive: CognitiveRef;

  /** Resultados de instalación por agente */
  readonly results: readonly InstallResult[];
}

// ============================================================
// LIST
// ============================================================

export interface ListOptions {
  /** Filtrar por tipo cognitivo */
  readonly typeFilter?: CognitiveType;

  /** Filtrar por agente */
  readonly agentFilter?: AgentType;

  /** Ámbito a listar */
  readonly scope?: InstallScope;

  /** Directorio de trabajo */
  readonly cwd?: string;

  /** Incluir metadatos del archivo de bloqueo */
  readonly includeLockData?: boolean;
}

export interface ListResult {
  /** Cognitivos instalados descubiertos */
  readonly cognitives: readonly InstalledCognitive[];
}

export interface InstalledCognitive {
  /** Referencia del cognitivo */
  readonly cognitive: CognitiveRef;

  /** En qué agentes está instalado este cognitivo */
  readonly agents: readonly AgentType[];

  /** Metadatos del archivo de bloqueo (si includeLockData es true) */
  readonly lockEntry?: LockEntry;

  /** Ámbito de instalación */
  readonly scope: InstallScope;
}

// ============================================================
// REMOVE
// ============================================================

export interface RemoveOptions {
  /** Agentes de destino de los que eliminar. Si está vacío, elimina de todos los agentes. */
  readonly agents?: readonly AgentType[];

  /** Ámbito del cual eliminar */
  readonly scope?: InstallScope;

  /** Directorio de trabajo */
  readonly cwd?: string;

  /** El tipo de cognitivo */
  readonly cognitiveType?: CognitiveType;
}

export interface RemoveResult {
  /** Nombre del cognitivo que fue eliminado */
  readonly name: string;

  /** Si se eliminó la entrada del archivo de bloqueo */
  readonly lockEntryRemoved: boolean;

  /** Resultados de eliminación por agente */
  readonly removedFrom: readonly {
    readonly agent: AgentType;
    readonly path: string;
    readonly success: boolean;
  }[];
}

// ============================================================
// UPDATE
// ============================================================

export interface UpdateOptions {
  /** Cognitivos específicos a actualizar. Si está vacío, verifica todos. */
  readonly names?: readonly string[];

  /** Directorio de trabajo */
  readonly cwd?: string;
}

export interface UpdateResult {
  /** Cognitivos que fueron verificados para actualizaciones */
  readonly checked: readonly UpdateCheckEntry[];

  /** Cognitivos que fueron actualizados */
  readonly updated: readonly string[];

  /** Cognitivos que fallaron al actualizar */
  readonly failed: readonly { readonly name: string; readonly error: string }[];
}

export interface UpdateCheckEntry {
  /** Nombre del cognitivo */
  readonly name: string;

  /** Si hay una actualización disponible */
  readonly hasUpdate: boolean;

  /** Hash de contenido actual */
  readonly currentHash: string;

  /** Hash de contenido remoto (si se verificó) */
  readonly remoteHash?: string;
}

// ============================================================
// SYNC
// ============================================================

export interface SyncOptions {
  /** Directorio de trabajo */
  readonly cwd?: string;

  /** Agentes de destino. Si está vacío, sincroniza todos los agentes detectados. */
  readonly agents?: readonly AgentType[];
}

export interface SyncResult {
  /** Cognitivos que fueron re-vinculados/copiados a los agentes */
  readonly synced: readonly {
    readonly name: string;
    readonly agent: AgentType;
    readonly result: InstallResult;
  }[];

  /** Entradas huérfanas (en el archivo de bloqueo pero no en disco) */
  readonly orphaned: readonly string[];
}
```

---

## 9. Tipos de Categoría (`types/category.ts`)

```typescript
/**
 * Una categoría (departamento) para organizar cognitivos.
 * Las categorías son un concepto del SDK; es posible que los agentes individuales no las admitan.
 */
export interface Category {
  /** Slug legible por máquina (ej., "planning", "qa", "frontend") */
  readonly slug: string;

  /** Nombre para mostrar legible por humanos */
  readonly displayName: string;

  /** Descripción opcional */
  readonly description?: string;
}

/**
 * Mapea un cognitivo a su categoría.
 * Las categorías se almacenan en la estructura canónica .agents/<tipo>/<categoría>/<cognitivo>/
 * pero se aplanan al instalar en agentes que no admiten categorías.
 */
export interface CategoryMapping {
  /** El nombre del cognitivo */
  readonly cognitiveName: string;

  /** El slug de la categoría asignada */
  readonly category: string;
}

/**
 * Categorías predefinidas (extensibles por los consumidores).
 */
export const DEFAULT_CATEGORIES = {
  planning:  { slug: 'planning',  displayName: 'Planning' },
  qa:        { slug: 'qa',        displayName: 'QA' },
  growth:    { slug: 'growth',    displayName: 'Growth' },
  frontend:  { slug: 'frontend',  displayName: 'Frontend' },
  backend:   { slug: 'backend',   displayName: 'Backend' },
  devops:    { slug: 'devops',    displayName: 'DevOps' },
  security:  { slug: 'security',  displayName: 'Security' },
  general:   { slug: 'general',   displayName: 'General' },
} as const satisfies Record<string, Category>;
```

---

## 10. Tipos de Configuración (`types/config.ts`)

```typescript
import type { AgentConfig } from './agent.js';
import type { HostProvider } from './provider.js';

/**
 * Interfaz de adaptador de sistema de archivos para testabilidad.
 * Toda la E/S del sistema de archivos del SDK pasa por esta interfaz.
 */
export interface FileSystemAdapter {
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  writeFile(path: string, content: string, encoding: 'utf-8'): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  stat(path: string): Promise<FsStats>;
  lstat(path: string): Promise<FsStats>;
  symlink(target: string, path: string): Promise<void>;
  readlink(path: string): Promise<string>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  copyDirectory(source: string, target: string): Promise<void>;
}

/** Resultado mínimo de stat */
export interface FsStats {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

/** Entrada de directorio mínima */
export interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

/**
 * Configuración completa del SDK.
 */
export interface SDKConfig {
  /** Directorio base para el almacenamiento canónico de cognitivos. Por defecto: ".agents" */
  readonly agentsDir: string;

  /** Nombre del archivo de bloqueo. Por defecto: ".cognit-lock.json" */
  readonly lockFileName: string;

  /** Directorio de trabajo. Por defecto: process.cwd() */
  readonly cwd: string;

  /** Directorio personal para instalaciones globales. Por defecto: os.homedir() */
  readonly homeDir: string;

  /** Adaptador del sistema de archivos */
  readonly fs: FileSystemAdapter;

  /** Configuración de Git */
  readonly git: Readonly<GitConfig>;

  /** Configuración de proveedores */
  readonly providers: Readonly<ProviderConfig>;

  /** Configuración de agentes */
  readonly agents: Readonly<AgentRegistryConfig>;

  /** Configuración de telemetría */
  readonly telemetry: Readonly<TelemetryConfig>;
}

export interface GitConfig {
  /** Tiempo de espera de clonación en ms. Por defecto: 30000 */
  readonly cloneTimeoutMs: number;
  /** Profundidad de clonación superficial. Por defecto: 1 */
  readonly depth: number;
}

export interface ProviderConfig {
  /** Token de GitHub para llamadas a la API. Se detecta automáticamente si no se proporciona. */
  readonly githubToken?: string;
  /** Proveedores personalizados a registrar */
  readonly custom: readonly HostProvider[];
}

export interface AgentRegistryConfig {
  /** Ruta al directorio que contiene las definiciones YAML de los agentes */
  readonly definitionsPath?: string;
  /** Configuraciones de agentes adicionales para registrar en tiempo de ejecución */
  readonly additional: readonly AgentConfig[];
}

export interface TelemetryConfig {
  /** Habilitar/deshabilitar telemetría. Por defecto: true */
  readonly enabled: boolean;
  /** Endpoint de telemetría personalizado */
  readonly endpoint?: string;
}
```

---

## 11. Tipos de Eventos (`types/events.ts`)

```typescript
import type { AgentType, AgentDetectionResult } from './agent.js';
import type { CognitiveType, CognitiveRef } from './cognitive.js';
import type { InstallMode, InstallResult } from './installer.js';
import type { CognitError } from '../errors/base.js';

/**
 * Mapa completo de eventos. Las claves son los nombres de los eventos, los valores son los tipos de carga útil.
 */
export interface SDKEventMap {
  // -- Ciclo de vida del SDK --
  'sdk:initialized': { readonly configHash: string };
  'sdk:error': { readonly error: CognitError };

  // -- Ciclo de vida de la operación --
  'operation:start': { readonly operation: string; readonly options: unknown };
  'operation:complete': { readonly operation: string; readonly result: unknown; readonly durationMs: number };
  'operation:error': { readonly operation: string; readonly error: CognitError };

  // -- Descubrimiento --
  'discovery:start': { readonly path: string };
  'discovery:found': { readonly cognitive: CognitiveRef; readonly type: CognitiveType };
  'discovery:complete': { readonly count: number; readonly durationMs: number };

  // -- Proveedor --
  'provider:fetch:start': { readonly providerId: string; readonly url: string };
  'provider:fetch:complete': { readonly providerId: string; readonly url: string; readonly found: boolean };
  'provider:fetch:error': { readonly providerId: string; readonly url: string; readonly error: string };

  // -- Instalador --
  'install:start': { readonly cognitive: string; readonly agent: AgentType; readonly mode: InstallMode };
  'install:symlink': { readonly source: string; readonly target: string };
  'install:copy': { readonly source: string; readonly target: string };
  'install:complete': { readonly cognitive: string; readonly agent: AgentType; readonly result: InstallResult };

  // -- Bloqueo --
  'lock:read': { readonly path: string };
  'lock:write': { readonly path: string; readonly entryCount: number };
  'lock:migrate': { readonly fromVersion: number; readonly toVersion: number };

  // -- Git --
  'git:clone:start': { readonly url: string };
  'git:clone:complete': { readonly url: string; readonly path: string; readonly durationMs: number };
  'git:clone:error': { readonly url: string; readonly error: string };

  // -- Detección de agentes --
  'agent:detect:start': Record<string, never>;
  'agent:detect:found': { readonly agent: AgentType; readonly displayName: string };
  'agent:detect:complete': { readonly results: readonly AgentDetectionResult[]; readonly durationMs: number };

  // -- Progreso (genérico) --
  'progress:start': { readonly id: string; readonly message: string; readonly total?: number };
  'progress:update': { readonly id: string; readonly message: string; readonly current?: number };
  'progress:complete': { readonly id: string; readonly message: string };
}

/**
 * Función de cancelación de suscripción devuelta por las suscripciones a eventos.
 */
export type Unsubscribe = () => void;

/**
 * La interfaz del bus de eventos para los consumidores del SDK.
 */
export interface EventBus {
  emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]): void;
  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
}
```

---

## 12. Jerarquía de Errores (`errors/`)

### 12.1 Error Base (`errors/base.ts`)

```typescript
/**
 * Clase base para todos los errores del SDK.
 * Cada error tiene un código para el emparejamiento programático y un mensaje legible por humanos.
 */
export abstract class CognitError extends Error {
  /** Código de error legible por máquina (ej., "PROVIDER_FETCH_ERROR") */
  abstract readonly code: string;

  /** El módulo que produjo este error */
  abstract readonly module: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  /** Representación JSON estructurada */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      module: this.module,
      message: this.message,
      cause: this.cause,
    };
  }
}
```

### 12.2 Errores de Proveedor (`errors/provider.ts`)

```typescript
import { CognitError } from './base.js';

export class ProviderError extends CognitError {
  readonly code = 'PROVIDER_ERROR';
  readonly module = 'providers';

  constructor(
    message: string,
    readonly providerId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class ProviderFetchError extends ProviderError {
  override readonly code = 'PROVIDER_FETCH_ERROR';

  constructor(
    readonly url: string,
    readonly providerId: string,
    readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(`Fallo al obtener de ${providerId}: ${url} (${statusCode ?? 'error de red'})`, providerId, options);
  }
}

export class ProviderMatchError extends ProviderError {
  override readonly code = 'PROVIDER_MATCH_ERROR';
}
```

### 12.3 Errores de Instalación (`errors/install.ts`)

```typescript
import { CognitError } from './base.js';

export class InstallError extends CognitError {
  readonly code = 'INSTALL_ERROR';
  readonly module = 'installer';
}

export class PathTraversalError extends InstallError {
  override readonly code = 'PATH_TRAVERSAL_ERROR';

  constructor(readonly attemptedPath: string) {
    super(`Salto de ruta detectado: ${attemptedPath}`);
  }
}

export class SymlinkError extends InstallError {
  override readonly code = 'SYMLINK_ERROR';

  constructor(
    readonly source: string,
    readonly target: string,
    options?: ErrorOptions,
  ) {
    super(`Fallo al crear symlink: ${source} -> ${target}`, options);
  }
}

export class FileWriteError extends InstallError {
  override readonly code = 'FILE_WRITE_ERROR';

  constructor(readonly filePath: string, options?: ErrorOptions) {
    super(`Fallo al escribir archivo: ${filePath}`, options);
  }
}
```

### 12.4 Errores de Descubrimiento (`errors/discovery.ts`)

```typescript
import { CognitError } from './base.js';

export class DiscoveryError extends CognitError {
  readonly code = 'DISCOVERY_ERROR';
  readonly module = 'discovery';
}

export class ParseError extends DiscoveryError {
  override readonly code = 'PARSE_ERROR';

  constructor(readonly filePath: string, options?: ErrorOptions) {
    super(`Fallo al analizar archivo cognitivo: ${filePath}`, options);
  }
}

export class ScanError extends DiscoveryError {
  override readonly code = 'SCAN_ERROR';

  constructor(readonly directory: string, options?: ErrorOptions) {
    super(`Fallo al escanear directorio: ${directory}`, options);
  }
}
```

### 12.5 Errores de Bloqueo (`errors/lock.ts`)

```typescript
import { CognitError } from './base.js';

export class LockError extends CognitError {
  readonly code = 'LOCK_ERROR';
  readonly module = 'lock';
}

export class LockReadError extends LockError {
  override readonly code = 'LOCK_READ_ERROR';

  constructor(readonly lockPath: string, options?: ErrorOptions) {
    super(`Fallo al leer archivo de bloqueo: ${lockPath}`, options);
  }
}

export class LockWriteError extends LockError {
  override readonly code = 'LOCK_WRITE_ERROR';

  constructor(readonly lockPath: string, options?: ErrorOptions) {
    super(`Fallo al escribir archivo de bloqueo: ${lockPath}`, options);
  }
}

export class LockMigrationError extends LockError {
  override readonly code = 'LOCK_MIGRATION_ERROR';

  constructor(
    readonly fromVersion: number,
    readonly toVersion: number,
    options?: ErrorOptions,
  ) {
    super(`Fallo al migrar archivo de bloqueo de v${fromVersion} a v${toVersion}`, options);
  }
}
```

### 12.6 Errores de Configuración (`errors/config.ts`)

```typescript
import { CognitError } from './base.js';

export class ConfigError extends CognitError {
  readonly code = 'CONFIG_ERROR';
  readonly module = 'config';
}

export class InvalidConfigError extends ConfigError {
  override readonly code = 'INVALID_CONFIG_ERROR';

  constructor(readonly field: string, readonly reason: string) {
    super(`Configuración inválida: ${field} -- ${reason}`);
  }
}
```

### 12.7 Errores de Origen (`errors/source.ts`)

```typescript
import { CognitError } from './base.js';

export class SourceError extends CognitError {
  readonly code = 'SOURCE_ERROR';
  readonly module = 'source';
}

export class SourceParseError extends SourceError {
  override readonly code = 'SOURCE_PARSE_ERROR';

  constructor(readonly rawSource: string, options?: ErrorOptions) {
    super(`Fallo al analizar el origen: "${rawSource}"`, options);
  }
}

export class GitCloneError extends SourceError {
  override readonly code = 'GIT_CLONE_ERROR';

  constructor(
    readonly url: string,
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`Fallo al clonar ${url}: ${reason}`, options);
  }
}
```

### 12.8 Errores de Agente (`errors/agent.ts`)

```typescript
import { CognitError } from './base.js';

export class AgentError extends CognitError {
  readonly code = 'AGENT_ERROR';
  readonly module = 'agents';
}

export class AgentNotFoundError extends AgentError {
  override readonly code = 'AGENT_NOT_FOUND';

  constructor(readonly agentType: string) {
    super(`Agente no encontrado: "${agentType}"`);
  }
}

export class AgentDetectionError extends AgentError {
  override readonly code = 'AGENT_DETECTION_ERROR';

  constructor(readonly agentType: string, options?: ErrorOptions) {
    super(`Fallo al detectar agente: "${agentType}"`, options);
  }
}
```

---

## 13. Mapa de Códigos de Error (para manejo programático)

```typescript
/**
 * Todos los códigos de error posibles en el SDK.
 * Los consumidores pueden usar estos para el manejo de errores estructurado.
 */
export const ERROR_CODES = {
  // Proveedor
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_FETCH_ERROR: 'PROVIDER_FETCH_ERROR',
  PROVIDER_MATCH_ERROR: 'PROVIDER_MATCH_ERROR',

  // Instalador
  INSTALL_ERROR: 'INSTALL_ERROR',
  PATH_TRAVERSAL_ERROR: 'PATH_TRAVERSAL_ERROR',
  SYMLINK_ERROR: 'SYMLINK_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',

  // Descubrimiento
  DISCOVERY_ERROR: 'DISCOVERY_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  SCAN_ERROR: 'SCAN_ERROR',

  // Bloqueo
  LOCK_ERROR: 'LOCK_ERROR',
  LOCK_READ_ERROR: 'LOCK_READ_ERROR',
  LOCK_WRITE_ERROR: 'LOCK_WRITE_ERROR',
  LOCK_MIGRATION_ERROR: 'LOCK_MIGRATION_ERROR',

  // Configuración
  CONFIG_ERROR: 'CONFIG_ERROR',
  INVALID_CONFIG_ERROR: 'INVALID_CONFIG_ERROR',

  // Origen
  SOURCE_ERROR: 'SOURCE_ERROR',
  SOURCE_PARSE_ERROR: 'SOURCE_PARSE_ERROR',
  GIT_CLONE_ERROR: 'GIT_CLONE_ERROR',

  // Agente
  AGENT_ERROR: 'AGENT_ERROR',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_DETECTION_ERROR: 'AGENT_DETECTION_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

---

## 14. Decisiones de Diseño de Tipos

| Decisión | Elección | Racional |
|----------|--------|-----------|
| `CognitiveType` como unión de cadenas | Sí | Generado desde YAML, extensible, sin coste en tiempo de ejecución |
| Tipos marcados para IDs | Sí, para `AgentName`, `CognitiveName`, `SafeName`, `SourceIdentifier` | Evita mezclar tipos de cadena entre dominios |
| `readonly` en todas las propiedades de interfaz | Sí | El SDK devuelve datos inmutables. Las mutaciones pasan por métodos. |
| Jerarquía de errores con base abstracta | Sí | Permite el emparejamiento con `instanceof` mientras fuerza `code` + `module` |
| `Result<T, E>` para fallos esperados | Sí | Explícito, no requiere try/catch, componible |
| Sin `any` en ningún lugar | Estricto | Solo `unknown` en los límites de deserialización JSON, estrechado inmediatamente |
| `Cognitive.type` obligatorio (no opcional) | Sí | El código existente usa `cognitiveType` opcional por defecto como 'skill'. El nuevo SDK lo hace explícito. |
| Separar `CognitiveRef` de `Cognitive` | Sí | Referencias ligeras para eventos y resultados de listas sin cargar el contenido |
| Unión discriminada `InstallRequest` unificada | Sí | Reemplaza 3 funciones de instalación separadas en el código existente |
| Mapas constantes (`const maps`) sobre enums | Sí | Mejor inferencia de tipos, eliminable por tree-shaking, evita problemas de enums de TS |
| `satisfies` para aserciones de constantes | Sí | Asegura que el objeto constante coincida con la forma esperada preservando los tipos literales |
