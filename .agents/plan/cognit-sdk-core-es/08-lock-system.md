# 08 -- Sistema de Archivo de Bloqueo

## 1. Descripción General

El archivo de bloqueo es la única fuente de verdad sobre qué cognitivos están instalados. Rastrea el origen de cada cognitivo instalado, su versión, el hash de integridad, la categoría, los agentes de destino y las marcas de tiempo. El archivo de bloqueo permite:

- **Detección de actualizaciones**: comparando los hashes instalados con las fuentes remotas.
- **Detección de desviaciones**: verificando que el sistema de archivos coincida con las expectativas del bloqueo.
- **Instalaciones reproducibles**: reinstalando exactamente las mismas versiones.
- **Pista de auditoría**: cuándo se instaló/actualizó cada cognitivo y desde dónde.

---

## 2. Ubicación del Archivo de Bloqueo

### 2.1 Bloqueo a Nivel de Proyecto

```
<raiz-del-proyecto>/.agents/cognit/.cognit-lock.json
```

Rastrea los cognitivos instalados en el ámbito del proyecto. Se incluye en el control de versiones para que los miembros del equipo compartan las mismas versiones de los cognitivos.

### 2.2 Bloqueo a Nivel Global

```
~/.agents/cognit/.cognit-lock.json          # macOS
~/.local/share/cognit/.cognit-lock.json     # Linux (XDG)
%APPDATA%\cognit\.cognit-lock.json          # Windows
```

Rastrea los cognitivos instalados en el ámbito global. No está bajo control de versiones.

### 2.3 Migración desde Formatos Anteriores

El SDK migra los archivos de bloqueo antiguos en la primera lectura:

| Archivo Antiguo | Origen | Migración |
|----------|--------|-----------|
| `.skill-lock.json` | upstream de vercel-labs/skills | Renombrar a `.cognit-lock.json` |
| `.synk-lock.json` | cognit v1 (cuando se llamaba synk) | Renombrar a `.cognit-lock.json` |
| `synapsync.lock` | synapse-cli | Analizar y convertir el esquema |

---

## 3. Esquema JSON

### 3.1 Esquema Completo del Archivo de Bloqueo

```typescript
interface CognitLockFile {
  /** Versión del esquema. Actual: 5. Usada para la detección de migración. */
  version: 5;

  /** Mapa de entradas cognitivas, indexadas por identificador único: "{tipo}:{categoria}:{nombre}" */
  entries: Record<string, CognitLockEntry>;

  /** Metadatos sobre el propio archivo de bloqueo */
  metadata: LockMetadata;
}

interface LockMetadata {
  /** Marca de tiempo ISO de cuándo se creó este archivo de bloqueo */
  createdAt: string;

  /** Marca de tiempo ISO de la última modificación */
  updatedAt: string;

  /** Versión del SDK que escribió este archivo por última vez */
  sdkVersion: string;

  /** Últimos agentes seleccionados (para recordar las preferencias del usuario) */
  lastSelectedAgents?: string[];

  /** Prompts descartados (find-skills, etc.) */
  dismissedPrompts?: Record<string, boolean>;
}
```

### 3.2 Esquema de la Entrada de Bloqueo

```typescript
interface CognitLockEntry {
  /** Nombre para mostrar legible por humanos del frontmatter del cognitivo */
  name: string;

  /** El tipo de cognitivo: 'skill' | 'prompt' | 'rule' | 'agent' */
  cognitiveType: CognitiveType;

  /** Categoría bajo la cual se organiza el cognitivo */
  category: string;

  /** ── Información del Origen ── */

  /** Identificador de origen normalizado (ej., "owner/repo", "mintlify/bun.com") */
  source: string;

  /** El tipo de proveedor/origen */
  sourceType: CognitiveSourceType;

  /** La URL original utilizada para instalar (para volver a obtener) */
  sourceUrl: string;

  /** Subruta dentro del repositorio de origen, si corresponde */
  sourcePath?: string;

  /** ── Versión e Integridad ── */

  /** SHA del commit de Git en el momento de la instalación */
  commitSha?: string;

  /** Versión semver si el origen la proporciona */
  version?: string;

  /** SHA del árbol de Git para la carpeta del cognitivo (para detección de actualizaciones) */
  folderHash: string;

  /** Hash SHA-256 del contenido del archivo cognitivo principal */
  contentHash: string;

  /** ── Estado de la Instalación ── */

  /** Modo de instalación utilizado */
  installMode: InstallMode;

  /** Ámbito de la instalación */
  installScope: InstallScope;

  /** Lista de agentes en los que está instalado este cognitivo */
  installedAgents: AgentType[];

  /** Ruta canónica en el sistema de archivos (relativa a la raíz del proyecto o base global) */
  canonicalPath: string;

  /** ── Marcas de Tiempo ── */

  /** Marca de tiempo ISO de la primera instalación */
  installedAt: string;

  /** Marca de tiempo ISO de la última actualización */
  updatedAt: string;
}

/** Tipos de origen para los cognitivos */
type CognitiveSourceType =
  | 'github'
  | 'gitlab'
  | 'local'
  | 'registry'
  | 'mintlify'
  | 'huggingface'
  | 'wellknown'
  | 'direct-url';
```

---

## 4. Ejemplo de Archivo de Bloqueo

```json
{
  "version": 5,
  "entries": {
    "skill:frontend:react-19": {
      "name": "React 19 Best Practices",
      "cognitiveType": "skill",
      "category": "frontend",
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "sourceUrl": "https://github.com/vercel-labs/agent-skills",
      "sourcePath": "skills/react-19",
      "commitSha": "a1b2c3d4e5f6789012345678901234567890abcd",
      "version": null,
      "folderHash": "8f14e45fceea167a5a36dedd4bea2543",
      "contentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code", "cursor", "codex"],
      "canonicalPath": "skills/frontend/react-19",
      "installedAt": "2026-02-05T14:30:00.000Z",
      "updatedAt": "2026-02-08T09:15:00.000Z"
    },
    "skill:planning:task-decomposition": {
      "name": "Task Decomposition",
      "cognitiveType": "skill",
      "category": "planning",
      "source": "synapsync/cognitive-library",
      "sourceType": "github",
      "sourceUrl": "https://github.com/synapsync/cognitive-library",
      "sourcePath": "skills/task-decomposition",
      "commitSha": "b2c3d4e5f67890123456789012345678901abcde",
      "version": "1.2.0",
      "folderHash": "7c211433f02024a5b5903e59c8f7f92f",
      "contentHash": "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code"],
      "canonicalPath": "skills/planning/task-decomposition",
      "installedAt": "2026-02-06T10:00:00.000Z",
      "updatedAt": "2026-02-06T10:00:00.000Z"
    },
    "prompt:backend:api-design": {
      "name": "API Design Prompt",
      "cognitiveType": "prompt",
      "category": "backend",
      "source": "local",
      "sourceType": "local",
      "sourceUrl": "/Users/dev/my-prompts/api-design",
      "sourcePath": null,
      "commitSha": null,
      "version": null,
      "folderHash": "",
      "contentHash": "abc123def456789012345678901234567890abcdef1234567890abcdef12345678",
      "installMode": "copy",
      "installScope": "global",
      "installedAgents": ["claude-code", "cursor", "opencode"],
      "canonicalPath": "prompts/backend/api-design",
      "installedAt": "2026-02-07T16:45:00.000Z",
      "updatedAt": "2026-02-07T16:45:00.000Z"
    },
    "rule:security:owasp-top-10": {
      "name": "OWASP Top 10 Rules",
      "cognitiveType": "rule",
      "category": "security",
      "source": "synapsync/security-rules",
      "sourceType": "github",
      "sourceUrl": "https://github.com/synapsync/security-rules",
      "sourcePath": "rules/owasp-top-10",
      "commitSha": "c3d4e5f678901234567890123456789012abcdef0",
      "version": "2.0.1",
      "folderHash": "6512bd43d9caa6e02c990b0a82652dca",
      "contentHash": "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code", "cursor", "windsurf", "copilot-chat"],
      "canonicalPath": "rules/security/owasp-top-10",
      "installedAt": "2026-02-03T08:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    },
    "agent:devops:ci-pipeline": {
      "name": "CI Pipeline Agent",
      "cognitiveType": "agent",
      "category": "devops",
      "source": "mintlify/devops.example.com",
      "sourceType": "mintlify",
      "sourceUrl": "https://devops.example.com/.well-known/skills/ci-pipeline",
      "sourcePath": null,
      "commitSha": null,
      "version": null,
      "folderHash": "",
      "contentHash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code"],
      "canonicalPath": "agents/devops/ci-pipeline",
      "installedAt": "2026-02-08T11:30:00.000Z",
      "updatedAt": "2026-02-08T11:30:00.000Z"
    }
  },
  "metadata": {
    "createdAt": "2026-02-03T08:00:00.000Z",
    "updatedAt": "2026-02-09T12:00:00.000Z",
    "sdkVersion": "1.0.0",
    "lastSelectedAgents": ["claude-code", "cursor"],
    "dismissedPrompts": {
      "findSkillsPrompt": true
    }
  }
}
```

---

## 5. Operaciones CRUD

### 5.1 Interfaz TypeScript

```typescript
interface LockFileManager {
  /** Leer el archivo de bloqueo. Devuelve una estructura vacía si no se encuentra. */
  read(scope: InstallScope, projectRoot?: string): Promise<CognitLockFile>;

  /** Escribir el archivo de bloqueo de forma atómica (temporal + renombrar). */
  write(lock: CognitLockFile, scope: InstallScope, projectRoot?: string): Promise<void>;

  /** Añadir o actualizar una única entrada. */
  upsert(
    key: string,
    entry: CognitLockEntry,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<void>;

  /** Eliminar una entrada por su clave. Devuelve true si la entrada existía. */
  remove(
    key: string,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<boolean>;

  /** Obtener una única entrada por su clave. Devuelve null si no se encuentra. */
  get(
    key: string,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<CognitLockEntry | null>;

  /** Obtener todas las entradas. */
  getAll(
    scope: InstallScope,
    projectRoot?: string
  ): Promise<Record<string, CognitLockEntry>>;

  /** Consultar entradas mediante criterios de filtrado. */
  query(
    filter: LockQueryFilter,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<CognitLockEntry[]>;

  /** Obtener entradas agrupadas por origen (para operaciones de actualización por lotes). */
  getBySource(
    scope: InstallScope,
    projectRoot?: string
  ): Promise<Map<string, { names: string[]; entry: CognitLockEntry }>>;

  /** Obtener la ruta del archivo de bloqueo para el ámbito dado. */
  getLockFilePath(scope: InstallScope, projectRoot?: string): string;

  /** Verificar si existe un archivo de bloqueo. */
  exists(scope: InstallScope, projectRoot?: string): Promise<boolean>;
}

interface LockQueryFilter {
  cognitiveType?: CognitiveType;
  category?: string;
  sourceType?: CognitiveSourceType;
  agent?: AgentType;
  installedBefore?: Date;
  installedAfter?: Date;
}
```

### 5.2 Generación de Claves

Las claves de las entradas del archivo de bloqueo siguen el patrón `{tipo}:{categoria}:{nombre}`:

```typescript
function makeLockKey(cognitiveType: CognitiveType, category: string, name: string): string {
  return `${cognitiveType}:${sanitizeName(category)}:${sanitizeName(name)}`;
}

// Ejemplos:
// "skill:frontend:react-19"
// "prompt:backend:api-design"
// "rule:security:owasp-top-10"
// "agent:devops:ci-pipeline"
```

Esta estructura de claves asegura la unicidad entre tipos y categorías, manteniendo al mismo tiempo la legibilidad para los humanos.

---

## 6. Detección de Actualizaciones

### 6.1 Comparación de SHA de GitHub

Para los cognitivos con origen en GitHub, el SDK compara el `folderHash` instalado con el SHA del árbol actual:

```typescript
async function checkForUpdates(
  entries: CognitLockEntry[]
): Promise<UpdateCheckResult[]> {
  const results: UpdateCheckResult[] = [];
  const token = getGitHubToken(); // GITHUB_TOKEN, GH_TOKEN, o `gh auth token`

  // Agrupar por origen para minimizar las llamadas a la API
  const bySource = groupBy(entries, e => e.source);

  for (const [source, sourceEntries] of bySource) {
    if (sourceEntries[0].sourceType !== 'github') continue;

    // Obtener el árbol completo en una sola llamada a la API
    const tree = await fetchGitHubTree(source, token);
    if (!tree) continue;

    for (const entry of sourceEntries) {
      const currentHash = findTreeHash(tree, entry.sourcePath);
      if (currentHash && currentHash !== entry.folderHash) {
        results.push({
          key: makeLockKey(entry.cognitiveType, entry.category, entry.name),
          entry,
          currentHash,
          hasUpdate: true,
        });
      }
    }
  }

  return results;
}
```

### 6.2 Comparación Semver

Si un cognitivo proporciona un campo `version` (del frontmatter), el SDK puede comparar utilizando semver:

```typescript
function hasNewerVersion(installed: string, remote: string): boolean {
  // Comparación semver simple sin una biblioteca semver completa
  const parse = (v: string) => v.split('.').map(Number);
  const [iMajor, iMinor, iPatch] = parse(installed);
  const [rMajor, rMinor, rPatch] = parse(remote);

  if (rMajor > iMajor) return true;
  if (rMajor === iMajor && rMinor > iMinor) return true;
  if (rMajor === iMajor && rMinor === iMinor && rPatch > iPatch) return true;
  return false;
}
```

### 6.3 Comparación de Hash de Contenido

Para los orígenes locales donde no están disponibles los SHA de git, el SDK calcula el SHA-256 del contenido del archivo cognitivo principal y lo compara:

```typescript
function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}
```

### 6.4 Tiempo de Modificación

Como último recurso cuando no hay un hash disponible (ej., fuentes de archivos locales), el SDK verifica el `mtime`:

```typescript
async function hasFileChanged(path: string, lastKnownMtime: string): Promise<boolean> {
  const stats = await stat(path);
  return stats.mtime.toISOString() !== lastKnownMtime;
}
```

### 6.5 Prioridad de Detección

1. **Git tree SHA**: el más fiable para orígenes GitHub/GitLab.
2. **Semver**: si el origen proporciona metadatos de versión.
3. **Hash de contenido**: para cualquier tipo de origen.
4. **Tiempo de modificación**: último recurso para archivos locales.

---

## 7. Migración

### 7.1 Incrementos de Versión

El archivo de bloqueo incluye un campo `version`. Al leer, el SDK verifica la versión y migra si es necesario:

```typescript
const CURRENT_LOCK_VERSION = 5;

async function readWithMigration(lockPath: string): Promise<CognitLockFile> {
  const raw = await readFile(lockPath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (typeof parsed.version !== 'number') {
    return createEmptyLockFile();
  }

  // Migraciones específicas por versión
  if (parsed.version < 4) {
    // Pre-v4: tenía la clave 'skills' en lugar de 'cognitives'/'entries'
    return migrateFromV3(parsed);
  }

  if (parsed.version === 4) {
    // v4 -> v5: cognitives -> entries, añadir categoría, añadir bloque de metadatos
    return migrateFromV4(parsed);
  }

  return parsed as CognitLockFile;
}
```

### 7.2 Funciones de Migración

```typescript
function migrateFromV4(old: CognitLockFileV4): CognitLockFile {
  const entries: Record<string, CognitLockEntry> = {};

  for (const [name, entry] of Object.entries(old.cognitives)) {
    const cognitiveType = entry.cognitiveType || 'skill';
    const category = 'general'; // v4 no tenía categorías
    const key = `${cognitiveType}:${category}:${name}`;

    entries[key] = {
      name,
      cognitiveType,
      category,
      source: entry.source,
      sourceType: entry.sourceType as CognitiveSourceType,
      sourceUrl: entry.sourceUrl,
      sourcePath: entry.cognitivePath,
      commitSha: undefined,
      version: undefined,
      folderHash: entry.cognitiveFolderHash,
      contentHash: '',
      installMode: 'symlink',
      installScope: 'global', // v4 era solo global
      installedAgents: old.lastSelectedAgents || [],
      canonicalPath: `${COGNITIVE_SUBDIRS[cognitiveType]}/${category}/${name}`,
      installedAt: entry.installedAt,
      updatedAt: entry.updatedAt,
    };
  }

  return {
    version: CURRENT_LOCK_VERSION,
    entries,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sdkVersion: SDK_VERSION,
      lastSelectedAgents: old.lastSelectedAgents,
      dismissedPrompts: old.dismissed
        ? { findSkillsPrompt: old.dismissed.findSkillsPrompt ?? false }
        : undefined,
    },
  };
}
```

### 7.3 Compatibilidad con Versiones Anteriores

- El SDK siempre escribe el formato de la versión más reciente.
- Los archivos de bloqueo antiguos se migran en el lugar en la primera lectura.
- Si la migración falla, el SDK crea un nuevo archivo de bloqueo vacío y registra una advertencia.
- El archivo antiguo se respalda como `.cognit-lock.json.bak` antes de la migración.

---

## 8. Resolución de Conflictos

### 8.1 Desacuerdo entre el Bloqueo y el Sistema de Archivos

Cuando el bloqueo indica que un cognitivo está instalado pero el sistema de archivos no está de acuerdo:

| Escenario | Detección | Resolución |
|----------|-----------|------------|
| El bloqueo tiene la entrada, falta el dir canónico | `stat()` falla | Marcar entrada como `huérfana`; `sync` reinstala o elimina del bloqueo |
| El bloqueo tiene la entrada, el symlink está roto | El destino de `readlink()` no existe | `sync` vuelve a crear el symlink |
| Falta la entrada en el bloqueo, el cognitivo existe | El escaneo de FS encuentra un cognitivo no bloqueado | `sync` lo añade al bloqueo o advierte |
| El hash del bloqueo difiere del sistema de archivos | Discrepancia de `contentHash` | `sync` actualiza el hash del bloqueo |

### 8.2 La Operación `doctor`

La operación doctor audita la consistencia entre el bloqueo y el sistema de archivos:

```typescript
interface DoctorResult {
  healthy: string[];     // Entradas donde el bloqueo coincide con el sistema de archivos
  orphaned: string[];    // Entradas de bloqueo con archivos faltantes
  unlocked: string[];    // Archivos presentes pero no en el bloqueo
  broken: string[];      // Symlinks rotos
  hashMismatch: string[]; // El hash de contenido no coincide
  fixable: string[];     // Problemas que se pueden corregir automáticamente
}
```

---

## 9. Escrituras Atómicas

Todas las escrituras del archivo de bloqueo utilizan el patrón de archivo temporal y renombrado para evitar la corrupción:

```typescript
async function writeLockFileAtomic(
  lockPath: string,
  lock: CognitLockFile
): Promise<void> {
  // Asegurar que el directorio existe
  await mkdir(dirname(lockPath), { recursive: true });

  // Escribir primero en el archivo temporal
  const tempPath = lockPath + '.tmp.' + process.pid;
  const content = JSON.stringify(lock, null, 2) + '
';

  try {
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, lockPath); // Atómico en POSIX
  } catch (error) {
    // Limpiar archivo temporal en caso de fallo
    try { await rm(tempPath, { force: true }); } catch {}
    throw error;
  }
}
```

En los sistemas POSIX, `rename()` es atómico: el archivo de bloqueo nunca está en un estado parcialmente escrito. En Windows, `rename()` puede no ser totalmente atómico, pero el enfoque del archivo temporal sigue proporcionando seguridad contra bloqueos.

---

## 10. Referencia del Código Existente

El sistema de archivos de bloqueo de cognit actual reside en `src/services/lock/lock-file.ts` (450 LOC). Diferencias clave en el rediseño del SDK:

| Actual | Rediseño del SDK |
|---------|--------------|
| Archivo de bloqueo solo global en `~/.agents/.cognit-lock.json` | Archivos de bloqueo tanto de proyecto como globales |
| Clave plana: nombre del cognitivo | Clave compuesta: `tipo:categoria:nombre` |
| Sin categorías | Campo de categoría por entrada |
| Clave de nivel superior `cognitives` | Clave de nivel superior `entries` |
| Sin hash de contenido | `contentHash` (SHA-256) por entrada |
| Sin SHA de commit | `commitSha` para fuentes git |
| Sin bloque de metadatos | Bloque `metadata` con marcas de tiempo, versión del SDK |
| Sin API de consulta/filtrado | `query()` estructurado con criterios de filtrado |
| API funcional (funciones independientes) | Clase `LockFileManager` con parámetro de ámbito |
| Sin respaldo al migrar | Respaldo `.bak` antes de la migración |
| Versión 4 | Versión 5 |
