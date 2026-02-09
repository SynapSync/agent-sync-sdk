# Matriz de Decisión Estratégica: Fork vs SDK vs Híbrido

> **Fecha**: 09-02-2026
> **Autor**: Agente D -- Arquitecto de Estrategia
> **Entrada**: Reportes 01 (Upstream), 02 (Fork de Cognit), 03 (Synapse-CLI)

---

## 1. Contexto

El usuario está construyendo una herramienta CLI para gestionar instrucciones de agentes de IA ("cognitivos") en más de 39 agentes de programación. Existen tres bases de código:

1. **vercel-labs/skills** (upstream) -- una CLI de menos de un mes de antigüedad y movimiento rápido, con más de 5K estrellas, 38 agentes y sin API programática. Solo CLI, paquete único, sin exportaciones.
2. **cognit** (fork) -- un fork evolucionado que añade tipos cognitivos (skill/agente/prompt), configuraciones de agentes basadas en YAML, arquitectura modular y ~9,200 LOC. Todavía profundamente acoplado a la infraestructura de Vercel (telemetría, búsqueda).
3. **synapse-cli** (original) -- el proyecto independiente del usuario con 515 pruebas, 80% de cobertura, 5 dependencias de ejecución, REPL, motor de sincronización de 4 fases, diagnósticos doctor. Nunca se publicó; el desarrollo pivotó hacia el fork.

La decisión: cómo avanzar arquitectónicamente.

---

## 2. Opciones Estratégicas

### Estrategia A: Fork Permanente con Sincronización del Upstream

Mantener `cognit` como un fork de larga duración. Fusionar periódicamente los cambios del upstream de `vercel-labs/skills` (adiciones de agentes, correcciones de errores, nuevos proveedores) en el fork.

**Cómo funciona:**
- Mantener la base de código actual de cognit tal cual.
- Configurar `vercel-labs/skills` como un remoto de git.
- Realizar periódicamente `git merge` o `git cherry-pick` de los commits del upstream.
- Resolver los conflictos manualmente, especialmente en áreas divergentes (tipos cognitivos, agentes YAML, estructura modular).
- Continuar construyendo funciones directamente en el fork.

### Estrategia B: Upstream como Dependencia (SDK/Wrapper)

Descartar el fork. Empezar un proyecto limpio que consuma `vercel-labs/skills` como una dependencia npm (o fuente vendorizada) y construir una capa diferenciada por encima.

**Cómo funciona:**
- `npm install skills` (o vendorizar archivos fuente específicos).
- Construir `cognit-cli` como un paquete separado que importe/envuelva los módulos del upstream.
- La capa propia maneja: tipos cognitivos, comandos personalizados, configuraciones de agentes YAML, UI/DX.
- El upstream proporciona: registro de agentes, descubrimiento de habilidades, parseo de fuentes, proveedores.

**Bloqueador crítico:** El paquete upstream **no expone ninguna API programática**; solo un binario CLI. No hay campos `main`, `exports` o `types` en el `package.json`. Todas las dependencias están empaquetadas en un solo `dist/cli.mjs`. Esto significa que el consumo del SDK no es posible sin: (a) envolver la CLI a través de child_process (frágil), (b) vendorizar los archivos fuente (carga de mantenimiento) o (c) contribuir a una refactorización del upstream para dividir CLI/núcleo (requiere aceptación, alto esfuerzo).

### Estrategia C: Arquitectura Híbrida (Núcleo Propio + Adaptación Selectiva del Upstream)

Construir un nuevo proyecto desde cero utilizando los mejores componentes de las tres bases de código. Vendorizar o adaptar selectivamente módulos específicos del upstream donde sea valioso, pero poseer la arquitectura del núcleo por completo.

**Cómo funciona:**
- Nuevo proyecto limpio: `cognit-cli`.
- **Núcleo propio**: Framework de CLI, enrutamiento de comandos, sistema de tipos cognitivos, configuraciones de agentes YAML, gestión de configuración, motor de sincronización, características de DX.
- **Adaptado del upstream**: Datos del registro de agentes (39 definiciones de agentes), patrones de parseador de fuentes, patrones de proveedores.
- **Portado de synapse-cli**: Logger, diagnósticos doctor, generador AGENTS.md, patrones de prueba, gestión de enlaces simbólicos.
- **Sin relación de fork a nivel de git** -- sin conflictos de fusión, sin carga de seguimiento del upstream.
- Monitorear el upstream para nuevas adiciones de agentes y portarlas según sea necesario (datos, no código).

---

## 3. Matriz de Decisión

| Criterio | Peso | A: Fork Permanente | B: SDK/Wrapper | C: Híbrido (Núcleo Propio) |
|-----------|--------|-------------------|----------------|----------------------|
| **Tiempo al MVP** | Alto | **Rápido** -- el código ya funciona, ~9,200 LOC ya funcionales | **Lento** -- no hay API que consumir; debe construirse una capa shim o vendorizar la fuente desde cero | **Medio** -- reutilizar patrones de synapse-cli (515 pruebas, 80% cobertura) y cognit (agentes YAML, tipos cognitivos); nuevo proyecto pero patrones probados |
| **Mantenibilidad (12-24 meses)** | Crítico | **Pobre** -- el upstream publica a diario; las fusiones son cada vez más dolorosas a medida que las bases de código divergen; conflictos de fusión en `add.ts` de 1,900 líneas garantizados | **Pobre** -- el upstream puede que nunca exponga una API; el envoltorio de la CLI se rompe con cualquier cambio en el formato de salida; los archivos vendorizados derivan | **Excelente** -- código propio, ritmo propio; sin deuda de fusión; upstream monitoreado por datos (nuevos agentes), no por código |
| **Riesgo de cambios disruptivos** | Alto | **Muy Alto** -- el formato del lockfile ya se rompió (v2->v3); lanzamientos diarios; sin disciplina de semver; la fusión es un triaje manual | **Alto** -- formato de salida de la CLI inestable; la fuente vendorizada diverge; la API del upstream podría materializarse en una forma incompatible | **Bajo** -- sin acoplamiento de código con el upstream; solo dependencia de datos (definiciones de agentes), lo cual es aditivo |
| **Complejidad de empaquetado** | Medio | **Baja** -- paquete único, ya funciona | **Alta** -- debe gestionarse la fijación de la versión de la dep del upstream, la capa shim y los posibles conflictos de empaquetado | **Baja** -- paquete limpio y único, pipeline de construcción propio |
| **Experiencia del desarrollador (DX)** | Medio | **Mixta** -- estigma de fork; los colaboradores se confunden entre el upstream y el fork; difícil de explicar "¿por qué no usar simplemente skills?" | **Buena** -- separación limpia pero configuración compleja para los colaboradores | **La mejor** -- proyecto limpio, identidad clara, incorporación fácil, sin el equipaje de un fork |
| **Independencia** | Alto | **Baja** -- estructuralmente dependiente del upstream; cada cambio en el upstream es un conflicto de fusión potencial | **Media** -- dependencia en tiempo de ejecución pero las características propias son independientes | **Alta** -- totalmente independiente; el upstream es una referencia, no una dependencia |
| **Velocidad de características** | Alto | **Media** -- restringido por la necesidad de mantener la capacidad de fusión; no se puede reestructurar radicalmente sin perder la compatibilidad con el upstream | **Baja** -- limitada por la superficie de la API del upstream (que no existe) | **Alta** -- libertad completa para innovar; sin las limitaciones del upstream |
| **Compatibilidad del ecosistema** | Medio | **Buena** -- el fork puede mantenerse cerca del formato SKILL.md del upstream y de las rutas de los agentes | **Buena** -- envolver el upstream asegura la compatibilidad del formato | **Buena** -- usar el mismo formato SKILL.md y las convenciones de `.agents/` voluntariamente |
| **Factor bus / Sostenibilidad** | Crítico | **Arriesgada** -- depende de un desarrollador en solitario que resuelva conflictos de fusión con una base de código que tiene 30 commits/semana de más de 20 colaboradores | **Arriesgada** -- depende de que el upstream no rompa su interfaz de CLI | **La mejor** -- el desarrollador en solitario es dueño de todo; la complejidad se autodetermina |

### Puntuación (1-5, 5=mejor)

| Criterio | Peso | A: Fork | B: SDK | C: Híbrido |
|-----------|--------|---------|--------|-----------|
| Tiempo al MVP | 3x | 5 (15) | 2 (6) | 3 (9) |
| Mantenibilidad | 4x | 2 (8) | 2 (8) | 5 (20) |
| Riesgo de cambios | 3x | 1 (3) | 2 (6) | 5 (15) |
| Empaquetado | 2x | 4 (8) | 2 (4) | 4 (8) |
| DX | 2x | 3 (6) | 3 (6) | 5 (10) |
| Independencia | 3x | 2 (6) | 3 (9) | 5 (15) |
| Velocidad de caract. | 3x | 3 (9) | 2 (6) | 5 (15) |
| Compat. ecosistema | 2x | 4 (8) | 4 (8) | 4 (8) |
| Sostenibilidad | 4x | 2 (8) | 2 (8) | 5 (20) |
| **TOTAL** | **26x** | **71** | **61** | **120** |

---

## 4. Pros y Contras Detallados

### Estrategia A: Fork Permanente

**Pros:**
- El camino más rápido para tener algo funcionando (el código ya existe).
- Hereda 39 definiciones de agentes, 4 proveedores, sistema de archivo de bloqueo.
- Puede elegir correcciones de errores del upstream de forma selectiva.
- La configuración de agentes YAML y los tipos cognitivos ya están construidos.

**Cons:**
- El upstream envía ~30 commits/semana; la deuda de fusión es insostenible para un desarrollador en solitario.
- El `add.ts` monolítico (1,900 líneas en el upstream, 1,244 líneas en el fork) es un imán para los conflictos de fusión.
- Sigue acoplado a la infraestructura de Vercel (telemetría a `add-skill.vercel.sh`, búsqueda vía `skills.sh`).
- El formato del archivo de bloqueo ya se rompió una vez (v2->v3); volverá a romperse.
- Problema de identidad del fork: "¿por qué no usar simplemente skills?" es difícil de responder cuando el 80% del código es el upstream.
- ~20 alias `@deprecated` de compatibilidad hacia atrás añaden ruido y costes de mantenimiento.
- La duplicación de código de proveedor/fuente dentro del fork es una deuda técnica no resuelta.
- El comando de actualización utiliza la generación de un proceso hijo `npx`, lo cual es frágil y heredado del upstream.

### Estrategia B: Upstream como Dependencia

**Pros:**
- Separación limpia entre la funcionalidad del upstream y la capa personalizada.
- Las correcciones de errores del upstream vienen "gratis" a través de aumentos de versión.
- Mantenimiento más ligero si la API fuera estable.

**Cons:**
- **Punto de ruptura: No existe una API.** El paquete solo exporta un binario CLI. No hay funciones, tipos o módulos exportados (Reporte 01, Sección 4).
- El envoltorio de la CLI a través de `child_process` es frágil, lento (sobrecarga de npx) y se limita a parsear el stdout.
- Vendorizar archivos fuente crea la misma carga de mantenimiento que un fork pero sin las herramientas de fusión de git.
- Contribuir a una refactorización del upstream (dividir CLI/núcleo) requiere la aceptación de Vercel y puede que nunca ocurra.
- El upstream tiene menos de 1 mes de antigüedad sin disciplina de semver; la fijación de versiones no es fiable.
- Sigue dependiendo de la infraestructura de Vercel para la telemetría y la búsqueda.

### Estrategia C: Arquitectura Híbrida (Núcleo Propio + Adaptación Selectiva)

**Pros:**
- Libertad arquitectónica completa; sin limitaciones de código del upstream.
- Elegir las *mejores ideas* de las tres bases de código sin heredar deuda técnica.
- Las configuraciones de agentes YAML (de cognit) son la innovación destacada: mantener y mejorar.
- El sistema de tipos cognitivos (skill/agent/prompt) puede diseñarse adecuadamente desde el primer día.
- Las 515 pruebas y los patrones de synapse-cli proporcionan una base probada.
- Los componentes probados de synapse-cli (logger, doctor, generador AGENTS.md) son directamente portables.
- Sin conflictos de fusión, sin el estigma de un fork, sin dependencia del upstream.
- Se puede adoptar el estándar de formato SKILL.md voluntariamente sin acoplamiento de código.
- Control total sobre la telemetría, la búsqueda, el registro y toda la infraestructura.
- Sostenibilidad del desarrollador en solitario: la complejidad se autodetermina.

**Cons:**
- Desarrollo inicial más lento que el del fork (no hay código funcionando para empezar).
- Debe rastrearse manualmente las nuevas adiciones de agentes en el upstream (portar datos, no código).
- Pierde el beneficio de las correcciones de errores de la comunidad que van al upstream.
- Debe reconstruirse el sistema de proveedores (mintlify, huggingface, well-known) si estos son necesarios.

---

## 5. Recomendación

**La Estrategia C: Arquitectura Híbrida** es la clara ganadora.

### Justificación

1. **La estrategia SDK (B) no es viable.** El paquete upstream no tiene API programática. Esta no es una limitación teórica; es una restricción arquitectónica fuerte (Reporte 01, Sección 4: "NO existe una API programática"). Sin la aceptación del upstream para dividir la CLI/núcleo, esta estrategia requiere un envoltorio de CLI frágil o la vendorización de la fuente, ambas peores que un fork.

2. **La estrategia de fork (A) es insostenible para un desarrollador en solitario.** El upstream envía 30 commits/semana de más de 20 colaboradores. Los conflictos de fusión en el `add.ts` de 1,900 líneas por sí solos consumirían un tiempo de mantenimiento significativo. El fork ya ha acumulado deuda técnica: ~20 alias obsoletos, duplicación de proveedor/fuente, acoplamiento con la infraestructura de Vercel y un mecanismo de actualización de procesos hijo `npx`.

3. **La estrategia híbrida (C) ofrece el mejor perfil de sostenibilidad.** Un desarrollador en solitario que mantenga este proyecto necesita:
   - Control total sobre la complejidad (sin conflictos de fusión impuestos por el upstream).
   - Capacidad para enviar funciones sin preocuparse por la compatibilidad de la fusión.
   - Una base de código limpia con una identidad clara.
   - Reutilización de patrones probados sin heredar deuda.

4. **El usuario ya ha construido dos bases de código.** Synapse-CLI tiene 515 pruebas y un 80% de cobertura. Cognit tiene el sistema de configuración de agentes YAML y los tipos cognitivos. El enfoque híbrido les permite combinar lo mejor de ambos sin empezar desde cero.

5. **El único valor real del upstream son los datos, no el código.** Las 39 definiciones de agentes, la convención del formato SKILL.md y los patrones de URL de los proveedores son datos que pueden portarse. El código (enrutamiento de CLI, prompts, pipeline de paquetes) no añade un valor único sobre lo que el usuario ya ha construido.

### Ruta de Migración

1. Iniciar un nuevo proyecto `cognit-cli` con una arquitectura limpia.
2. Portar las configuraciones de agentes YAML y el pipeline de compilación de cognit (la innovación destacada).
3. Portar el logger, el doctor, el generador de AGENTS.md y los patrones de prueba de synapse-cli.
4. Diseñar un sistema de tipos cognitivos adecuado (3 tipos: skill/agent/prompt) desde el primer día.
5. Construir adaptadores de proveedores propios (referenciar patrones del upstream, no copiar código).
6. Adoptar el estándar de formato SKILL.md voluntariamente: interoperabilidad sin acoplamiento.
7. Monitorear el upstream para nuevas adiciones de agentes: portar como archivos de datos YAML, no como fusiones de código.

---

*Decisión de estrategia por el Agente D -- Arquitecto de Estrategia*
*Referencias cruzadas: Reportes 01 (upstream), 02 (fork de cognit), 03 (synapse-cli)*
