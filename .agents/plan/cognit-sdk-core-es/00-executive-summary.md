# 00 - Resumen Ejecutivo: Cognit SDK Core

**Autor:** Agent D -- Planificador de Implementación
**Fecha:** 2026-02-09
**Estado:** Plan

---

## Declaración de Visión

Construir un **SDK completo e agnóstico a la interfaz** para gestionar "cognitives" (skills, prompts, reglas, agentes) en más de 39 agentes de codificación de IA. El SDK es la única fuente de verdad para todas las operaciones cognitivas: cualquier CLI, aplicación web o integración lo consume. El SDK maneja toda la lógica; los consumidores manejan toda la presentación.

**Primero el SDK, luego el CLI. Nunca al revés.**

---

## Qué es el SDK

- Una **biblioteca TypeScript** (`@synapsync/cognit-core`) que proporciona una API programática para instalar, actualizar, listar, eliminar y sincronizar cognitivos.
- Un núcleo **fuertemente tipado e agnóstico a la interfaz** que devuelve datos estructurados y emite eventos tipados.
- Un **sistema extensible** que admite proveedores personalizados, agentes personalizados (vía YAML) y tipos cognitivos personalizados.
- La **base** sobre la cual se construye cualquier CLI, interfaz web o integración.

## Qué NO es el SDK

- NO es un CLI (el CLI es un paquete envoltorio delgado por separado).
- NO es un framework de UI (sin colores, spinners, prompts o salida de terminal).
- NO está acoplado a ninguna plataforma de hosting (sin telemetría de Vercel, sin dependencia de `skills.sh`).
- NO es un fork de `vercel-labs/skills` (arquitectura limpia, base de código propia, estándar compartido de formato SKILL.md).

---

## Descripción General de la Arquitectura

El SDK utiliza una **arquitectura estricta de 6 capas** con inyección de dependencias y sin singletons:

```
Capa 0: Tipos y Errores         (tipos puros, cero dependencias)
Capa 1: Configuración y Eventos (configuración del SDK, bus de eventos)
Capa 2: Agentes y Registro      (definiciones de agentes, detección)
Capa 3: Descubrimiento y Proveedores (escaneo de sistema de archivos, obtención remota)
Capa 4: Bloqueo e Instalador    (gestión de archivos de bloqueo, operaciones de archivos)
Capa 5: Operaciones             (añadir, eliminar, listar, actualizar, sincronizar, verificar, iniciar, buscar)
Capa 6: API Pública             (fachada del SDK, función de fábrica)
```

Cada capa solo puede importar de las capas inferiores. Cada módulo depende de interfaces, no de implementaciones. Toda la E/S del sistema de archivos pasa por un `FileSystemAdapter` inyectable, lo que hace que todo el SDK sea testeable con un sistema de archivos en memoria.

El punto de entrada único es `createCognitSDK(config?)`, que conecta todas las dependencias y devuelve una instancia de `CognitSDK`.

**Referencia:** `01-architecture.md`

---

## Decisiones Clave de Diseño

| Decisión                                     | Elección                                                                                       | Racional                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **SDK-primero, no CLI-primero**              | El SDK es el núcleo; el CLI es un consumidor delgado                                           | Permite interfaces web, integraciones, SDKs en otros lenguajes                 |
| **DI sobre singletons**                      | Inyección por constructor vía raíz de composición                                              | Testeable, paralelizable, dependencias explícitas                              |
| **Resultado sobre excepciones**              | `Result<T, E>` para fallos esperados                                                           | Manejo de errores explícito, componible, sin necesidad de try/catch            |
| **Eventos sobre console.log**                | Bus de eventos tipados para toda observabilidad                                                | Desacoplado de la UI, múltiples oyentes, componible                            |
| **Agentes YAML, compilados a TS**            | Definiciones de agentes como datos, no código                                                  | Añadir un agente = añadir un archivo YAML, no escribir TypeScript              |
| **FS en memoria para pruebas**               | Interfaz `FileSystemAdapter`                                                                   | Pruebas rápidas, deterministas y seguras para ejecución en paralelo            |
| **Categorías en canónico, plano en agentes** | `.agents/cognit/skills/frontend/react-19/` canónico, `.claude/skills/react-19/` para el agente | Organización sin romper la compatibilidad con el agente                        |
| **Symlink por defecto, copia como respaldo** | Fuente única de verdad con enlaces                                                             | Eficiencia de disco, propagación de actualizaciones, detección de desviaciones |
| **Solo ESM, Node >= 20**                     | Sin CommonJS, sin build dual                                                                   | Base moderna, herramientas más simples                                         |
| **Monorepo: 2 paquetes**                     | `cognit-core` (SDK) + `cognit-cli` (CLI)                                                       | Separación limpia, versiones independientes                                    |

---

## Inventario de Módulos

| Módulo        | Capa | Propósito                                                           | Interfaces Clave                                            |
| ------------- | ---- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `types/`      | 0    | Todos los tipos TypeScript, tipos marcados, utilidades de resultado | `Cognitive`, `AgentConfig`, `HostProvider`, `Result<T,E>`   |
| `errors/`     | 0    | Jerarquía de errores tipados                                        | `CognitError`, `ProviderError`, `InstallError`, `LockError` |
| `config/`     | 1    | Resolución y validación de la configuración del SDK                 | `SDKConfig`, `resolveConfig()`                              |
| `events/`     | 1    | Emisión y suscripción de eventos tipados                            | `EventBus`, `SDKEventMap`                                   |
| `fs/`         | 0-1  | Abstracción del sistema de archivos (real + en memoria)             | `FileSystemAdapter`                                         |
| `agents/`     | 2    | Registro de agentes, detección, configs compiladas de YAML          | `AgentRegistry`, `AgentDetector`                            |
| `discovery/`  | 3    | Escaneo del sistema de archivos para archivos cognitivos            | `DiscoveryService`                                          |
| `source/`     | 3    | Análisis de cadenas de origen y operaciones git                     | `SourceParser`, `GitClient`                                 |
| `providers/`  | 3    | Proveedores de hosting remoto (GitHub, Mintlify, etc.)              | `HostProvider`, `ProviderRegistry`                          |
| `installer/`  | 4    | Instalación de archivos (symlink/copia, rutas, seguridad)           | `Installer`, `FileOperations`                               |
| `lock/`       | 4    | CRUD de archivos de bloqueo, migración, hashing                     | `LockManager`                                               |
| `operations/` | 5    | Operaciones del SDK (añadir, listar, eliminar, etc.)                | `AddOperation`, `ListOperation`, etc.                       |
| `sdk.ts`      | 6    | Fachada pública y raíz de composición                               | `CognitSDK`, `createCognitSDK()`                            |

**Referencia:** `03-modules.md`

---

## Fases de Implementación

| Fase   | Nombre                     | Descripción                                           | Entregables Clave                                             | Dependencias |
| ------ | -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- | ------------ |
| **0**  | Configuración del Proyecto | Monorepo, configs, pipeline de construcción           | pnpm workspace, tsconfig, vitest, tsup                        | --           |
| **1**  | Tipos y Errores            | Todos los tipos, tipos marcados, jerarquía de errores | 22 archivos de tipos/errores                                  | P0           |
| **2**  | Sistema de Agentes         | Defs YAML, script de compilación, registro            | 39+ archivos YAML, pipeline de compilación, AgentRegistryImpl | P1           |
| **3**  | Config, Eventos, FS        | Configuración, bus de eventos, adaptador FS           | resolveConfig, EventBusImpl, createMemoryFs                   | P1           |
| **4**  | Descubrimiento             | Escaneo de FS, análisis de frontmatter                | DiscoveryServiceImpl, analizador, escáner                     | P1, P3       |
| **5**  | Origen y Git               | Análisis de cadenas de origen, clonación git          | SourceParserImpl, GitClientImpl                               | P1, P3       |
| **6**  | Proveedores (núcleo)       | Registro de proveedores, GitHub, Local                | ProviderRegistryImpl, GitHubProvider, LocalProvider           | P1, P3, P5   |
| **7**  | Instalador                 | Instalador unificado, op de archivos, rutas, symlinks | InstallerImpl, FileOperationsImpl, utilidades de ruta         | P1, P2, P3   |
| **8**  | Sistema de Bloqueo         | CRUD de archivos de bloqueo, migración, hashing       | LockManagerImpl, migración, computeContentHash                | P1, P3       |
| **9**  | Operaciones                | Las 8 operaciones del SDK                             | Desde AddOperation hasta FindOperation                        | P2-P8        |
| **10** | API Pública                | Fachada del SDK, raíz de composición, exportaciones   | createCognitSDK, CognitSDKImpl, index.ts                      | Todas        |
| **11** | Proveedores Adicionales    | Mintlify, HuggingFace, WellKnown, Direct              | 4 implementaciones de proveedores                             | P6           |
| **12** | Pruebas                    | Integración, E2E, puertas de cobertura                | 40+ archivos de prueba, 85% de cobertura                      | Todas        |
| **13** | Paquete CLI                | Comandos, prompts, formateadores                      | cognit add/list/remove/update/sync/check/init/find            | P10          |

---

## Qué hace esto diferente de vercel-labs/skills

| Aspecto                | vercel-labs/skills                       | Cognit SDK                                                                          |
| ---------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------- |
| **Arquitectura**       | Binario solo CLI, sin API programática   | SDK-primero con CLI como consumidor delgado                                         |
| **Config de Agente**   | TypeScript codificado por agente         | Definiciones YAML compiladas a TypeScript                                           |
| **Tipos Cognitivos**   | Solo Skills (SKILL.md)                   | Skills, Prompts, Reglas, Agentes (extensible)                                       |
| **Categorías**         | Ninguna                                  | Departamentos organizativos de primera clase                                        |
| **Archivo de Bloqueo** | Solo global, claves planas               | Ámbitos de proyecto + global, claves compuestas con categoría                       |
| **Testabilidad**       | Sin abstracción de FS, singletons        | DI completo, FS inyectable, pruebas en memoria                                      |
| **Extensibilidad**     | Fork para personalizar                   | Proveedores personalizados, agentes personalizados, tipos personalizados vía config |
| **Instalación**        | Siempre global                           | Ámbito de proyecto (por defecto) + global                                           |
| **Infraestructura**    | Acoplado a Vercel (telemetría, búsqueda) | Totalmente independiente, endpoints configurables                                   |
| **Manejo de Errores**  | console.log + process.exit               | Jerarquía de errores tipados + Result<T,E>                                          |
| **Observabilidad**     | Salida de consola                        | Bus de eventos tipados para cualquier consumidor                                    |

Los únicos elementos compartidos son: el **formato de frontmatter de SKILL.md** (adoptado como un estándar, no como código) y las **39 definiciones de agentes** (portadas como datos YAML, no como código TypeScript).

---

## Tech Stack

| Capa                        | Tecnología                 | Propósito                                   |
| --------------------------- | -------------------------- | ------------------------------------------- |
| Runtime                     | Node.js >= 20              | Entorno de ejecución                        |
| Lenguaje                    | TypeScript (modo estricto) | Seguridad de tipos                          |
| Sistema de Módulos          | Solo ESM                   | Estándar moderno                            |
| Gestor de Paquetes          | pnpm                       | Soporte para workspace                      |
| Herramienta de Construcción | tsup                       | Empaquetado + generación dts                |
| Framework de Pruebas        | vitest                     | Rápido, nativo de ESM                       |
| Frontmatter                 | gray-matter                | Análisis de frontmatter YAML                |
| Git                         | simple-git                 | Operaciones de clonación git                |
| Rutas XDG                   | xdg-basedir                | Rutas de configuración multiplataforma      |
| CLI Prompts                 | @clack/prompts             | Prompts de terminal interactivos (solo CLI) |
| CLI Colores                 | picocolors                 | Salida de color en terminal (solo CLI)      |
| CLI Spinner                 | ora                        | Spinner de progreso (solo CLI)              |

**Dependencias de tiempo de ejecución (SDK):** 3 (`gray-matter`, `simple-git`, `xdg-basedir`)
**Dependencias de tiempo de ejecución (CLI):** 3 adicionales (`@clack/prompts`, `picocolors`, `ora`)

---

## Índice de Documentos del Plan

| #      | Documento                                                        | Autor   | Contenidos                                                                                                                                                                              |
| ------ | ---------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **00** | **Resumen Ejecutivo** (este documento)                           | Agent D | Visión, arquitectura, decisiones, fases, stack tecnológico                                                                                                                              |
| **01** | [Arquitectura](./01-architecture.md)                             | Agent A | Arquitectura en capas, DI, eventos, config, adaptador FS, API pública, flujo de datos                                                                                                   |
| **02** | [Sistema de Tipos](./02-type-system.md)                          | Agent A | Tipos marcados, Result, tipos cognitivos, tipos de agentes, tipos de proveedores, tipos de instaladores, tipos de bloqueo, tipos de operaciones, tipos de eventos, jerarquía de errores |
| **03** | [Desglose de Módulos](./03-modules.md)                           | Agent A | 12 módulos con dependencias, APIs públicas/internas, estructuras de archivos, estrategias de prueba, estimaciones de LOC                                                                |
| **04** | [Sistema de Agentes](./04-agent-system.md)                       | Agent B | Esquema YAML, ejemplos (39+ agentes), pipeline de compilación, reglas de detección, grupos de compatibilidad                                                                            |
| **05** | [Sistema de Proveedores](./05-provider-system.md)                | Agent B | Interfaz HostProvider, 7 proveedores, registro, análisis de origen, almacenamiento en caché, manejo de errores                                                                          |
| **06** | [Operaciones](./06-operations.md)                                | Agent B | 8 operaciones (add, list, remove, update, sync, init, check, find), algoritmos, eventos, casos de error                                                                                 |
| **07** | [Instalador](./07-installer.md)                                  | Agent C | Modos de instalación, ámbitos, rutas canónicas, symlinks, seguridad, rollback, soporte para Windows                                                                                     |
| **08** | [Sistema de Bloqueo](./08-lock-system.md)                        | Agent C | Esquema de bloqueo v5, CRUD, detección de actualizaciones, migración, resolución de conflictos                                                                                          |
| **09** | [Estructura de Directorios](./09-directory-structure.md)         | Agent C | Diseño de monorepo, directorios de tiempo de ejecución, esquemas de archivos cognitivos, salida de construcción, estructura de publicación npm                                          |
| **10** | [Sistema de Categorías](./10-categories.md)                      | Agent C | Categorías por defecto, categorías personalizadas, aplanamiento, integración de bloqueo, consultas                                                                                      |
| **11** | [Hoja de Ruta de Implementación](./11-implementation-roadmap.md) | Agent D | 14 fases con archivos, interfaces, pruebas, criterios de aceptación, dependencias                                                                                                       |
| **12** | [Estrategia de Pruebas](./12-testing-strategy.md)                | Agent D | Estrategia de unidad/integración/E2E, fixtures, mocks, objetivos de cobertura, CI                                                                                                       |

---

## Cómo Usar Este Plan

Cada fase en la hoja de ruta de implementación (`11-implementation-roadmap.md`) está diseñada para ser ejecutada por un agente Claude. Las instrucciones incluyen:

1. **Archivos exactos a crear** con rutas completas.
2. **Interfaces a implementar** con referencias al documento del sistema de tipos.
3. **Pruebas a escribir** con casos de prueba específicos.
4. **Definición de terminado** con criterios de aceptación.
5. **Dependencias** de otras fases.

Comience en la Fase 0 y proceda secuencialmente. Las fases que comparten el mismo conjunto de dependencias pueden paralelizarse (por ejemplo, las Fases 4, 5 y 6 pueden ejecutarse en paralelo después de la Fase 3).

La directiva del usuario: **"No me importa el tiempo, quiero que se haga 100% bien."** Este plan está diseñado para la completitud y la corrección, no para la velocidad.
