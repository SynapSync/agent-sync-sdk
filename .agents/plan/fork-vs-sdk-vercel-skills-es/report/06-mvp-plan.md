# Plan MVP: cognit-cli v0.1

> **Fecha**: 09-02-2026
> **Estrategia**: Arquitectura Híbrida (Reporte 04)
> **Arquitectura**: Ver Reporte 05
> **Objetivo**: Desarrollador en solitario, sostenibilidad primero

---

## 1. Alcance del MVP

### 1.1 En Alcance (v0.1)

| Característica | Comando | Prioridad | Fuente |
|---------|---------|----------|--------|
| Instalar cognitivos desde repos de GitHub | `cognit add owner/repo` | P0 | Valor central |
| Instalar desde rutas locales | `cognit add ./path` | P0 | Valor central |
| Listar cognitivos instalados | `cognit list` | P0 | Gestión básica |
| Eliminar cognitivos instalados | `cognit remove <name>` | P0 | Gestión básica |
| Andamiaje de nuevo cognitivo | `cognit init` | P1 | Experiencia de autor |
| Buscar actualizaciones | `cognit check` | P1 | Mantenimiento |
| Actualizar cognitivos instalados | `cognit update` | P1 | Mantenimiento |
| Verificaciones de salud de diagnóstico | `cognit doctor` | P2 | Pulido de DX |
| Generación de AGENTS.md | Automático al instalar | P2 | Pulido de DX |
| Tres tipos cognitivos | skill, agent, prompt | P0 | Diferenciador clave |
| Registro de agentes basado en YAML | 39 agentes desde YAML | P0 | Arq. central |
| Inst. enlace simbólico primero | Symlink con copia de seguridad | P0 | Mecanismo central |
| Seguimiento de archivo de bloqueo | `.cognit-lock.json` | P0 | Gestión de estado |
| Alcance de proyecto + global | Flag `--global` | P1 | Flexibilidad de inst. |

### 1.2 Fuera de Alcance (y por qué)

| Característica | Por qué se pospone |
|---------|-------------|
| **`cognit find` (búsqueda)** | Requiere un backend de búsqueda o API. La búsqueda en GitHub puede ser una adición en la v0.2. No es necesaria para el valor central. |
| **Proveedores remotos (Mintlify, HuggingFace, well-known)** | Casos borde. Los repos de GitHub y las rutas locales cubren más del 90% de los casos de uso. Los proveedores son un adaptador; añadir más tarde sin cambios en la arquitectura. |
| **Modo REPL interactivo** | Synapse-CLI invirtió mucho aquí; bajo valor de uso. CLI estándar primero. |
| **Motor de ejecución** | Característica ambiciosa de las ideas de synapse-cli. Requiere la integración con la API del proveedor de IA. v0.3+ como pronto. |
| **Sistema de publicación / registro** | Problema del arranque en frío. Centrarse en el consumo primero, producción más tarde. |
| **Archivo de configuración (`synapsync.config.yaml`)** | No es necesario hasta que se requiera la personalización a nivel de proyecto. Los valores por defecto son suficientes para el MVP. |
| **5 tipos cognitivos (workflow, tool)** | Tres tipos (skill/agent/prompt) cubren los casos de uso principales. Añadir workflow/tool si la demanda se materializa. |
| **Soporte para Windows** | macOS/Linux primero. El manejo de symlinks en Windows es complejo. Añadir en la v0.2. |
| **Telemetría** | Enviar primero, medir después. La telemetría opcional se puede añadir post-MVP. |
| **Sist. de plugins para proveedores** | Sobre-ingeniería. Los adaptadores hardcodeados están bien a esta escala. |

### 1.3 Criterios de Aceptación

1. `cognit add vercel-labs/skills` instala todos los archivos SKILL.md de un repositorio de GitHub en los agentes detectados.
2. `cognit add ./local-skills/` instala cognitivos desde un directorio local.
3. Los tipos cognitivos (skill/agent/prompt) se detectan correctamente por el nombre del archivo (SKILL.md, AGENT.md, PROMPT.md).
4. Se soportan 39 agentes a través de definiciones YAML (igualando la paridad con vercel-labs/skills upstream).
5. Los cognitivos instalados se enlazan simbólicamente al directorio de cada agente detectado.
6. `.cognit-lock.json` rastrea todas las instalaciones con fuente, versión y hash.
7. `cognit list` muestra todos los cognitivos instalados con tipo, fuente y fecha de instalación.
8. `cognit remove <name>` elimina limpiamente un cognitivo de todos los directorios de agentes y del archivo de bloqueo.
9. `cognit init` crea un andamiaje para un nuevo SKILL.md, AGENT.md o PROMPT.md con el frontmatter adecuado.
10. `cognit doctor` ejecuta al menos 5 verificaciones de diagnóstico (integridad del archivo de bloqueo, salud del symlink, detección de agentes, etc.).
11. Cobertura de pruebas >= 70% de líneas, 60% de ramas.
12. Cero dependencias de ejecución más allá de las 5 bibliotecas principales (@clack/prompts, gray-matter, simple-git, picocolors, ora).

---

## 2. Hitos

### M0: Andamiaje del Proyecto (1-2 días)

**Entregables:**
- [ ] Inicializar el proyecto `cognit-cli` con `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`.
- [ ] Configurar ESLint con reglas estrictas de TypeScript (portar de la config de synapse-cli).
- [ ] Crear la estructura de directorios según la arquitectura (src/commands, src/core, src/services, src/adapters, src/utils).
- [ ] Portar `agents/*.yaml` (39 archivos) del fork de cognit.
- [ ] Portar `config/cognitive-types.yaml` del fork de cognit.
- [ ] Portar y adaptar `scripts/compile.ts` del fork de cognit.
- [ ] Verificar el pipeline de compilación: los YAML generan archivos TypeScript.
- [ ] Configurar `src/core/types.ts` con las interfaces del núcleo.
- [ ] Portar el logger de synapse-cli (`src/utils/logger.ts`).
- [ ] Escribir la primera prueba: el script de compilación produce TypeScript válido.
- [ ] `npm run build` produce un binario CLI funcional (vacío).

**Criterios de salida:** `cognit --help` imprime un mensaje de ayuda. El pipeline de construcción funciona de extremo a extremo. Los tipos generados compilan sin errores.

### M1: CLI Núcleo con Carga Básica de Habilidades (3-5 días)

**Entregables:**
- [ ] `src/cli.ts` -- enrutamiento de comandos (add, list, remove, init, help, version).
- [ ] `src/services/registry/detection.ts` -- detectar agentes instalados en el sistema de archivos.
- [ ] `src/services/discovery/scanner.ts` -- escanear directorios buscando SKILL.md/AGENT.md/PROMPT.md.
- [ ] `src/services/discovery/parser.ts` -- parsear frontmatter con gray-matter.
- [ ] `src/services/resolver/source-parser.ts` -- parsear dueño/repositorio de GitHub, rutas locales, URLs.
- [ ] `src/adapters/git.ts` -- clonación superficial vía simple-git.
- [ ] `src/services/installer/file-ops.ts` -- symlink/copia con fallback.
- [ ] `src/services/installer/paths.ts` -- saneamiento de rutas, rutas canónicas.
- [ ] `src/services/installer/orchestrator.ts` -- coordinación del flujo de instalación.
- [ ] `src/services/lock/lock-file.ts` -- CRUD de .cognit-lock.json.
- [ ] `cognit add owner/repo` funciona de extremo a extremo (clonar -> descubrir -> detectar agentes -> instalar -> bloquear).
- [ ] `cognit add ./local/path` funciona para directorios locales.
- [ ] `cognit list` muestra los cognitivos instalados desde el archivo de bloqueo.
- [ ] `cognit remove <name>` elimina el cognitivo + actualiza el archivo de bloqueo.
- [ ] Pruebas unitarias para: source parser, scanner, parser, file-ops, paths, lock file.
- [ ] Prueba de integración: ciclo completo add -> list -> remove.

**Criterios de salida:** Un usuario puede instalar un cognitivo desde GitHub, verlo listado y eliminarlo. El archivo de bloqueo refleja el estado con precisión.

### M2: Pulido y Comandos Secundarios (2-3 días)

**Entregables:**
- [ ] `cognit init` -- andamiaje de SKILL.md / AGENT.md / PROMPT.md con prompts interactivos.
- [ ] `cognit check` -- comparar hashes del archivo de bloqueo con el SHA del árbol de GitHub.
- [ ] `cognit update` -- reinstalar cognitivos obsoletos (llamar a add internamente, no npx).
- [ ] `src/adapters/github.ts` -- API de GitHub para búsquedas de SHA de árbol.
- [ ] Selección interactiva de agentes cuando se detectan múltiples agentes (usando @clack/prompts).
- [ ] Selección interactiva de cognitivos cuando el repositorio contiene varios.
- [ ] Flag `--yes` para el modo no interactivo.
- [ ] Flag `--global` para el alcance de instalación global.
- [ ] Flag `--list` en add para previsualizar sin instalar.
- [ ] Texto de ayuda para cada comando.
- [ ] Pruebas unitarias para: andamiaje de init, lógica de check, lógica de update.

**Criterios de salida:** Los 7 comandos principales funcionan. El modo no interactivo soporta el uso en CI/CD.

### M3: Características DX y Diagnósticos (2-3 días)

**Entregables:**
- [ ] `cognit doctor` -- verificaciones de diagnóstico (portadas del patrón de synapse-cli):
  - El archivo de bloqueo existe y es un JSON válido.
  - Todas las entradas del archivo de bloqueo tienen archivos correspondientes en el disco.
  - Todos los symlinks son válidos (no rotos).
  - Se detecta al menos un agente.
  - Los directorios de los agentes existen y se puede escribir en ellos.
  - No hay archivos cognitivos huérfanos (en disco pero no en el bloqueo).
  - El frontmatter cognitivo es válido.
  - Verificación de versión (¿está cognit actualizado?).
- [ ] `src/services/agents-md/generator.ts` -- generación de AGENTS.md basada en marcadores (portado de synapse-cli).
- [ ] Autogenerar AGENTS.md al instalar/eliminar (opcional vía flag).
- [ ] Manejo de errores: clases de error personalizadas con mensajes útiles.
- [ ] Manejo grácil de Ctrl+C durante los prompts.
- [ ] Pruebas unitarias para: verificaciones doctor, generador AGENTS.md.

**Criterios de salida:** `cognit doctor` pasa en una instalación saludable. AGENTS.md se genera con el contenido correcto.

### M4: Pruebas, Documentación, Prep. Lanzamiento (2-3 días)

**Entregables:**
- [ ] Alcanzar >= 70% de cobertura de líneas, >= 60% de cobertura de ramas.
- [ ] Añadir pruebas faltantes para casos borde (symlinks rotos, archivo de bloqueo corrompido, agentes faltantes).
- [ ] README.md con: instalación, inicio rápido, referencia de comandos, explicación de tipos cognitivos.
- [ ] CONTRIBUTING.md con: configuración, pruebas, añadir agentes, visión general de la arquitectura.
- [ ] LICENCIA (MIT).
- [ ] Pipeline de CI: lint + verificación de tipos + pruebas en push.
- [ ] Prueba de publicación `npm publish` -- verificar el contenido del paquete.
- [ ] QA manual: probar en macOS con Claude Code, Cursor y al menos otro agente.
- [ ] CHANGELOG.md con notas del lanzamiento v0.1.0.

**Criterios de salida:** El paquete es publicable en npm. El README cubre todos los comandos. Las pruebas pasan en CI.

---

## 3. Riesgos y Mitigaciones

| Riesgo | Gravedad | Probabilidad | Mitigación |
|------|----------|-----------|------------|
| **Upstream añade agentes más rápido de lo que podemos portar** | Media | Alta | Las adiciones de agentes son solo archivos YAML (~5 min cada uno). Portabilidad por lotes mensual. No bloqueante. |
| **El formato SKILL.md diverge en el upstream** | Alta | Baja | El formato es simple y estable (nombre, descripción, metadatos). Monitorear lanzamientos del upstream. |
| **El manejo de symlinks falla en algún SO/sistema de arch.** | Media | Media | El fallback de copia está integrado. Probar en macOS + Linux. Windows se pospone a la v0.2. |
| **gray-matter o simple-git tienen cambios disruptivos** | Baja | Baja | Fijar versiones. Ambas son bibliotecas maduras y estables. |
| **Ancho de banda del desarrollador en solitario** | Alta | Alta | El MVP está acotado a ~10-14 días de trabajo. Los hitos son pequeños y se pueden entregar de forma independiente. M0+M1 por sí solos aportan valor central. |
| **Scope creep durante el desarrollo** | Media | Media | Este plan es el contrato de alcance. Las características que no figuran en la lista no están en la v0.1. Punto. |
| **El diseño del formato del archivo de bloqueo resulta inadecuado** | Media | Baja | Empezar con un esquema mínimo. El archivo de bloqueo es interno; el formato puede cambiar en la v0.x sin romper promesas. |
| **Las rutas de los dir. de agentes son erróneas para algunos agentes** | Media | Media | Portar YAML del fork de cognit (que ha sido validado). Probar con los 5 agentes principales manualmente. |

---

## 4. Dependencias y Requisitos Previos

### 4.1 Debe tener antes de empezar

- [ ] Node.js >= 20 instalado.
- [ ] Acceso al repo de cognit (para portar agentes YAML y el script de compilación).
- [ ] Acceso al repo de synapse-cli (para portar el logger, patrones doctor, patrones de prueba).
- [ ] Cuenta de npm para la publicación (se puede configurar durante M4).
- [ ] Repo de GitHub para cognit-cli creado.

### 4.2 Dependencias de Ejecución (5 en total)

| Paquete | Propósito | Versión |
|---------|---------|---------|
| `@clack/prompts` | Prompts de terminal interactivos | ^0.11.0 |
| `gray-matter` | Parseo de frontmatter YAML | ^4.0.3 |
| `simple-git` | Operaciones de clonación de Git | ^3.27.0 |
| `picocolors` | Colores de terminal | ^1.1.0 |
| `ora` | Spinners de terminal | ^9.0.0 |

### 4.3 Dependencias de Desarrollo

| Paquete | Propósito |
|---------|---------|
| `tsup` | Construcción/paquetización |
| `typescript` | Verificación de tipos |
| `vitest` | Pruebas |
| `@vitest/coverage-v8` | Cobertura |
| `tsx` | Ejecución de scripts (paso de compilación) |
| `yaml` | Parseo de YAML (solo scripts de construcción) |
| `eslint` + `@typescript-eslint/*` | Linting |
| `prettier` | Formateo |

---

## 5. Próximos Pasos Concretos

### Inmediatos (Hoy)

1. **Crear el repositorio `cognit-cli`** (o reutilizar el existente en el directorio de trabajo actual).
2. **Inicializar proyecto**: `npm init`, instalar deps, configurar tsconfig/tsup/vitest/eslint.
3. **Copiar archivos de agentes YAML** del fork de cognit (39 archivos + cognitive-types.yaml).
4. **Portar el script de compilación** del fork de cognit y verificar que genera TypeScript válido.
5. **Portar el logger** de synapse-cli.

### Esta semana

6. **Implementar M0** (andamiaje, pipeline de construcción, tipos generados).
7. **Empezar M1** (source parser, escáner, adaptador git, instalador).
8. **Hacer que `cognit add` funcione** de extremo a extremo con un repo real de GitHub.

### La próxima semana

9. **Completar M1** (list, remove, archivo de bloqueo, pruebas).
10. **Implementar M2** (init, check, update, prompts interactivos).
11. **Empezar M3** (doctor, generador AGENTS.md).

### Semana siguiente

12. **Completar M3** (pulido de DX, manejo de errores).
13. **Implementar M4** (pruebas, documentación, CI, prep. lanzamiento).
14. **Primera publicación en npm**: `cognit@0.1.0`.

---

## 6. Hoja de Ruta Post-MVP (v0.2+)

| Versión | Características |
|---------|----------|
| v0.2 | Soporte para Windows, `cognit find` (búsqueda en GitHub), proveedores remotos (Mintlify, HuggingFace) |
| v0.3 | Archivo de config. de proyecto, motor de sinc. (4-fases), modo watch |
| v0.4 | Motor de ejecución (ejecutar cognitivos vía APIs de proveedores) |
| v0.5 | Sistema de publicación, registro auto-hospedado |
| v1.0 | API estable, cobertura completa de proveedores, adopción de la comunidad |

---

*Plan MVP por el Agente D -- Arquitecto de Estrategia*
*Basado en la Matriz de Decisión Estratégica (04) y la Arquitectura Propuesta (05)*
