# 10 -- Sistema de Categorías

## 1. Descripción General

Las categorías son departamentos organizativos que agrupan los cognitivos por dominio. Proporcionan una forma amigable para que los humanos organicen, naveguen y filtren la creciente colección de skills, prompts, reglas y agentes. Las categorías son un concepto de primera clase en el SDK: afectan a la estructura de directorios, las claves del archivo de bloqueo y las operaciones de consulta.

Principio clave: **las categorías existen en el directorio central; los directorios de agentes las aplanan**. La mayoría de los agentes de codificación de IA (Claude, Cursor, Codex) no tienen concepto de categorías, por lo que el SDK mapea de forma transparente la jerarquía de categorías a los directorios planos de los agentes.

---

## 2. Qué Son las Categorías

Una categoría es una unidad organizativa con nombre, como un departamento en una empresa. Cada cognitivo pertenece exactamente a una categoría.

Ejemplos de cómo las categorías organizan los cognitivos:

```
.agents/cognit/skills/
  frontend/              <- categoría
    react-19/SKILL.md
    next-app-router/SKILL.md
    css-architecture/SKILL.md
  backend/               <- categoría
    api-design/SKILL.md
    database-patterns/SKILL.md
  planning/              <- categoría
    task-decomposition/SKILL.md
    estimation/SKILL.md
  security/              <- categoría
    owasp-top-10/SKILL.md
```

Sin categorías, un directorio plano con más de 100 cognitivos se vuelve inmanejable. Las categorías proporcionan:

- **Navegabilidad**: `cognit list --category frontend` muestra solo las skills de frontend.
- **Escalabilidad**: cientos de cognitivos organizados en 10-15 grupos manejables.
- **Significado semántico**: la categoría indica a qué dominio sirve un cognitivo.
- **Alineación del equipo**: las categorías se corresponden con los roles del equipo (equipo de frontend, equipo de QA, etc.).

---

## 3. Categorías por Defecto

El SDK se entrega con un conjunto de categorías por defecto. Estas se definen en `config/categories.yaml` y se compilan en tiempo de construcción:

```yaml
# config/categories.yaml
categories:
  - name: general
    description: Cognitivos de propósito general que no encajan en un dominio específico
    isDefault: true

  - name: planning
    description: Planificación de proyectos, descomposición de tareas, estimación

  - name: qa
    description: Garantía de calidad, estrategias de prueba, redacción de pruebas

  - name: growth
    description: Ingeniería de crecimiento, análisis, experimentación, pruebas A/B

  - name: frontend
    description: Desarrollo frontend, UI/UX, diseño de componentes

  - name: backend
    description: Servicios backend, APIs, arquitectura de servidores

  - name: devops
    description: CI/CD, infraestructura, despliegue, monitorización

  - name: security
    description: Seguridad de aplicaciones, auditoría, prevención de vulnerabilidades

  - name: data
    description: Ingeniería de datos, bases de datos, ETL, pipelines analíticos

  - name: mobile
    description: Desarrollo móvil (iOS, Android, React Native, Flutter)

  - name: infra
    description: Infraestructura en la nube, redes, ingeniería de plataformas
```

### 3.1 Categoría por Defecto

La categoría `general` es la predeterminada. Cuando un cognitivo no especifica una categoría (ni en el frontmatter ni a través del flag de la CLI), se asigna a `general`.

---

## 4. Categorías Personalizadas

Los usuarios pueden definir categorías personalizadas en la configuración de su proyecto o en la configuración global.

### 4.1 Categorías Personalizadas a Nivel de Proyecto

En `.agents/cognit/config.json` (o `config.yaml`):

```json
{
  "categories": [
    {
      "name": "ml-ops",
      "description": "Operaciones de aprendizaje automático y despliegue de modelos"
    },
    {
      "name": "design-system",
      "description": "Biblioteca de componentes de UI y design tokens"
    }
  ]
}
```

### 4.2 Categorías Personalizadas a Nivel Global

En `~/.agents/cognit/config.json`:

```json
{
  "categories": [
    {
      "name": "personal",
      "description": "Cognitivos de productividad personal"
    }
  ]
}
```

### 4.3 Orden de Resolución de Categorías

Al resolver las categorías disponibles:

1. **Valores por defecto integrados** (de `config/categories.yaml`).
2. **Personalizadas globales** (de `~/.agents/cognit/config.json`).
3. **Personalizadas del proyecto** (de `.agents/cognit/config.json`).

Las definiciones posteriores con el mismo nombre sobrescriben a las anteriores. Las categorías personalizadas se fusionan con las predeterminadas, no las reemplazan.

---

## 5. Metadatos de la Categoría

### 5.1 Interfaz TypeScript

```typescript
interface CategoryDefinition {
  /** Identificador único (kebab-case). Utilizado en rutas de directorio y claves de bloqueo. */
  name: string;

  /** Descripción legible por humanos de lo que contiene esta categoría. */
  description: string;

  /** Si esta es la categoría por defecto para los cognitivos sin categorizar. */
  isDefault?: boolean;
}
```

### 5.2 Registro de Categorías

```typescript
interface CategoryRegistry {
  /** Obtener todas las categorías disponibles (integradas + personalizadas). */
  getAll(): CategoryDefinition[];

  /** Obtener una categoría por nombre. Devuelve undefined si no se encuentra. */
  get(name: string): CategoryDefinition | undefined;

  /** Verificar si un nombre de categoría es válido (existe en el registro). */
  isValid(name: string): boolean;

  /** Obtener el nombre de la categoría por defecto. */
  getDefault(): string;

  /** Registrar una categoría personalizada. */
  register(category: CategoryDefinition): void;

  /** Cargar categorías desde un archivo de configuración. */
  loadFromConfig(configPath: string): Promise<void>;

  /** Obtener categorías con el recuento de cognitivos (desde el archivo de bloqueo). */
  getWithCounts(
    lockEntries: Record<string, CognitLockEntry>
  ): Array<CategoryDefinition & { count: number }>;
}
```

### 5.3 Implementación

```typescript
class CategoryRegistryImpl implements CategoryRegistry {
  private categories: Map<string, CategoryDefinition> = new Map();
  private defaultCategory: string = 'general';

  constructor(defaults: CategoryDefinition[]) {
    for (const cat of defaults) {
      this.categories.set(cat.name, cat);
      if (cat.isDefault) {
        this.defaultCategory = cat.name;
      }
    }
  }

  getAll(): CategoryDefinition[] {
    return Array.from(this.categories.values());
  }

  get(name: string): CategoryDefinition | undefined {
    return this.categories.get(name);
  }

  isValid(name: string): boolean {
    // Las categorías integradas siempre son válidas; los nombres personalizados son válidos si pasan la sanitización
    return this.categories.has(name) || /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name);
  }

  getDefault(): string {
    return this.defaultCategory;
  }

  register(category: CategoryDefinition): void {
    this.categories.set(category.name, category);
    if (category.isDefault) {
      this.defaultCategory = category.name;
    }
  }

  async loadFromConfig(configPath: string): Promise<void> {
    // Leer y analizar el archivo de configuración
    // Registrar cada categoría personalizada
  }

  getWithCounts(
    lockEntries: Record<string, CognitLockEntry>
  ): Array<CategoryDefinition & { count: number }> {
    const counts = new Map<string, number>();

    for (const entry of Object.values(lockEntries)) {
      const count = counts.get(entry.category) ?? 0;
      counts.set(entry.category, count + 1);
    }

    return this.getAll().map(cat => ({
      ...cat,
      count: counts.get(cat.name) ?? 0,
    }));
  }
}
```

---

## 6. Impacto en la Ruta de Instalación

Las categorías afectan a la ruta canónica central pero NO a la ruta específica por agente.

### 6.1 Ruta Central (con categoría)

```
.agents/cognit/{tipo}/{categoria}/{nombre}/{ARCHIVO}.md
```

Ejemplos:
```
.agents/cognit/skills/frontend/react-19/SKILL.md
.agents/cognit/skills/planning/task-decomposition/SKILL.md
.agents/cognit/prompts/backend/api-design/PROMPT.md
.agents/cognit/rules/security/owasp-top-10/RULE.md
.agents/cognit/agents/devops/ci-pipeline/AGENT.md
```

### 6.2 Ruta del Agente (aplanada, sin categoría)

```
.{agente}/{tipo}/{nombre}/{ARCHIVO}.md
```

Ejemplos:
```
.claude/skills/react-19/SKILL.md          -> ../../.agents/cognit/skills/frontend/react-19/
.claude/skills/task-decomposition/SKILL.md -> ../../.agents/cognit/skills/planning/task-decomposition/
.cursor/skills/react-19/SKILL.md          -> ../../.agents/cognit/skills/frontend/react-19/
```

### 6.3 Por Qué Aplanar

La mayoría de los agentes de codificación de IA tienen una estructura de directorios fija:
- Claude: `.claude/skills/<nombre>/`
- Cursor: `.cursor/skills/<nombre>/`
- Codex: `.codex/skills/<nombre>/`

Ninguno de estos admite un subdirectorio de categoría. Si el SDK creara `.claude/skills/frontend/react-19/`, Claude no lo reconocería. El aplanamiento asegura la compatibilidad con los agentes.

### 6.4 Manejo de Colisiones de Nombres

Debido a que las categorías se aplanan en los directorios de los agentes, dos cognitivos con el mismo nombre en diferentes categorías colisionarían:

- `frontend/button-component/SKILL.md`
- `mobile/button-component/SKILL.md`

El SDK maneja esto:
1. Advirtiendo al usuario durante `add` si se produciría una colisión de nombres.
2. Requiriendo un `--force` explícito para sobrescribir.
3. Guardando ambos en el archivo de bloqueo (claves diferentes: `skill:frontend:button-component` frente a `skill:mobile:button-component`).
4. En el directorio del agente, gana el último instalado (con una advertencia).

---

## 7. Aplanamiento de Categorías

### 7.1 Cuándo Ocurre el Aplanamiento

El aplanamiento ocurre durante el paso de symlink/copia de la instalación. El instalador:

1. Escribe en la ruta canónica: `.agents/cognit/skills/frontend/react-19/`.
2. Crea el symlink en la ruta del agente: `.claude/skills/react-19/` --> ruta canónica.

La categoría (`frontend`) está presente en la ruta canónica pero ausente en la ruta del agente.

### 7.2 Implementación

```typescript
function getAgentPath(
  agent: AgentType,
  cognitiveType: CognitiveType,
  name: string,
  scope: InstallScope,
  projectRoot?: string
): string {
  // La ruta del agente nunca incluye la categoría: siempre plana
  const agentConfig = agents[agent];
  const dirs = agentConfig.dirs[cognitiveType];
  const base = scope === 'global' ? dirs.global : join(projectRoot, dirs.local);
  return join(base, sanitizeName(name));
}

function getCanonicalPath(
  cognitiveType: CognitiveType,
  category: string,
  name: string,
  scope: InstallScope,
  projectRoot?: string
): string {
  // La ruta canónica siempre incluye la categoría
  const base = scope === 'global' ? getGlobalBase() : join(projectRoot, '.agents', 'cognit');
  return join(base, COGNITIVE_SUBDIRS[cognitiveType], sanitizeName(category), sanitizeName(name));
}
```

---

## 8. Configuración

### 8.1 Dónde se Definen las Categorías

| Fuente | Ubicación | Ámbito |
|--------|----------|-------|
| Integradas | `packages/cognit-core/config/categories.yaml` | Compiladas en el SDK en tiempo de construcción |
| Configuración global | `~/.agents/cognit/config.json` | Categorías personalizadas para todo el usuario |
| Configuración del proyecto | `<proyecto>/.agents/cognit/config.json` | Categorías personalizadas específicas del proyecto |
| Frontmatter del cognitivo | `category: frontend` en SKILL.md | Asignación de categoría por cognitivo |

### 8.2 Formato del Archivo de Configuración

```json
{
  "categories": [
    {
      "name": "ml-ops",
      "description": "Operaciones de aprendizaje automático"
    }
  ],
  "defaultCategory": "general"
}
```

### 8.3 Orden de Carga

```typescript
async function loadCategories(projectRoot?: string): Promise<CategoryRegistry> {
  const registry = new CategoryRegistryImpl(BUILT_IN_CATEGORIES);

  // Cargar configuración global
  const globalConfigPath = join(getGlobalBase(), 'config.json');
  if (await exists(globalConfigPath)) {
    await registry.loadFromConfig(globalConfigPath);
  }

  // Cargar configuración del proyecto (sobrescribe la global)
  if (projectRoot) {
    const projectConfigPath = join(projectRoot, '.agents', 'cognit', 'config.json');
    if (await exists(projectConfigPath)) {
      await registry.loadFromConfig(projectConfigPath);
    }
  }

  return registry;
}
```

---

## 9. Asignación de Categorías

### 9.1 Asignación Manual (el Usuario Especifica)

El usuario puede especificar una categoría a través de un flag de la CLI o un prompt interactivo:

```bash
# Vía flag
cognit add owner/repo --category frontend

# Durante el prompt interactivo
# > Seleccione categoría: [frontend, backend, planning, ...]
```

### 9.2 Asignación Automática (Desde los Metadatos)

Si el frontmatter del cognitivo incluye un campo `category`, se utiliza automáticamente:

```markdown
---
name: React 19 Best Practices
category: frontend
---
```

### 9.3 Prioridad de Asignación

1. **Flag de la CLI** (`--category frontend`): prioridad más alta.
2. **Frontmatter del cognitivo** (`category: frontend` en el frontmatter YAML).
3. **Categoría por defecto** (`general`): respaldo.

```typescript
function resolveCategory(
  cliCategory: string | undefined,
  frontmatterCategory: string | undefined,
  registry: CategoryRegistry
): string {
  // El flag de la CLI tiene prioridad
  if (cliCategory) {
    return sanitizeName(cliCategory);
  }

  // Luego el frontmatter
  if (frontmatterCategory) {
    return sanitizeName(frontmatterCategory);
  }

  // Por defecto
  return registry.getDefault();
}
```

---

## 10. Consultas

### 10.1 Listar por Categoría

```typescript
// Listar todos los cognitivos en una categoría
const frontendSkills = await sdk.list({
  category: 'frontend',
});

// Listar todas las categorías con sus recuentos
const categories = sdk.categories.getWithCounts(lockEntries);
// => [{ name: 'frontend', description: '...', count: 5 }, ...]
```

### 10.2 Filtrar por Categoría

```typescript
// Filtrar cognitivos instalados
const results = await lockManager.query({
  category: 'security',
  cognitiveType: 'rule',
});
```

### 10.3 Buscar entre Categorías

```typescript
// Buscar por nombre en todas las categorías
const results = await sdk.list({
  search: 'react',
  // Devuelve coincidencias de cualquier categoría
});
```

### 10.4 Ejemplos de la CLI

```bash
# Listar todas las categorías
cognit categories

# Listar skills en una categoría
cognit list --category frontend

# Listar todas las skills agrupadas por categoría
cognit list --group-by category

# Buscar dentro de una categoría
cognit find react --category frontend

# Mover un cognitivo a una categoría diferente
cognit move react-19 --category ui-framework
```

---

## 11. Integración con el Archivo de Bloqueo

Las categorías están integradas en la clave y en la entrada del archivo de bloqueo:

```json
{
  "entries": {
    "skill:frontend:react-19": {
      "name": "React 19 Best Practices",
      "cognitiveType": "skill",
      "category": "frontend",
      "..."
    }
  }
}
```

### 11.1 Estructura de la Clave

La clave de bloqueo incluye la categoría: `{tipo}:{categoria}:{nombre}`.

Esto significa:
- Mismo nombre de cognitivo en diferentes categorías = diferentes entradas de bloqueo.
- Cambiar la categoría de un cognitivo requiere una eliminación + una nueva adición (nueva clave).
- La operación `move` maneja esto de forma atómica.

### 11.2 Consultas de Categoría en el Archivo de Bloqueo

```typescript
// Obtener todas las entradas de una categoría
function getByCategory(
  entries: Record<string, CognitLockEntry>,
  category: string
): CognitLockEntry[] {
  return Object.values(entries).filter(e => e.category === category);
}

// Obtener estadísticas de categoría
function getCategoryStats(
  entries: Record<string, CognitLockEntry>
): Map<string, { total: number; byType: Record<CognitiveType, number> }> {
  const stats = new Map();

  for (const entry of Object.values(entries)) {
    if (!stats.has(entry.category)) {
      stats.set(entry.category, { total: 0, byType: {} });
    }
    const cat = stats.get(entry.category);
    cat.total++;
    cat.byType[entry.cognitiveType] = (cat.byType[entry.cognitiveType] ?? 0) + 1;
  }

  return stats;
}
```

---

## 12. Resumen de Interfaces TypeScript

```typescript
// ── Definición de Categoría ────────────────────────────

interface CategoryDefinition {
  name: string;
  description: string;
  isDefault?: boolean;
}

// ── Registro de Categorías ──────────────────────────────

interface CategoryRegistry {
  getAll(): CategoryDefinition[];
  get(name: string): CategoryDefinition | undefined;
  isValid(name: string): boolean;
  getDefault(): string;
  register(category: CategoryDefinition): void;
  loadFromConfig(configPath: string): Promise<void>;
  getWithCounts(
    lockEntries: Record<string, CognitLockEntry>
  ): Array<CategoryDefinition & { count: number }>;
}

// ── Categoría en el Frontmatter del Cognitivo ──────────

interface CognitiveFrontmatter {
  name: string;
  description: string;
  version?: string;
  category?: string;    // <-- Asignación de categoría
  tags?: string[];
  author?: string;
  // ... campos específicos del tipo
}

// ── Categoría en la Entrada de Bloqueo ─────────────────

interface CognitLockEntry {
  // ...
  category: string;     // <-- Siempre presente, por defecto 'general'
  // ...
}

// ── Categoría en las Opciones de Instalación ───────────

interface InstallOptions {
  // ...
  category: string;     // <-- Por defecto 'general'
  // ...
}

// ── Consulta de Categoría ──────────────────────────────

interface LockQueryFilter {
  category?: string;
  // ...
}

// ── Configuración de Categoría ─────────────────────────

interface CognitConfig {
  categories?: CategoryDefinition[];
  defaultCategory?: string;
  // ...
}
```

---

## 13. Casos de Borde

| Escenario | Manejo |
|----------|----------|
| Categoría desconocida en el frontmatter | Aceptarla (las categorías personalizadas son abiertas); registrar dinámicamente. |
| Nombre de categoría con caracteres especiales | `sanitizeName()` normaliza a kebab-case. |
| Categoría renombrada después de la instalación | El archivo de bloqueo conserva la categoría antigua; el usuario debe usar `cognit move` para actualizar. |
| Categoría vacía | Por defecto `general`. |
| El directorio de la categoría no tiene cognitivos | Se deja en el disco (los directorios vacíos son inofensivos); `cognit clean` puede eliminarlos. |
| Dos cognitivos, mismo nombre, diferentes categorías | Ambos se instalan en la ubicación canónica con rutas diferentes; el directorio del agente presenta conflicto (el último gana con advertencia). |
| Agente que admite categorías de forma nativa | Futuro: si un agente añade soporte para categorías, el SDK puede crear directorios de agente anidados. |
