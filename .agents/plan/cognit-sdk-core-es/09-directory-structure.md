# 09 -- Estructura de Directorios

## 1. Descripción General

Este documento define tres estructuras de directorios:

1. **Código Fuente del SDK**: cómo se organizan los paquetes `cognit-core` y `cognit-cli` como un monorepo.
2. **Directorios de Tiempo de Ejecución**: qué crea el SDK en el sistema de archivos del usuario cuando se instalan los cognitivos.
3. **Esquemas de Archivos Cognitivos**: el formato del frontmatter para cada tipo de cognitivo.

---

## 2. Estructura del Monorepo

El proyecto está estructurado como un monorepo con dos paquetes bajo `packages/`:

```
cognit-cli/                          # Raíz del repositorio
  package.json                       # Configuración raíz del workspace
  tsconfig.json                      # Configuración raíz de TypeScript (referencias)
  pnpm-workspace.yaml                # Definición del workspace
  .gitignore
  LICENSE
  README.md

  packages/
    cognit-core/                     # Biblioteca núcleo del SDK
      package.json                   # @synapsync/cognit-core
      tsconfig.json
      tsup.config.ts
      vitest.config.ts

      agents/                        # Definiciones YAML de agentes (39+ archivos)
        claude-code.yaml
        cursor.yaml
        codex.yaml
        opencode.yaml
        windsurf.yaml
        copilot-chat.yaml
        ...

      config/                        # Configuración en tiempo de construcción
        cognitive-types.yaml          # Definiciones de CognitiveType
        categories.yaml              # Definiciones de categorías por defecto

      scripts/                       # Generadores de código en tiempo de construcción
        compile-agents.ts            # Registro de agentes YAML -> TypeScript
        validate-agents.ts           # Validación de YAML de agentes

      src/
        index.ts                     # Exportación de barril de la API pública

        types/                       # Definiciones de tipos núcleo
          cognitive.ts               # Cognitive, CognitiveType, CognitiveFile
          agent.ts                   # AgentConfig, AgentType
          provider.ts                # HostProvider, RemoteCognitive
          installer.ts               # InstallOptions, InstallResult
          lock.ts                    # CognitLockFile, CognitLockEntry
          category.ts                # Category, CategoryConfig
          operations.ts              # AddOptions, RemoveOptions, SyncOptions
          events.ts                  # Tipos de eventos del SDK
          errors.ts                  # Enums de códigos de error
          config.ts                  # CognitConfig
          index.ts                   # Re-exportaciones

        agents/                      # Módulo del registro de agentes
          registry.ts                # Búsqueda de agentes, detección
          detection.ts               # detectInstalledAgents()
          paths.ts                   # Resolución de rutas de agentes
          __generated__/             # Generado en tiempo de construcción
            agent-type.ts            # Tipo de unión AgentType
            agents.ts                # Registros completos de configuración de agentes
          index.ts

        discovery/                   # Descubrimiento/escaneo de cognitivos
          scanner.ts                 # Escaneo de sistema de archivos para cognitivos
          parser.ts                  # Análisis de frontmatter (gray-matter)
          plugin-manifest.ts         # Soporte para manifiesto de plugin de Claude
          index.ts

        providers/                   # Proveedores de origen
          registry.ts                # Registro de proveedores (singleton)
          github.ts                  # Proveedor de GitHub
          mintlify.ts                # Proveedor de documentos de Mintlify
          huggingface.ts             # Proveedor de Spaces de HuggingFace
          wellknown.ts               # Proveedor well-known RFC 8615
          direct.ts                  # Proveedor de URL directa
          local.ts                   # Proveedor de sistema de archivos local
          types.ts                   # Interfaz HostProvider
          index.ts

        installer/                   # Motor de instalación
          installer.ts               # Clase Installer principal
          file-ops.ts                # copyDirectory, createSymlink
          paths.ts                   # sanitizeName, isPathSafe, rutas canónicas
          rollback.ts                # Seguimiento de acciones y reversión
          index.ts

        lock/                        # Gestión del archivo de bloqueo
          manager.ts                 # Clase LockFileManager
          migration.ts               # Funciones de migración de versión
          integrity.ts               # Cálculo de hash, verificación
          index.ts

        operations/                  # Operaciones del SDK (la API pública)
          add.ts                     # AddOperation
          remove.ts                  # RemoveOperation
          list.ts                    # ListOperation
          update.ts                  # UpdateOperation
          sync.ts                    # SyncOperation
          check.ts                   # CheckOperation (detección de actualizaciones)
          init.ts                    # InitOperation (andamiaje de nuevo cognitivo)
          doctor.ts                  # DoctorOperation (verificaciones de salud)
          index.ts

        config/                      # Configuración del SDK
          loader.ts                  # Descubrimiento y carga de archivos de configuración
          schema.ts                  # Validación de configuración
          defaults.ts                # Valores de configuración por defecto
          index.ts

        categories/                  # Sistema de categorías
          registry.ts                # Búsqueda y validación de categorías
          defaults.ts                # Definiciones de categorías por defecto
          __generated__/             # Generado en tiempo de construcción
            categories.ts            # Constantes de categorías
          index.ts

        events/                      # Sistema de eventos
          emitter.ts                 # Emisor de eventos tipado
          types.ts                   # Definiciones de tipos de eventos
          index.ts

        errors/                      # Manejo de errores
          base.ts                    # Clase base CognitError
          codes.ts                   # Constantes de códigos de error
          index.ts

        source/                      # Análisis de URL de origen
          parser.ts                  # parseSource() -- detección de URL/ruta
          git.ts                     # Operaciones de clonación de git
          index.ts

      tests/                         # Archivos de prueba (espejo de src/)
        agents/
          registry.test.ts
          detection.test.ts
        discovery/
          scanner.test.ts
          parser.test.ts
        installer/
          installer.test.ts
          file-ops.test.ts
          paths.test.ts
        lock/
          manager.test.ts
          migration.test.ts
        operations/
          add.test.ts
          remove.test.ts
          sync.test.ts
        providers/
          github.test.ts
          wellknown.test.ts
        categories/
          registry.test.ts
        source/
          parser.test.ts

    cognit-cli/                      # Paquete CLI (envoltorio delgado)
      package.json                   # @synapsync/cognit-cli (o solo 'cognit')
      tsconfig.json
      tsup.config.ts
      bin/
        cli.js                       # Entrada shebang: #!/usr/bin/env node

      src/
        index.ts                     # Punto de entrada, enrutamiento de comandos
        commands/                    # Comandos CLI (envoltorios delgados sobre op del SDK)
          add.ts
          remove.ts
          list.ts
          update.ts
          sync.ts
          check.ts
          init.ts
          find.ts
          doctor.ts
        ui/                          # UI específica de la CLI
          banner.ts
          formatters.ts
          prompts.ts                 # Prompts interactivos (@clack/prompts)
          search-multiselect.ts
        utils/
          logger.ts                  # Logger centralizado (picocolors + ora)
```

---

## 3. Salida de Construcción

### 3.1 Construcción de cognit-core

```
packages/cognit-core/
  dist/
    index.mjs                # Bundle ESM (principal)
    index.d.mts              # Declaraciones de TypeScript
```

Publicado como `@synapsync/cognit-core` en npm:

```json
{
  "name": "@synapsync/cognit-core",
  "type": "module",
  "main": "./dist/index.mjs",
  "types": "./dist/index.d.mts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "types": "./dist/index.d.mts"
    }
  },
  "files": ["dist/"]
}
```

### 3.2 Construcción de cognit-cli

```
packages/cognit-cli/
  dist/
    cli.mjs                  # Bundle CLI único
  bin/
    cli.js                   # Envoltorio shebang -> ../dist/cli.mjs
```

Publicado como `cognit` en npm:

```json
{
  "name": "cognit",
  "type": "module",
  "bin": {
    "cognit": "./bin/cli.js"
  },
  "dependencies": {
    "@synapsync/cognit-core": "workspace:*"
  },
  "files": ["dist/", "bin/"]
}
```

### 3.3 Pipeline de Construcción

```
agents/*.yaml + config/*.yaml
        |
        v
  scripts/compile-agents.ts
        |
        v
  src/agents/__generated__/
  src/categories/__generated__/
        |
        v
  tsup (bundle)
        |
        v
  dist/index.mjs + dist/index.d.mts
```

---

## 4. Estructura de Directorios en Tiempo de Ejecución

### 4.1 Nivel de Proyecto

Cuando el SDK instala cognitivos en un proyecto, crea:

```
mi-proyecto/
  .agents/
    cognit/
      .cognit-lock.json              # Archivo de bloqueo (ámbito de proyecto)

      skills/                        # Tipo cognitivo: skills
        frontend/                    # Categoría
          react-19/
            SKILL.md
            assets/
          next-app-router/
            SKILL.md
        planning/
          task-decomposition/
            SKILL.md
        general/                     # Categoría por defecto
          custom-skill/
            SKILL.md

      prompts/                       # Tipo cognitivo: prompts
        backend/
          api-design/
            PROMPT.md
        general/
          code-review/
            PROMPT.md

      rules/                         # Tipo cognitivo: rules
        security/
          owasp-top-10/
            RULE.md

      agents/                        # Tipo cognitivo: agentes
        devops/
          ci-pipeline/
            AGENT.md

  .claude/                           # Agente Claude Code
    skills/
      react-19/        --> ../../.agents/cognit/skills/frontend/react-19/
      next-app-router/ --> ../../.agents/cognit/skills/frontend/next-app-router/
      task-decomposition/ --> ../../.agents/cognit/skills/planning/task-decomposition/
    rules/
      owasp-top-10/    --> ../../.agents/cognit/rules/security/owasp-top-10/

  .cursor/                           # Agente Cursor
    skills/
      react-19/        --> ../../.agents/cognit/skills/frontend/react-19/
    rules/
      owasp-top-10/    --> ../../.agents/cognit/rules/security/owasp-top-10/

  .codex/                            # Agente Codex
    skills/
      react-19/        --> ../../.agents/cognit/skills/frontend/react-19/
```

### 4.2 Nivel Global

```
~/
  .agents/
    cognit/
      .cognit-lock.json              # Archivo de bloqueo (ámbito global)

      skills/
        frontend/
          react-19/
            SKILL.md
        planning/
          task-decomposition/
            SKILL.md

      prompts/
        backend/
          api-design/
            PROMPT.md

  .claude/                           # Claude Code global
    skills/
      react-19/        --> ../.agents/cognit/skills/frontend/react-19/

  .cursor/                           # Cursor global (si es compatible)
    skills/
      react-19/        --> ../.agents/cognit/skills/frontend/react-19/
```

### 4.3 Convenciones Clave

| Convención | Valor |
|------------|-------|
| Directorio base central | `.agents/cognit/` |
| Nombre del archivo de bloqueo | `.cognit-lock.json` |
| Subdirectorios de tipo | `skills/`, `prompts/`, `rules/`, `agents/` |
| Subdirectorios de categoría | `frontend/`, `backend/`, `planning/`, `general/`, etc. |
| Nombres de archivos cognitivos | `SKILL.md`, `PROMPT.md`, `RULE.md`, `AGENT.md` |
| Categoría por defecto | `general` |
| Dirección del symlink | Dir del agente --> Dir canónico central |

---

## 5. Esquemas de Archivos Cognitivos

### 5.1 SKILL.md

```markdown
---
name: React 19 Best Practices
description: Patrones modernos de React utilizando características de React 19
version: 1.2.0
category: frontend
tags:
  - react
  - typescript
  - frontend
author: SynapSync
globs:
  - "**/*.tsx"
  - "**/*.jsx"
---

# React 19 Best Practices

Instrucciones para el agente de IA sobre cómo escribir código moderno de React 19...

## Server Components
...

## Actions
...
```

**Frontmatter obligatorio:**
- `name` (string) -- nombre para mostrar
- `description` (string) -- descripción breve

**Frontmatter opcional:**
- `version` (string) -- versión semver
- `category` (string) -- sobrescritura de categoría (por defecto basada en el directorio)
- `tags` (string[]) -- etiquetas de búsqueda
- `author` (string) -- nombre del autor
- `globs` (string[]) -- patrones de archivos a los que se aplica esta skill
- `alwaysApply` (boolean) -- si es true, siempre activo

### 5.2 PROMPT.md

```markdown
---
name: API Design Prompt
description: Plantilla para diseñar APIs RESTful
version: 1.0.0
category: backend
tags:
  - api
  - rest
  - design
author: SynapSync
variables:
  - name: resourceName
    description: El nombre del recurso de la API
    required: true
  - name: httpMethods
    description: Métodos HTTP compatibles
    default: "GET, POST, PUT, DELETE"
---

# API Design Prompt

Diseñar una API RESTful para el recurso {{resourceName}}...
```

**Frontmatter adicional (específico de prompts):**
- `variables` (Variable[]) -- variables de plantilla con nombre, descripción, obligatoriedad y valor por defecto.

### 5.3 RULE.md

```markdown
---
name: OWASP Top 10 Rules
description: Reglas de seguridad basadas en OWASP Top 10
version: 2.0.1
category: security
tags:
  - security
  - owasp
author: SynapSync
severity: error
alwaysApply: true
globs:
  - "**/*.ts"
  - "**/*.js"
---

# OWASP Top 10 Rules

Siga siempre estas reglas de seguridad al escribir código...

## Prevención de Inyección SQL
...

## Prevención de XSS
...
```

**Frontmatter adicional (específico de reglas):**
- `severity` (string) -- `error`, `warning`, `info`.
- `alwaysApply` (boolean) -- si es true, la regla está siempre activa.

### 5.4 AGENT.md

```markdown
---
name: CI Pipeline Agent
description: Agente especializado en la configuración de pipelines de CI/CD
version: 1.0.0
category: devops
tags:
  - ci
  - cd
  - devops
  - github-actions
author: SynapSync
capabilities:
  - pipeline-design
  - yaml-generation
  - testing-strategy
---

# CI Pipeline Agent

Usted es un ingeniero experto en CI/CD...

## Comportamiento
...

## Restricciones
...
```

**Frontmatter adicional (específico de agentes):**
- `capabilities` (string[]) -- qué puede hacer este agente persona.

---

## 6. .gitignore

### 6.1 .gitignore raíz

```gitignore
# Dependencias
node_modules/

# Salida de construcción
dist/

# Archivos generados
packages/cognit-core/src/agents/__generated__/
packages/cognit-core/src/categories/__generated__/

# SO
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo

# Pruebas
coverage/

# Entorno
.env
.env.local
```

### 6.2 .gitignore del proyecto (para usuarios del SDK)

El SDK genera/sugiere esto para proyectos que usan cognit:

```gitignore
# Cognit - NO edite estos archivos directamente, use `cognit add/remove`
# El archivo de bloqueo debe incluirse en el commit para instalaciones reproducibles
# Los directorios de agentes contienen symlinks gestionados por cognit

# Mantener archivo de bloqueo
!.agents/cognit/.cognit-lock.json

# Symlinks de agentes (regenerados por `cognit sync`)
# Descomente los agentes que utiliza:
# .claude/skills/
# .cursor/skills/
# .codex/skills/
```

---

## 7. Estructura de Publicación en npm

### 7.1 cognit-core (publicado)

```
@synapsync/cognit-core/
  dist/
    index.mjs
    index.d.mts
  package.json
  README.md
  LICENSE
```

### 7.2 cognit-cli (publicado)

```
cognit/
  dist/
    cli.mjs
  bin/
    cli.js
  package.json
  README.md
  LICENSE
```

---

## 8. Configuración de TypeScript

### 8.1 tsconfig.json raíz

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "references": [
    { "path": "packages/cognit-core" },
    { "path": "packages/cognit-cli" }
  ]
}
```

### 8.2 tsconfig.json de cognit-core

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 8.3 tsconfig.json de cognit-cli

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"],
  "references": [
    { "path": "../cognit-core" }
  ]
}
```

---

## 9. Relación con las Bases de Código Existentes

### 9.1 De cognit (fork)

| Ubicación Actual | Ubicación en el SDK | Cambios |
|-----------------|--------------|---------|
| `src/services/installer/` | `packages/cognit-core/src/installer/` | Añadir conocimiento de categorías, reversión, seguimiento de acciones |
| `src/services/lock/` | `packages/cognit-core/src/lock/` | Añadir bloqueo de ámbito de proyecto, claves compuestas, API de consulta |
| `src/services/discovery/` | `packages/cognit-core/src/discovery/` | Sin cambios mayores |
| `src/services/registry/` | `packages/cognit-core/src/agents/` | Renombrar a `agents/`, mantener sistema de compilación YAML |
| `src/services/source/` | `packages/cognit-core/src/source/` | Sin cambios mayores |
| `src/providers/` | `packages/cognit-core/src/providers/` | Añadir proveedor local |
| `src/core/types.ts` | `packages/cognit-core/src/types/` | Dividir en archivos enfocados |
| `src/commands/` | `packages/cognit-cli/src/commands/` | Envoltorios delgados sobre operaciones del SDK |
| `src/ui/` | `packages/cognit-cli/src/ui/` | Específico de la CLI, no en el núcleo |
| `agents/*.yaml` | `packages/cognit-core/agents/` | Misma ubicación, mismo formato |
| `scripts/` | `packages/cognit-core/scripts/` | Mismos scripts de construcción |

### 9.2 De synapse-cli

| Componente de synapse-cli | Adopción en el SDK | Notas |
|----------------------|--------------|-------|
| Motor de sincronización de 4 fases | `packages/cognit-core/src/operations/sync.ts` | Patrón adaptado |
| Gestor de symlinks con respaldo | `packages/cognit-core/src/installer/file-ops.ts` | Fusionado con el enfoque de cognit |
| Verificaciones de salud doctor | `packages/cognit-core/src/operations/doctor.ts` | Patrón adaptado |
| Descubrimiento de configuración ascendente | `packages/cognit-core/src/config/loader.ts` | Portado directamente |
| Generador de AGENTS.md | Operación futura | No en v1 |
