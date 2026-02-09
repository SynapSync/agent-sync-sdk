# Reporte de Análisis de Synapse-CLI

**Repositorio:** `/Users/rperaza/joicodev/owned/SynapSync/projects/synapse-cli`
**Paquete:** `@synapsync/cli` v0.1.10
**Fecha:** 09-02-2026
**Investigador:** Agente C

---

## 1. Visión Original

### 1.1 Concepto Central: "Plataforma de Orquestación de IA Neural"

Synapse-CLI fue concebida como una **plataforma de gestión cognitiva**: una herramienta similar a un gestor de paquetes para instrucciones de IA (habilidades, agentes, prompts, flujos de trabajo, herramientas) que podían instalarse, organizarse y sincronizarse a través de múltiples proveedores de IA (Claude, OpenAI, Cursor, Windsurf, Copilot, Gemini).

La idea clave era tratar las instrucciones de IA como "cognitivos" de primera clase, versionables y compartibles con:

- Un **registro central** (basado en GitHub, archivos estáticos) para el descubrimiento e instalación.
- Un **sistema de seguimiento basado en manifiesto** (similar a `package.json` + `package-lock.json`).
- **Sincronización basada en enlaces simbólicos** a los directorios de los proveedores (`.claude/`, `.cursor/`, etc.).
- **Múltiples fuentes de instalación**: registro, ruta local, repositorios de GitHub.
- **Configuración basada en YAML** (`synapsync.config.yaml`).

### 1.2 Modelo de Interacción

La CLI soportaba **dos modos de interacción**:

1. **CLI estándar** vía Commander.js (`synapsync init`, `synapsync add`, etc.).
2. **Modo REPL interactivo** (se lanza cuando no se da ningún comando) con sintaxis `/comando`.

El REPL era una característica distintiva: un bucle basado en readline con 17 comandos, parseo de argumentos declarativo, un registro de comandos y un sistema de ayuda. Esto se descompuso de un archivo monolítico de 688 líneas en 8 módulos enfocados (`src/ui/repl/`).

### 1.3 Tipos Cognitivos

Se definieron cinco tipos cognitivos (`src/core/constants.ts:10`):

| Tipo | Archivo | Modo de Sinc. | Descripción |
|------|------|-----------|-------------|
| `skill` | `SKILL.md` | carpeta | Conjuntos de instrucciones reutilizables (pueden tener assets/) |
| `agent` | `AGENT.md` | archivo | Entidades autónomas con comportamientos |
| `prompt` | `PROMPT.md` | archivo | Prompts de plantilla con variables |
| `workflow` | `WORKFLOW.yaml` | archivo | Procesos orquestados de múltiples pasos |
| `tool` | `TOOL.md` | archivo | Integraciones externas |

### 1.4 Soporte de Proveedores

Se apuntó a seis proveedores (`src/core/constants.ts:78-85`):

| Proveedor | Estado | Ruta de Sincronización |
|----------|--------|-----------|
| Claude | Soportado | `.claude/skills/`, `.claude/agents/`, etc. |
| OpenAI | Soportado | `.openai/skills/`, etc. |
| Cursor | Soportado | `.cursor/skills/`, etc. |
| Windsurf | Soportado | `.windsurf/skills/`, etc. |
| Copilot | Soportado | `.github/skills/`, etc. |
| Gemini | Planificado | `.gemini/skills/`, etc. |

Cada proveedor tenía mapeos de rutas por tipo cognitivo (`src/core/constants.ts:89-132`).

---

## 2. Análisis de la Arquitectura

### 2.1 Estructura del Proyecto

```
src/
  index.ts              # Punto de entrada - llama a runCLI()
  cli.ts                # Configuración de Commander.js, 15 comandos registrados
  version.ts            # Versión dinámica desde package.json

  commands/             # 15 implementaciones de comandos de la CLI
    init.ts             # Inicialización del proyecto con @clack/prompts
    add.ts              # Instalar desde registro/local/GitHub (696 líneas)
    list.ts             # Listar cognitivos instalados/remotos
    sync.ts             # Sincronización sistema de archivos-manifiesto-proveedor
    config.ts           # Gestión de configuración YAML
    status.ts           # Visualización del estado del proyecto
    providers.ts        # Habilitar/deshabilitar/ruta de proveedores
    uninstall.ts        # Eliminar cognitivos
    update.ts           # Actualizar cognitivos desde el registro
    doctor.ts           # Verificaciones de salud de diagnóstico
    clean.ts            # Limpieza de caché/huérfanos
    purge.ts            # Eliminación completa de SynapSync
    help.ts             # Visualización de ayuda
    version.ts          # Visualización de versión
    info.ts             # Explicaciones de conceptos

  services/             # Lógica de negocio central
    config/
      manager.ts        # Lectura/escritura de config YAML con acceso dot-notation
      schema.ts         # Validación de config, valores por defecto, utilidades de valores anidados
    registry/
      client.ts         # Cliente HTTP para registro estático alojado en GitHub
    manifest/
      manager.ts        # CRUD de manifest.json, reconciliación
      types.ts          # Tipos de manifiesto
    scanner/
      scanner.ts        # Escáner de sistema de archivos para cognitivos
      parser.ts         # Parser de frontmatter YAML (personalizado, no usa lib yaml)
      types.ts          # Tipos de escáner
    sync/
      engine.ts         # Sinc. de 4 fases: escanear -> comparar -> reconciliar -> enlace simbólico
      types.ts          # Tipos de sincronización
    symlink/
      manager.ts        # Creación de enlace simbólico/copia con fallback de Windows
      types.ts          # Tipos de enlace simbólico
    maintenance/
      doctor.ts         # 8 verificaciones de diagnóstico con auto-reparación
      cleaner.ts        # Limpieza de caché/huérfanos/temporales
      update-checker.ts # Comparación de versiones para actualizaciones
      types.ts          # Tipos de mantenimiento
    cognitive/
      detector.ts       # Estrategia múltiple de detección de tipo cognitivo
      prompter.ts       # Prompts de selección de tipo interactivos
      types.ts          # Tipos de detección
    agents-md/
      generator.ts      # Autogeneración de AGENTS.md con marcadores
      types.ts          # Tipos de generador

  ui/
    banner.ts           # Banner de bienvenida con inicio rápido
    logo.ts             # Logo de arte ASCII
    colors.ts           # Utilidades de color
    repl.ts             # Re-exportaciones de repl/
    repl/
      types.ts          # Def. de tipos de REPL (CommandDef, FlagDef, ParsedArgs)
      arg-parser.ts     # Parser de argumentos declarativo
      registry.ts       # Registro de comandos
      commands.ts       # 17 registros de comandos de REPL
      dispatcher.ts     # Enrutamiento de entrada
      help.ts           # Sistema de ayuda
      loop.ts           # Bucle de eventos de readline
      index.ts          # Barril con importaciones de efectos secundarios

  utils/
    logger.ts           # Logger centralizado con picocolors + spinners ora

  core/
    constants.ts        # Todas las constantes: tipos, rutas, categorías, proveedores

  types/
    index.ts            # Todas las interfaces de TypeScript (267 líneas)
```

**Total de archivos fuente:** 64 archivos `.ts`
**Total de archivos de prueba:** 34 archivos `.test.ts`

### 2.2 Stack de Dependencias

**Dependencias de Ejecución (5):**
| Paquete | Propósito |
|---------|---------|
| `commander` v14 | Framework de CLI / parseo de comandos |
| `@clack/prompts` v1 | Prompts interactivos (asistente de init) |
| `ora` v9 | Spinners de terminal |
| `picocolors` v1 | Salida de color en terminal |
| `yaml` v2 | Parseo de archivos de configuración YAML |

**Dependencias de Desarrollo (8):**
| Paquete | Propósito |
|---------|---------|
| `tsup` v8 | Herramienta de construcción (ESM, entrada única) |
| `typescript` v5.9 | Verificación de tipos |
| `vitest` v4 | Framework de pruebas |
| `@vitest/coverage-v8` | Proveedor de cobertura |
| `eslint` v9 | Linting |
| `@typescript-eslint/*` v8.54 | Reglas de ESLint para TS |
| `eslint-config-prettier` v10 | Compatibilidad con Prettier |
| `prettier` v3.8 | Formateo de código |

**Notable:** Huella de ejecución extremadamente ligera; solo 5 dependencias. Sin dependencias de SDK de IA en producción (esas se consideraron para la idea del Motor de Ejecución).

### 2.3 Configuración de Construcción

**tsup** (`tsup.config.ts`): Entrada ESM única, objetivo Node 20, sourcemaps, generación de DTS, banner shebang.

**TypeScript** (`tsconfig.json`): Máximo modo estricto; todos los flags estrictos habilitados, incluyendo `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`.

**ESLint** (`eslint.config.js`): Extremadamente estricto; sin `any`, reglas `no-unsafe-*`, tipos de retorno explícitos, expresiones booleanas estrictas, detección de promesas flotantes.

### 2.4 Infraestructura de Pruebas

**Vitest** (`vitest.config.ts`): Entorno Node, proveedor de cobertura v8, umbrales de 60% rama / 70% función/línea.

**Cobertura alcanzada:** 80% líneas, 71% ramas, 75% funciones a través de 515 pruebas en 33 archivos. Servicios clave con cobertura del 83-100%.

**La estructura de las pruebas refleja src/:**
```
tests/unit/
  commands/    # Todos los 14 comandos probados
  services/    # Todos los servicios probados
  ui/          # Módulos de Banner, colors, logo, REPL probados
  utils/       # Logger probado
  version.test.ts
```

### 2.5 Patrones Arquitectónicos Clave

1. **Separación Comando-Servicio**: Los comandos en `src/commands/` son envoltorios delgados que parsean opciones y delegan en los servicios.

2. **Patrón de Factoría Estática**: `ConfigManager.findConfig()` sube por los directorios para encontrar la configuración (como git encuentra `.git`).

3. **Motor de Sincronización de 4 Fases** (`src/services/sync/engine.ts`):
   - Fase 1: Escanear el sistema de archivos en busca de cognitivos.
   - Fase 2: Comparar lo escaneado con el manifiesto.
   - Fase 3: Reconciliar el manifiesto (añadir/actualizar/eliminar).
   - Fase 4: Crear enlaces simbólicos en los directorios de los proveedores.

4. **Autogeneración de AGENTS.md**: Inyección de contenido basada en marcadores (`<!-- synapsync:start -->` / `<!-- synapsync:end -->`) que preserva el contenido del usuario fuera de los marcadores.

5. **Detección de Tipos con Estrategia Múltiple** (`src/services/cognitive/detector.ts`): Flag -> Registro -> Archivos locales -> API de GitHub -> Fallback de prompt interactivo.

6. **Callbacks de Progreso**: El motor de sincronización informa del progreso a través de callbacks para retroalimentación en la interfaz de usuario.

---

## 3. Componentes Reutilizables

### 3.1 Componentes de Alto Valor (Reutilización Directa)

| Componente | Ubicación | Líneas | Valor |
|-----------|----------|-------|-------|
| **Utilidad de Logger** | `src/utils/logger.ts` | 175 | Logger listo para producción con iconos, spinners, secciones, etiquetas. Configuración cero. |
| **Parser de argumentos** | `src/ui/repl/arg-parser.ts` | 30 | Elegante parser de flags declarativo. Compacto y bien probado. |
| **Acceso a config dot-notation** | `src/services/config/schema.ts:181-220` | 40 | Utilidades `getNestedValue`/`setNestedValue` para acceso a rutas de objetos. |
| **Parser de frontmatter YAML** | `src/services/scanner/parser.ts` | 155 | El parser personalizado maneja clave:valor, arrays, arrays en línea, comillas. Sin dependencias. |
| **Utilidad de hash de contenido** | `src/services/scanner/scanner.ts:221-223` | 3 | Hash truncado SHA-256 para detección de cambios. |
| **Generador de AGENTS.md** | `src/services/agents-md/generator.ts` | 305 | Patrón de inyección de contenido basado en marcadores. Preserva el contenido del usuario. |
| **Parser de fuente** | `src/services/cognitive/detector.ts:38-72` | 35 | Parsea fuentes `registry:`, `github:`, ruta local, URL. |
| **Formateador de fecha** | `src/commands/list.ts:377-394` | 18 | Formateo de fecha relativa (hoy, ayer, hace N días, hace N semanas). |
| **Formateador de bytes** | `src/commands/clean.ts:165-173` | 9 | Formateo de tamaño de archivo legible para humanos. |

### 3.2 Componentes de Valor Medio (Adaptar/Inspirar)

| Componente | Ubicación | Líneas | Valor |
|-----------|----------|-------|-------|
| **Gestor de enlaces simbólicos** | `src/services/symlink/manager.ts` | 497 | Enlace simbólico/copia con fallback de Windows, verificación, limpieza de huérfanos. Las necesidades de symlink de Cognit difieren, pero el patrón de fallback es valioso. |
| **Validación de config** | `src/services/config/schema.ts:105-171` | 67 | Validación estructural de configuración YAML. El patrón es reutilizable. |
| **Servicio Doctor** | `src/services/maintenance/doctor.ts` | 506 | Framework de diagnóstico con verificaciones reparables. El patrón de arquitectura es sólido. |
| **Sistema REPL** | `src/ui/repl/` | ~300 | REPL modular: registro, despachador, bucle, ayuda. El patrón podría informar al modo interactivo en cognit. |
| **Recuperador de archivos de GitHub** | `src/commands/add.ts:447-461` | 15 | Utilidad de descarga de contenido raw de GitHub. |
| **Instalación de múltiples fuentes** | `src/commands/add.ts` | 696 | Pipeline de instalación de registro/local/GitHub. Complejo pero probado. |

### 3.3 Infraestructura de Pruebas

| Componente | Archivos | Pruebas | Valor |
|-----------|-------|-------|-------|
| Pruebas de comandos | 14 archivos | ~200 | Cobertura completa de comandos con servicios mockeados |
| Pruebas de servicios | 10 archivos | ~200 | Escáner, parser, registro, symlink, manifiesto, motor de sincronización |
| Pruebas de interfaz | 5 archivos | ~50 | Módulos de Banner, colores, logo, REPL |
| Pruebas de utilidades | 1 archivo | ~15 | Logger |

Los patrones de prueba (mockear fs, fetch, process.cwd) son directamente aplicables a las pruebas de cognit.

---

## 4. Análisis de Brechas

### 4.1 Synapse-CLI vs Cognit vs Upstream (Vercel Skills)

| Característica | Synapse-CLI | Cognit (Fork) | Upstream (Vercel Skills) |
|---------|-------------|---------------|--------------------------|
| **Framework de CLI** | Commander.js | Commander.js (del fork) | Probablemente mínimo o ninguno |
| **Tipos Cognitivos** | 5 (skill, agent, prompt, workflow, tool) | Centrado en habilidades (del fork) | Solo habilidades |
| **Soporte de Proveedores** | 6 proveedores (Claude, OpenAI, Cursor, Windsurf, Copilot, Gemini) | TBD | Probablemente un solo proveedor |
| **Registro** | Basado en GitHub con cliente | TBD | ¿estilo npm? |
| **Fuentes de Inst.** | Registro + Local + GitHub | TBD | TBD |
| **Mecanismo Sinc.** | Enlaces simbólicos con fallback de copia, motor de 4 fases | TBD | TBD |
| **Formato Config.** | YAML (`synapsync.config.yaml`) | TBD | TBD |
| **Modo Interactivo** | REPL completo con 17 comandos | TBD | No se espera ninguno |
| **Manifiesto** | Manifiesto JSON con reconciliación | TBD | TBD |
| **Mantenimiento** | comandos doctor, clean, update, purge | TBD | TBD |
| **AGENTS.md** | Autogenerado con marcadores | TBD | Ninguno |
| **Motor de Ejecución** | Propuesto, no implementado | TBD | TBD |
| **Publicación** | Propuesto, no implementado | TBD | TBD |
| **Pruebas** | 515 pruebas, 80% cobertura | TBD | TBD |
| **Rigor de TS** | Máximo (todos los flags estrictos) | TBD | TBD |
| **Dependencias** | 5 dependencias de ejecución | TBD (basado en fork, más pesado) | TBD |
| **Herram. de Const.** | tsup (paquete ESM único) | TBD | TBD |

### 4.2 Matriz de Superposición de Características

| Característica de Synapse-CLI | ¿Presente en Cognit? | ¿Vale la pena portar? | Notas |
|---------------------|-------------------|----------------|-------|
| Sinc. multi-proveedor | Desconocido | SÍ | Diferenciador clave del upstream |
| Cliente de registro | Desconocido | QUIZÁS | Depende de la estrategia de registro |
| Modo interactivo REPL | Desconocido | QUIZÁS | Buena DX pero no esencial |
| Diagnósticos Doctor | Desconocido | SÍ | Verificaciones de salud son universalmente valiosas |
| Generador AGENTS.md | Desconocido | SÍ | Valor añadido único para la organización del proyecto |
| Parser de frontmatter | Desconocido | SÍ | Alternativa ligera y sin dependencias |
| Sistema de tipos cognitivos | Parcialmente | ADAPTAR | 5 tipos vs solo habilidades: decidir alcance |
| Comando Purge | Desconocido | SÍ | Desinstalación limpia es importante |
| Configuración YAML | Desconocido | EVALUAR | vs configuración JSON o JS |
| Gestión de symlinks | Desconocido | SÍ | Mecanismo de sincronización central |
| Instalación desde GitHub | Desconocido | SÍ | Instalación directa desde repo |
| Hash de contenido | Desconocido | SÍ | Detección de cambios para sincronización |

---

## 5. Por qué se quedó corto

### 5.1 Características críticas faltantes

1. **Sin Motor de Ejecución**: Las habilidades se podían instalar y sincronizar, pero no *ejecutar*. Los usuarios todavía necesitaban abrir Claude/Cursor/ChatGPT para usarlas. El Motor de Ejecución se documentó (`docs/ideas/execution-engine.md`) con una arquitectura detallada pero nunca se implementó.

2. **Sin Sistema de Publicación**: Contribuir al registro requería PRs manuales en GitHub. No existía el comando `synapsync publish`. La infraestructura del backend no se construyó.

3. **Sin Fijación de Versiones**: El registro solo almacenaba la última versión de cada cognitivo. No había archivo de bloqueo para instalaciones reproducibles.

4. **Registro limitado**: El registro era un repositorio de GitHub estático (`synapse-registry`). Sin API de búsqueda, sin conteo de descargas, sin resolución de dependencias.

### 5.2 Problemas de Escala y Ecosistema

1. **Problema del arranque en frío**: El registro necesitaba contenido para atraer usuarios, pero necesitaba usuarios para atraer colaboradores. Empezar de cero con un ecosistema personalizado es extremadamente difícil.

2. **Asunciones de rutas de proveedores**: Las rutas de los proveedores hardcodeadas (`src/core/constants.ts:89-132`) asumían estructuras de directorio específicas que podrían no coincidir con las convenciones reales de los proveedores. Por ejemplo, Claude Code usa `.claude/commands/`, no `.claude/skills/`.

3. **Complejidad de los tipos cognitivos**: Cinco tipos cognitivos con diferentes formatos de archivo, modos de sincronización y estrategias de detección añadieron una complejidad significativa. El proyecto Vercel Skills del upstream adopta un enfoque más simple.

### 5.3 Limitaciones Técnicas

1. **Parser de frontmatter personalizado**: El parser de frontmatter YAML hecho a mano (`src/services/scanner/parser.ts`) era funcional pero limitado en comparación con las bibliotecas establecidas. No podía manejar objetos anidados, cadenas multilínea o YAML complejo.

2. **Sin resolución de dependencias**: Los cognitivos no podían declarar dependencias de otros cognitivos. Sin resolución de DAG.

3. **Gestión del estado de sincronización**: La reconciliación del manifiesto se basaba en archivos y podía derivar. Sin garantías transaccionales.

4. **Sin modo Watch**: Sin observador del sistema de archivos para la resincronización automática cuando cambian los cognitivos.

### 5.4 Razones estratégicas para pivotar

La decisión de adoptar el fork de Vercel (cognit) probablemente surgió de:

1. **Ecosistema existente**: Vercel Skills tenía una comunidad y una ruta de adopción existentes.
2. **Modelo más simple**: Solo habilidades (vs 5 tipos cognitivos) reduce la complejidad.
3. **Alineación con la industria**: Siguiendo un patrón establecido (npm para habilidades) en lugar de inventar un nuevo paradigma.
4. **Tiempo de obtención de valor más rápido**: Construir sobre un fork funcional vs. construir todo desde cero.

---

## 6. Lecciones Aprendidas

### 6.1 Buenas decisiones de diseño

1. **Dependencias Ligeras**: Solo 5 dependencias de ejecución. Esto debería mantenerse en cognit. Evitar el hinchazón de dependencias.

2. **Máximo Rigor de TypeScript**: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, etc., detectaron errores reales (por ejemplo, el problema del validador indefinido de `@clack/prompts` v1 en el CHANGELOG).

3. **Separación de la Capa de Servicio**: Clara separación de los comandos (interfaz) de los servicios (lógica). Los comandos son envoltorios delgados. Esto permite las pruebas y la reutilización.

4. **CLI Integral**: Cada comando tenía las opciones `--json`, `--dry-run`, `--verbose`, `--force` donde fuera aplicable. Esta consistencia es una DX excelente.

5. **Descomposición del REPL**: Dividir el REPL de 688 líneas en 8 módulos enfocados fue una buena refactorización. El patrón de parser de argumentos declarativo es elegante.

6. **Doctor/Clean/Purge**: Los comandos de mantenimiento muestran madurez. Los usuarios necesitan formas de diagnosticar, reparar y eliminar herramientas de forma limpia.

7. **AGENTS.md basado en marcadores**: El patrón `<!-- synapsync:start -->` / `<!-- synapsync:end -->` para preservar el contenido del usuario alrededor de las secciones generadas es ingenioso y reutilizable.

8. **Instalación de Múltiples Fuentes**: Soportar el registro, la ruta local y GitHub como fuentes de instalación cubre todos los casos de uso.

### 6.2 Decisiones de diseño a evitar

1. **Demasiados tipos cognitivos demasiado pronto**: Empezar con 5 tipos (skill, agent, prompt, workflow, tool) antes de que ninguno funcionara completamente fue una complejidad prematura. Empezar con un tipo (habilidades) y añadir otros cuando sea necesario.

2. **Registro estático de GitHub**: Usar archivos raw de GitHub como registro es frágil (límites de tasa, sin API de búsqueda, sin autenticación). Si se necesita un registro, usar npm o un backend adecuado.

3. **Parser de frontmatter YAML personalizado**: El parser hecho a mano (`src/services/scanner/parser.ts`) fue una carga de mantenimiento. Usar una biblioteca establecida como `gray-matter`.

4. **Rutas de proveedores hardcodeadas**: Las estructuras de los directorios de los proveedores cambian. Hacer que las rutas sean totalmente configurables desde el principio, no constantes hardcodeadas.

5. **REPL como modo principal**: El REPL fue una inversión de ingeniería significativa que la mayoría de los usuarios de la CLI no usarían. CLI estándar primero, REPL opcional.

6. **Terminología "Cognitiva" ambigua**: El término "cognitivo" no se entiende ampliamente. "Habilidad" (Skill) es más claro y se alinea con la terminología de la industria.

7. **Configuración YAML vs JSON**: La configuración YAML requería una dependencia extra (`yaml` v2). JSON es soportado de forma nativa y suficiente para la mayoría de las necesidades de configuración.

### 6.3 Patrones arquitectónicos a preservar

1. **Patrón de descubrimiento de configuración**: Subir por los directorios para encontrar la configuración (como git). `ConfigManager.findConfig()` en `src/services/config/manager.ts:41-55`.

2. **Patrón de callback de progreso**: `SyncProgressCallback` en el motor de sincronización para actualizaciones de la interfaz no bloqueantes.

3. **Patrón de reconciliación**: La sincronización de 4 fases (escanear -> comparar -> reconciliar -> aplicar) es sólida. La separación de `reconcile()` + `applyReconciliation()` del gestor del manifiesto es limpia.

4. **Jerarquía de clases de error**: Clases de error personalizadas (`RegistryError`, `CognitiveNotFoundError`, `GitHubInstallError`, `ConfigValidationError`) con campos de contexto.

5. **Flujo de trabajo de commits convencionales**: Pipeline de lanzamiento basado en Makefile con aumento de versión, construcción, prueba, etiqueta y push.

---

## 7. Historia del Desarrollo

El CHANGELOG revela un arco de desarrollo bien marcado durante ~2 semanas:

| Versión | Fecha | Enfoque |
|---------|------|-------|
| 0.1.0 | 27-01-2026 | Cimientos: Framework de CLI, comandos centrales, configuración, registro |
| 0.2.0 | 28-01-2026 | Motor de sinc.: manifiesto, escáner, symlinks, comando sync |
| 0.3.0 | 28-01-2026 | Mantenimiento: comandos doctor, clean, update |
| 0.4.0 | 28-01-2026 | Fase 2 de pruebas: 95 pruebas unitarias para servicios centrales |
| 0.5.0 | 06-02-2026 | Expansión de pruebas: 515 pruebas, 80% de cobertura, refactorización de REPL, CI/CD, actualizaciones de dep |

El proyecto alcanzó la preparación para la producción (según `docs/pre-production-review.md`) con ESLint limpio, 80% de cobertura, 0 vulnerabilidades y todos los archivos OSS en su lugar, pero nunca se publicó en npm.

---

## 8. Ideas Futuras (Documentadas pero no construidas)

Se documentaron tres características futuras en `docs/ideas/`:

1. **Motor de Ejecución** (`docs/ideas/execution-engine.md`): Ejecutar cognitivos a través de las APIs de los proveedores directamente desde la CLI. Incluye una arquitectura detallada con adaptadores de proveedores, almacenamiento de credenciales (keytar), streaming, procesamiento por lotes e integración con CI/CD. Esta es la característica más ambiciosa y la que más probablemente diferenciaría a cognit del upstream.

2. **Publicación en el Registro** (`docs/ideas/registry-publishing.md`): Inicio de sesión con GitHub OAuth, comandos directos de publicar/despublicar, API del backend. Coste estimado: $6-26/mes para la infraestructura.

3. **Exportación/Importación** (`docs/ideas/export-import.md`): Exportar e importar configuraciones de proyectos.

---

## 9. Resumen del Inventario de Archivos

| Categoría | Cantidad | Archivos Clave |
|----------|-------|-----------|
| Archivos fuente | 64 | `src/cli.ts`, `src/commands/*.ts`, `src/services/**/*.ts` |
| Archivos de prueba | 34 | `tests/unit/**/*.test.ts` |
| Archivos de config | 6 | `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`, `Makefile` |
| Documentación | 8 | `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/**/*.md` |
| Total líneas TS | ~7,500 | Estimado a través de todos los archivos fuente |
| Total líneas prueba | ~5,000 | Estimado a través de todos los archivos de prueba |

---

## 10. Recomendaciones para la Integración de Cognit

### Portabilidad Obligatoria
- Utilidad de Logger (`src/utils/logger.ts`) -- valor universal.
- Patrón del generador AGENTS.md (`src/services/agents-md/generator.ts`) -- único en el ecosistema SynapSync.
- Framework de verificación de salud/doctor (`src/services/maintenance/doctor.ts`) -- salud del proyecto.
- Comando Purge (`src/commands/purge.ts`) -- desinstalación limpia.

### Debería Portarse (Adaptado)
- Gestión de enlaces simbólicos con fallback (`src/services/symlink/manager.ts`).
- Instalación de múltiples fuentes: registro + local + GitHub (`src/commands/add.ts`).
- Patrón de 4 fases del motor de sincronización (`src/services/sync/engine.ts`).
- Patrón de descubrimiento de configuración (subir por los directorios).
- Hash de contenido para la detección de cambios.

### Considerar Portar
- Sistema REPL (buena DX pero no crítica).
- Patrones de opciones de la CLI (--json, --dry-run, --verbose en todas partes).
- Infraestructura y patrones de prueba.

### No Portar
- Sistema cognitivo de 5 tipos (mantenerlo simple: habilidades primero).
- Cliente de registro estático de GitHub (usar npm o backend adecuado).
- Parser de frontmatter YAML personalizado (usar gray-matter o similar).
- Rutas de proveedores hardcodeadas (hacerlas totalmente configurables).
- Formato de configuración YAML (la configuración JSON o JS/TS es más simple).
