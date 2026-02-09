# Resumen Ejecutivo: Estrategia de cognit-cli

> **Fecha**: 09-02-2026
> **Decisión**: Fork vs SDK vs Híbrido para cognit-cli
> **Recomendación**: Arquitectura Híbrida (Núcleo Propio + Adaptación Selectiva)

---

## Declaración del Problema

Existen tres bases de código con objetivos superpuestos: gestionar instrucciones de agentes de IA (skills, agentes, prompts) en más de 39 agentes de programación:

1. **vercel-labs/skills** -- el "upstream" de rápido crecimiento (~5K estrellas en <1 mes) que define el estándar del ecosistema (formato SKILL.md, CLI `skills`).
2. **cognit** -- un fork del upstream con innovaciones originales (configuraciones de agentes en YAML, sistema de tipos cognitivos, arquitectura modular).
3. **synapse-cli** -- el proyecto previo independiente del usuario con 515 pruebas, 80% de cobertura y patrones probados (motor de sincronización, diagnósticos "doctor", generador AGENTS.md basado en marcadores).

La pregunta es: ¿debería el usuario mantener `cognit` como un fork permanente de `vercel-labs/skills`, consumir el upstream como una dependencia npm/SDK, o construir un nuevo proyecto que tome lo mejor de los tres?

---

## Hallazgos Clave

### Upstream (vercel-labs/skills)

- **Sin API programática** -- solo un binario CLI, sin exportaciones ni tipos. No se puede consumir como una dependencia.
- Extremadamente activo: 30 commits/semana, lanzamientos diarios, sin disciplina de semver. El formato del archivo de bloqueo ya se rompió una vez (v2 a v3).
- Datos valiosos: 38 definiciones de agentes, estándar de formato SKILL.md, patrones de proveedores (Mintlify, HuggingFace, well-known).

### Cognit (Fork)

- Dos innovaciones destacadas: **configuración de agentes basada en YAML** (añadir un agente = añadir un archivo YAML de 3 líneas) y **generalización de tipos cognitivos** (skill/agente/prompt).
- Todavía profundamente acoplado a la infraestructura de Vercel: telemetría a `add-skill.vercel.sh`, búsqueda vía `skills.sh`, aviso promocional para `vercel-labs/skills`.
- Deuda técnica acumulada: ~20 alias obsoletos, duplicación de proveedores/fuentes, `add.ts` de 1,244 líneas, comando de actualización basado en `npx`.

### Synapse-CLI (Original)

- Ingeniería de calidad de producción: 515 pruebas, 80% de cobertura, máximo rigor en TypeScript, 5 dependencias de ejecución.
- Componentes reutilizables probados: logger, motor de sincronización de 4 fases, diagnósticos "doctor", generador AGENTS.md basado en marcadores.
- Lección estratégica: empezar con demasiados tipos cognitivos (5) y un registro personalizado fue una complejidad prematura.

---

## Estrategia Recomendada: Arquitectura Híbrida

**Construir un nuevo proyecto `cognit-cli` desde cero, combinando los mejores componentes de las tres bases de código, sin dependencia de código del upstream.**

La estrategia SDK no es viable porque el upstream no expone ninguna API. La estrategia de fork es insostenible porque un desarrollador en solitario no puede seguir el ritmo de 30 commits/semana de conflictos de fusión. La estrategia híbrida ofrece libertad arquitectónica completa, máxima sostenibilidad y la capacidad de elegir las mejores ideas sin heredar deuda técnica.

El único valor real del upstream son los **datos** (39 definiciones de agentes, formato SKILL.md, patrones de URL de proveedores), no el código. Los datos pueden portarse como archivos YAML. El acoplamiento de código se elimina por completo.

---

## Arquitectura Objetivo

Una arquitectura en capas con clara separación de conceptos (detallada en el Reporte 05):

- **Capa de Núcleo (Core)**: Sistema de tipos, gestión de configuración, motor cognitivo -- propiedad total.
- **Capa de Servicio**: Registro de agentes (basado en YAML), descubrimiento, instalador, resolutor, bloqueo, sincronización -- propiedad total.
- **Capa de Adaptador**: Adaptadores para Git, GitHub y proveedores -- el único lugar donde se tocan sistemas externos.
- **Capa de Tiempo de Construcción**: Configuraciones de agentes YAML compiladas a TypeScript en tiempo de construcción (portado del fork cognit).
- **Capa de DX**: Logger, diagnósticos "doctor", generador AGENTS.md (portado de synapse-cli).

Paquete npm único. Sin monorepo. 5 dependencias de ejecución. Node >= 20. ESM.

---

## Resumen del Plan MVP

Cuatro hitos con el objetivo de una v0.1 publicable:

| Hito | Enfoque | Alcance |
| ---- | ------- | ------- |
| **M0** | Andamiaje del proyecto | Pipeline de construcción, compilación YAML, tipos, logger |
| **M1** | CLI Núcleo | `add`, `list`, `remove` + instalador + archivo de bloqueo |
| **M2** | Comandos secundarios | `init`, `check`, `update` + prompts interactivos |
| **M3** | Funciones de DX | `doctor`, AGENTS.md, manejo de errores |
| **M4** | Prep. para lanzamiento | Pruebas (>= 70% cobertura), docs, CI, publicación npm |

Post-MVP: Soporte para Windows (v0.2), proveedores (v0.2), motor de sincronización (v0.3), motor de ejecución (v0.4).

---

## Los 3 Riesgos Principales

| Riesgo | Impacto | Mitigación |
| ------ | ------- | ---------- |
| **Upstream añade agentes más rápido de lo que portamos** | Medio -- podría quedar atrás en soporte de agentes | Las adiciones de agentes son archivos de datos YAML (~5 min cada uno). Portabilidad por lotes mensual. El sistema YAML hace que esto sea trivial. |
| **Ancho de banda del desarrollador en solitario** | Alto -- el MVP podría estancarse | Los hitos son pequeños y se pueden entregar de forma independiente. M0+M1 por sí solos aportan valor central. El alcance es deliberadamente mínimo. |
| **El formato SKILL.md diverge en el upstream** | Alto -- incompatibilidad del ecosistema | El formato es simple y estable (nombre, descripción, campos de metadatos). Es poco probable que cambie significativamente. Monitorear lanzamientos. |

---

## Llamado a la Acción

1. **Aceptar la estrategia de Arquitectura Híbrida** -- no más mantenimiento de fork, no más SDK que no existe.
2. **Empezar M0 inmediatamente** -- andamiaje del proyecto, portar agentes YAML y pipeline de compilación.
3. **Entregar M1 en la primera semana** -- un `cognit add` funcional es la prueba de concepto.
4. **Publicar v0.1 en npm en 2-3 semanas** -- reclamar el nombre del paquete, establecer la identidad del proyecto.

El fork cumplió su propósito como exploración. Synapse-cli probó los patrones de ingeniería. Ahora es el momento de construir el producto real: limpio, propio y sostenible.

---

### Índice de Reportes

| # | Título | Contenido |
| - | ------ | --------- |
| 00 | Resumen Ejecutivo | Este documento |
| 01 | [Análisis de Vercel Skills](./01-vercel-skills-analysis.md) | Inmersión profunda en el repo upstream |
| 02 | [Análisis de Cognit](./02-cognit-analysis.md) | Evolución del fork, innovaciones, deuda técnica |
| 03 | [Análisis de Synapse-CLI](./03-synapse-cli-analysis.md) | Proyecto original, componentes reutilizables |
| 04 | [Matriz de Decisión Estratégica](./04-strategy-decision-matrix.md) | Tres estrategias evaluadas con puntuación |
| 05 | [Arquitectura Propuesta](./05-proposed-architecture.md) | Diagramas de capas, interfaces, estructura de archivos |
| 06 | [Plan MVP](./06-mvp-plan.md) | Hitos, alcance, riesgos, próximos pasos |

---

_Resumen ejecutivo por el Agente D -- Arquitecto de Estrategia_
_Sintetizado a partir de los Reportes 01, 02, 03_
