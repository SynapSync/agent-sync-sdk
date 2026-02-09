# 12 - Estrategia de Pruebas

**Autor:** Agent D -- Planificador de Implementación
**Fecha:** 2026-02-09
**Estado:** Plan

---

## 1. Filosofía de Pruebas

El SDK está diseñado para ser testeable desde el principio. Cada módulo depende de interfaces, no de implementaciones. Toda la E/S del sistema de archivos pasa por un `FileSystemAdapter` inyectable. Todas las llamadas externas (git, HTTP) pasan por clientes inyectables. El bus de eventos captura todos los efectos secundarios. Esto significa:

- **Las pruebas unitarias** son rápidas, deterministas y no requieren E/S real.
- **Las pruebas de integración** utilizan el sistema de archivos en memoria, nunca tocan el disco.
- **Las pruebas E2E** son las únicas que tocan el sistema de archivos real o la red.
- **Sin estado global**: las pruebas se ejecutan en paralelo de forma segura porque no hay singletons.

### Principios Clave de las Pruebas

1. **Todo en memoria**: utilizar `createMemoryFs()` para todas las operaciones del sistema de archivos en las pruebas unitarias y de integración.
2. **Verificación de eventos**: utilizar `createCapturingEventBus()` para confirmar secuencias de eventos correctas.
3. **Patrón Result**: probar tanto las rutas `ok` como `err` para cada operación.
4. **Sin bibliotecas de mocking**: utilizar simulaciones/falsificaciones manuales simples. La arquitectura de inyección de dependencias lo hace trivial.
5. **Probar el contrato, no la implementación**: probar a través de interfaces, no de detalles internos.

---

## 2. Framework de Pruebas y Configuración

### 2.1 Framework: Vitest

```typescript
// packages/cognit-core/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__generated__/**',
        'src/**/index.ts',     // archivos de barril
        'src/types/**',         // archivos de tipos puros (sin código de ejecución para probar)
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### 2.2 Estructura del Directorio de Pruebas

```
packages/cognit-core/tests/
  helpers/
    fixtures.ts               # Fixtures de prueba compartidas (cognitivos de muestra, archivos de bloqueo, etc.)
    memory-fs.ts              # Fábricas de sistemas de archivos en memoria pre-sembrados
    capturing-bus.ts          # Re-exportación de createCapturingEventBus con utilidades
    mock-providers.ts         # Implementaciones falsas de HostProvider
    mock-git.ts               # Fake GitClient
    sample-agents.ts          # Configs de agentes mínimas para pruebas

  types/
    branded.test.ts
    result.test.ts

  errors/
    hierarchy.test.ts
    codes.test.ts
    serialization.test.ts

  config/
    resolve.test.ts
    validation.test.ts

  events/
    event-bus.test.ts

  fs/
    memory.test.ts

  agents/
    registry.test.ts
    detector.test.ts
    generated.test.ts

  discovery/
    parser.test.ts
    scanner.test.ts
    discovery.test.ts
    plugin-manifest.test.ts

  source/
    parser.test.ts
    git.test.ts

  providers/
    registry.test.ts
    github.test.ts
    local.test.ts
    mintlify.test.ts
    huggingface.test.ts
    wellknown.test.ts
    direct.test.ts

  installer/
    paths.test.ts
    file-ops.test.ts
    installer.test.ts
    symlink.test.ts

  lock/
    manager.test.ts
    reader.test.ts
    writer.test.ts
    hash.test.ts
    migration.test.ts

  operations/
    add.test.ts
    list.test.ts
    remove.test.ts
    update.test.ts
    sync.test.ts
    check.test.ts
    init.test.ts
    find.test.ts

  integration/
    full-lifecycle.test.ts
    multi-agent.test.ts
    global-install.test.ts
    sync-drift.test.ts
    lock-migration.test.ts
    category-flow.test.ts

  e2e/
    add-from-local.test.ts
    init-and-add.test.ts

  fixtures/
    skills/
      valid-skill/SKILL.md
      minimal-skill/SKILL.md
      no-frontmatter/SKILL.md
      internal-skill/SKILL.md
    prompts/
      valid-prompt/PROMPT.md
    rules/
      valid-rule/RULE.md
    agents/
      valid-agent/AGENT.md
    lock/
      v4-lock.json
      v5-lock.json
      corrupted-lock.json
      empty-lock.json
    agent-yamls/
      minimal.yaml
      complex.yaml
      invalid-no-name.yaml
```

---

## 3. Pruebas Unitarias por Módulo

### 3.1 `types/` -- Branded Types y Utilidades de Result

**Qué probar:**
- Los constructores de tipos marcados validan y rechazan entradas incorrectas.
- Las utilidades de Result (`ok`, `err`, `unwrap`, `mapResult`) funcionan correctamente.

```typescript
// tests/types/branded.test.ts
describe('agentName', () => {
  it('acepta nombres de agentes válidos', () => {
    expect(agentName('claude-code')).toBe('claude-code');
    expect(agentName('cursor')).toBe('cursor');
    expect(agentName('a1')).toBe('a1');
  });

  it('rechaza nombres de agentes inválidos', () => {
    expect(() => agentName('')).toThrow();
    expect(() => agentName('Claude-Code')).toThrow(); // mayúsculas
    expect(() => agentName('nombre agente')).toThrow();  // espacios
    expect(() => agentName('-inicio')).toThrow();       // guion inicial
  });
});

describe('cognitiveName', () => {
  it('rechaza nombres con separadores de ruta', () => {
    expect(() => cognitiveName('../escape')).toThrow();
    expect(() => cognitiveName('ruta/nombre')).toThrow();
    expect(() => cognitiveName('ruta
ombre')).toThrow();
  });
});

// tests/types/result.test.ts
describe('Result', () => {
  it('unwrap devuelve el valor para un resultado ok', () => {
    const result = ok(42);
    expect(unwrap(result)).toBe(42);
  });

  it('unwrap lanza excepción para un resultado err', () => {
    const error = new SomeError('falló');
    const result = err(error);
    expect(() => unwrap(result)).toThrow(error);
  });

  it('mapResult transforma el valor de éxito', () => {
    const result = ok(5);
    const mapped = mapResult(result, (v) => v * 2);
    expect(mapped).toEqual({ ok: true, value: 10 });
  });

  it('mapResult pasa el error sin cambios', () => {
    const error = new SomeError('falló');
    const result = err(error);
    const mapped = mapResult(result, (v) => v * 2);
    expect(mapped).toEqual({ ok: false, error });
  });
});
```

### 3.2 `errors/` -- Jerarquía de Errores

**Qué probar:**
- Las cadenas de `instanceof` funcionan correctamente.
- Las propiedades `code` y `module` están establecidas.
- `toJSON()` produce una salida estructurada.
- Los constructores de errores aceptan y pasan la propiedad `cause`.

```typescript
// tests/errors/hierarchy.test.ts
describe('Jerarquía de errores', () => {
  it('ProviderFetchError es instancia de ProviderError y CognitError', () => {
    const error = new ProviderFetchError('https://example.com', 'github', 404);
    expect(error).toBeInstanceOf(ProviderFetchError);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toBeInstanceOf(CognitError);
    expect(error).toBeInstanceOf(Error);
  });

  it('todos los errores tienen código y módulo', () => {
    const errors = [
      new ProviderFetchError('url', 'github'),
      new PathTraversalError('/ruta/incorrecta'),
      new ParseError('/archivo.md'),
      new LockReadError('/lock.json'),
      new InvalidConfigError('cwd', 'vació'),
      new GitCloneError('url', 'tiempo de espera'),
      new AgentNotFoundError('desconocido'),
    ];

    for (const error of errors) {
      expect(error.code).toBeTruthy();
      expect(error.module).toBeTruthy();
    }
  });

  it('toJSON produce una salida estructurada', () => {
    const error = new ProviderFetchError('https://example.com', 'github', 404);
    const json = error.toJSON();
    expect(json).toEqual({
      name: 'ProviderFetchError',
      code: 'PROVIDER_FETCH_ERROR',
      module: 'providers',
      message: expect.stringContaining('github'),
      cause: undefined,
    });
  });
});
```

### 3.3 `config/` -- Configuración del SDK

**Qué probar:**
- `resolveConfig()` aplica todos los valores por defecto cuando se llama sin argumentos.
- `resolveConfig()` fusiona correctamente las sobrescrituras parciales.
- `validateConfig()` rechaza las configuraciones no válidas.

```typescript
// tests/config/resolve.test.ts
describe('resolveConfig', () => {
  it('aplica todos los valores por defecto cuando se llama sin argumentos', () => {
    const config = resolveConfig();
    expect(config.agentsDir).toBe('.agents');
    expect(config.lockFileName).toBe('.cognit-lock.json');
    expect(config.git.cloneTimeoutMs).toBe(30_000);
    expect(config.git.depth).toBe(1);
    expect(config.telemetry.enabled).toBe(true);
    expect(config.fs).toBeDefined();
  });

  it('fusiona las sobrescrituras parciales', () => {
    const config = resolveConfig({
      agentsDir: 'agentes-personalizados',
      git: { cloneTimeoutMs: 60_000, depth: 3 },
    });
    expect(config.agentsDir).toBe('agentes-personalizados');
    expect(config.git.cloneTimeoutMs).toBe(60_000);
    expect(config.git.depth).toBe(3);
    // Se conservan otros valores por defecto
    expect(config.lockFileName).toBe('.cognit-lock.json');
  });
});
```

### 3.4 `events/` -- Bus de Eventos

**Qué probar:**
- Los manejadores reciben cargas útiles tipadas correctas.
- `once()` se dispara exactamente una vez.
- La cancelación de la suscripción elimina el manejador.
- El bus de captura registra los eventos en orden.

```typescript
// tests/events/event-bus.test.ts
describe('EventBusImpl', () => {
  it('entrega cargas útiles tipadas a los manejadores', () => {
    const bus = new EventBusImpl();
    const received: unknown[] = [];

    bus.on('discovery:found', (payload) => {
      received.push(payload);
    });

    bus.emit('discovery:found', {
      cognitive: { name: 'test' as CognitiveName, type: 'skill', path: '/test', description: 'Test' },
      type: 'skill',
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toHaveProperty('cognitive.name', 'test');
  });

  it('once se dispara exactamente una vez', () => {
    const bus = new EventBusImpl();
    let callCount = 0;

    bus.once('sdk:initialized', () => { callCount++; });
    bus.emit('sdk:initialized', { configHash: 'abc' });
    bus.emit('sdk:initialized', { configHash: 'def' });

    expect(callCount).toBe(1);
  });

  it('unsubscribe elimina el manejador', () => {
    const bus = new EventBusImpl();
    let callCount = 0;

    const unsub = bus.on('sdk:error', () => { callCount++; });
    bus.emit('sdk:error', { error: new SomeError('test') });
    expect(callCount).toBe(1);

    unsub();
    bus.emit('sdk:error', { error: new SomeError('test') });
    expect(callCount).toBe(1); // No se vuelve a llamar
  });
});

describe('createCapturingEventBus', () => {
  it('registra todos los eventos emitidos en orden', () => {
    const bus = createCapturingEventBus();
    bus.emit('operation:start', { operation: 'add', options: {} });
    bus.emit('discovery:start', { path: '/tmp' });
    bus.emit('operation:complete', { operation: 'add', result: {}, durationMs: 100 });

    expect(bus.events).toHaveLength(3);
    expect(bus.events[0].event).toBe('operation:start');
    expect(bus.events[1].event).toBe('discovery:start');
    expect(bus.events[2].event).toBe('operation:complete');
  });
});
```

### 3.5 `fs/` -- Sistema de Archivos en Memoria

**Qué probar:**
- `mkdir` con `recursive: true`.
- Ida y vuelta de `readFile`/`writeFile`.
- `readdir` con `withFileTypes`.
- `symlink` y `readlink`.
- `exists` para archivos, directorios y rutas inexistentes.
- `rm` con recursividad.
- `stat`/`lstat` (isFile, isDirectory, isSymbolicLink).

```typescript
// tests/fs/memory.test.ts
describe('createMemoryFs', () => {
  it('admite mkdir recursivo', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/a/b/c', { recursive: true });
    expect(await fs.exists('/a/b/c')).toBe(true);
    expect(await fs.exists('/a/b')).toBe(true);
    expect(await fs.exists('/a')).toBe(true);
  });

  it('admite ida y vuelta readFile/writeFile', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/dir', { recursive: true });
    await fs.writeFile('/dir/archivo.txt', 'hola', 'utf-8');
    const content = await fs.readFile('/dir/archivo.txt', 'utf-8');
    expect(content).toBe('hola');
  });

  it('admite symlink y readlink', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/origen', { recursive: true });
    await fs.writeFile('/origen/archivo.txt', 'datos', 'utf-8');
    await fs.symlink('/origen', '/enlace');
    const target = await fs.readlink('/enlace');
    expect(target).toBe('/origen');
  });

  it('admite readdir con tipos de archivo', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/dir/sub', { recursive: true });
    await fs.writeFile('/dir/archivo.txt', 'datos', 'utf-8');
    const entries = await fs.readdir('/dir', { withFileTypes: true });
    expect(entries).toHaveLength(2);
    const file = entries.find(e => e.name === 'archivo.txt');
    const sub = entries.find(e => e.name === 'sub');
    expect(file?.isFile()).toBe(true);
    expect(sub?.isDirectory()).toBe(true);
  });

  it('puede sembrarse con archivos iniciales', async () => {
    const fs = createMemoryFs({
      '/project/.agents/cognit/skills/frontend/react-19/SKILL.md': '---
name: React 19
---',
    });
    const content = await fs.readFile('/project/.agents/cognit/skills/frontend/react-19/SKILL.md', 'utf-8');
    expect(content).toContain('React 19');
  });
});
```

### 3.6 `agents/` -- Registro de Agentes

**Qué probar:**
- `getAll()` devuelve todos los agentes registrados.
- `get()` devuelve un agente específico o undefined.
- `getUniversalAgents()` devuelve agentes con localRoot `.agents`.
- `isUniversal()` detecta agentes universales.
- `getDir()` resuelve las rutas correctas.
- `register()` añade agentes en tiempo de ejecución, rechaza duplicados.
- `detectInstalled()` con un sistema de archivos simulado.

```typescript
// tests/agents/registry.test.ts
describe('AgentRegistryImpl', () => {
  it('devuelve todos los agentes generados', () => {
    const registry = new AgentRegistryImpl(config, eventBus);
    const all = registry.getAll();
    expect(all.size).toBeGreaterThan(35); // 39+ agentes
    expect(all.has('claude-code')).toBe(true);
    expect(all.has('cursor')).toBe(true);
  });

  it('detecta agentes universales', () => {
    const registry = new AgentRegistryImpl(config, eventBus);
    expect(registry.isUniversal('codex' as AgentType)).toBe(true);  // localRoot: .agents
    expect(registry.isUniversal('cursor' as AgentType)).toBe(false); // localRoot: .cursor
  });

  it('resuelve directorios de agentes', () => {
    const registry = new AgentRegistryImpl(config, eventBus);
    const dir = registry.getDir('claude-code' as AgentType, 'skill', 'local');
    expect(dir).toBe('.claude/skills');
  });
});
```

### 3.7 `discovery/` -- Descubrimiento de Cognitivos

**Qué probar:**
- Análisis de frontmatter: válido, mínimo, campos faltantes, YAML inválido.
- Escáner: encuentra archivos en directorios anidados.
- Descubrimiento completo: filtrado de tipo, filtrado de subruta, filtrado interno.
- Análisis de manifiesto de plugin.

```typescript
// tests/discovery/parser.test.ts
describe('parseCognitiveMd', () => {
  it('analiza frontmatter válido', () => {
    const content = `---
name: React 19 Best Practices
description: Patrones modernos de React
version: 1.2.0
category: frontend
tags:
  - react
  - typescript
---
# React 19 Best Practices
Contenido aquí.`;

    const result = parseCognitiveMd(content, '/skills/react-19/SKILL.md');
    expect(result.name).toBe('React 19 Best Practices');
    expect(result.description).toBe('Patrones modernos de React');
    expect(result.metadata.version).toBe('1.2.0');
    expect(result.metadata.category).toBe('frontend');
    expect(result.metadata.tags).toEqual(['react', 'typescript']);
  });

  it('lanza ParseError si falta el nombre', () => {
    const content = `---
description: Sin nombre aquí
---
Contenido.`;

    expect(() => parseCognitiveMd(content, '/archivo.md')).toThrow(ParseError);
  });

  it('lanza ParseError si falta la descripción', () => {
    const content = `---
name: Tiene Nombre
---
Contenido.`;

    expect(() => parseCognitiveMd(content, '/archivo.md')).toThrow(ParseError);
  });
});
```

### 3.8 `source/` -- Análisis del Origen

**Qué probar:**
- Todas las variantes de entrada del origen (ver 05-provider-system.md Sección 6.3).

```typescript
// tests/source/parser.test.ts
describe('SourceParserImpl', () => {
  const parser = new SourceParserImpl();

  const cases: Array<[string, Partial<SourceDescriptor>]> = [
    ['vercel-labs/skills', { kind: 'github', url: expect.stringContaining('vercel-labs/skills') }],
    ['vercel-labs/skills/react', { kind: 'github', subpath: 'react' }],
    ['vercel-labs/skills@find-skills', { kind: 'github', nameFilter: 'find-skills' }],
    ['./mis-skills', { kind: 'local' }],
    ['/ruta/abs/skills', { kind: 'local' }],
    ['.', { kind: 'local' }],
    ['https://github.com/o/r', { kind: 'github' }],
    ['https://github.com/o/r/tree/main', { kind: 'github', ref: 'main' }],
    ['https://github.com/o/r/tree/main/skills', { kind: 'github', ref: 'main', subpath: 'skills' }],
    ['https://docs.bun.com/docs/SKILL.md', { kind: 'direct-url' }],
    ['https://example.com', { kind: 'well-known' }],
  ];

  it.each(cases)('analiza "%s" correctamente', (input, expected) => {
    const result = parser.parse(input);
    expect(result).toMatchObject(expected);
  });
});
```

### 3.9 `providers/` -- Sistema de Proveedores

**Qué probar por proveedor:**
- `match()` con URLs coincidentes y no coincidentes.
- Conversión `toRawUrl()`.
- Determinismo de `getSourceIdentifier()`.
- `fetchCognitive()` con HTTP simulado (éxito y fallo).
- `fetchAll()` para los proveedores que lo admiten.

```typescript
// tests/providers/github.test.ts
describe('GitHubProvider', () => {
  const provider = new GitHubProvider();

  it('coincide con URLs de GitHub', () => {
    expect(provider.match('https://github.com/owner/repo').matches).toBe(true);
    expect(provider.match('https://github.com/o/r/tree/main').matches).toBe(true);
  });

  it('no coincide con URLs que no sean de GitHub', () => {
    expect(provider.match('https://gitlab.com/owner/repo').matches).toBe(false);
    expect(provider.match('./ruta-local').matches).toBe(false);
  });

  it('convierte URLs de blob a URLs raw', () => {
    expect(provider.toRawUrl('https://github.com/o/r/blob/main/SKILL.md'))
      .toBe('https://raw.githubusercontent.com/o/r/main/SKILL.md');
  });

  it('devuelve un identificador de origen estable', () => {
    expect(provider.getSourceIdentifier('https://github.com/owner/repo')).toBe('owner/repo');
    expect(provider.getSourceIdentifier('https://github.com/owner/repo/tree/main')).toBe('owner/repo');
  });
});
```

### 3.10 `installer/` -- Sistema de Instalación

**Qué probar:**
- Sanitización de rutas.
- Prevención de salto de ruta.
- Modo symlink: dir canónico creado + symlinks para agentes no universales.
- Modo copia: copia directa al dir del agente.
- Respaldo de symlink a copia.
- Omisión de agente universal (no se necesita symlink).
- Detección de ELOOP.

```typescript
// tests/installer/paths.test.ts
describe('sanitizeName', () => {
  it.each([
    ['React 19', 'react-19'],
    ['mi_skill', 'my-skill'],
    ['../escape', 'escape'],
    ['...puntos...', 'puntos'],
    ['MAYUS', 'upper'],
    ['a'.repeat(300), expect.stringMatching(/^a{255}$/)],
    ['', 'unnamed-cognitive'],
  ])('sanitiza "%s" a "%s"', (input, expected) => {
    expect(sanitizeName(input)).toBe(expected);
  });
});

describe('isPathSafe', () => {
  it('acepta rutas dentro de la base', () => {
    expect(isPathSafe('/proyecto', '/proyecto/sub/archivo')).toBe(true);
  });

  it('rechaza rutas que escapan de la base', () => {
    expect(isPathSafe('/proyecto', '/proyecto/../escape')).toBe(false);
    expect(isPathSafe('/proyecto', '/otro/dir')).toBe(false);
  });
});

// tests/installer/installer.test.ts
describe('InstallerImpl', () => {
  it('crea el dir canónico y el symlink para un agente no universal', async () => {
    const fs = createMemoryFs();
    const registry = createTestAgentRegistry(); // cursor = no universal
    const fileOps = new FileOperationsImpl(fs);
    const eventBus = createCapturingEventBus();
    const installer = new InstallerImpl(registry, fileOps, eventBus);

    const result = await installer.install(
      { kind: 'local', cognitive: testCognitive },
      { agent: 'cursor' as AgentType, scope: 'project', mode: 'symlink' },
      { cwd: '/proyecto' },
    );

    expect(result.success).toBe(true);
    // El dir canónico existe
    expect(await fs.exists('/proyecto/.agents/cognit/skills/general/test-skill/SKILL.md')).toBe(true);
    // El symlink existe
    expect(await fs.exists('/proyecto/.cursor/skills/test-skill')).toBe(true);
  });

  it('omite el symlink para un agente universal', async () => {
    // codex usa .agents/ como localRoot -- no se necesita symlink
    const result = await installer.install(
      { kind: 'local', cognitive: testCognitive },
      { agent: 'codex' as AgentType, scope: 'project', mode: 'symlink' },
      { cwd: '/proyecto' },
    );

    expect(result.success).toBe(true);
    // El dir canónico es el dir del agente -- sin symlink
  });

  it('recurre a la copia cuando falla el symlink', async () => {
    const fs = createMemoryFs();
    // Hacer que symlink lance excepción
    const originalSymlink = fs.symlink;
    fs.symlink = async () => { throw new Error('EPERM'); };

    const result = await installer.install(
      { kind: 'local', cognitive: testCognitive },
      { agent: 'cursor' as AgentType, scope: 'project', mode: 'symlink' },
      { cwd: '/proyecto' },
    );

    expect(result.success).toBe(true);
    expect(result.symlinkFailed).toBe(true);
    expect(result.mode).toBe('copy');
    fs.symlink = originalSymlink;
  });
});
```

### 3.11 `lock/` -- Sistema de Archivo de Bloqueo

**Qué probar:**
- Lectura: v5 válido, v4 válido (migración), JSON corrupto, archivo faltante.
- Escritura: escritura atómica, ida y vuelta del contenido.
- CRUD: addEntry, removeEntry, getEntry, getAllEntries.
- Agrupación: getBySource.
- Hash: determinismo de computeContentHash.
- Migración: mapeo de campos v4 -> v5.

```typescript
// tests/lock/manager.test.ts
describe('LockManagerImpl', () => {
  it('devuelve el bloqueo vacío cuando el archivo no existe', async () => {
    const fs = createMemoryFs();
    const manager = new LockManagerImpl(config, new FileOperationsImpl(fs), eventBus);
    const lock = await manager.read();
    expect(lock.version).toBe(5);
    expect(Object.keys(lock.cognitives)).toHaveLength(0);
  });

  it('añade y recupera entradas', async () => {
    const fs = createMemoryFs();
    const manager = new LockManagerImpl(config, new FileOperationsImpl(fs), eventBus);

    await manager.addEntry('test-skill', {
      source: 'owner/repo' as SourceIdentifier,
      sourceType: 'github',
      sourceUrl: 'https://github.com/owner/repo',
      contentHash: 'abc123',
      cognitiveType: 'skill',
    });

    const entry = await manager.getEntry('test-skill');
    expect(entry).not.toBeNull();
    expect(entry!.source).toBe('owner/repo');
    expect(entry!.installedAt).toBeTruthy();
    expect(entry!.updatedAt).toBeTruthy();
  });

  it('removeEntry devuelve true si existía', async () => {
    // ... añadir luego eliminar, verificar true
  });

  it('removeEntry devuelve false si no se encontró', async () => {
    const result = await manager.removeEntry('no-existente');
    expect(result).toBe(false);
  });
});
```

### 3.12 `operations/` -- Operaciones del SDK

**Qué probar por operación:**
- Ruta feliz con todas las dependencias simuladas.
- Rutas de error (no encontrado, error de análisis, etc.).
- Secuencia de emisión de eventos.
- Diseño no interactivo (devuelve datos, no solicita información).

```typescript
// tests/operations/add.test.ts
describe('AddOperation', () => {
  it('completa el flujo add completo', async () => {
    const eventBus = createCapturingEventBus();
    const fakeFs = createMemoryFs({
      '/tmp/clon/skills/react-19/SKILL.md': '---
name: React 19
description: Patrones de React
---
Contenido',
    });
    const fakeGit: GitClient = {
      clone: async () => '/tmp/clon',
      cleanup: async () => {},
    };

    const addOp = new AddOperation({
      discoveryService: new DiscoveryServiceImpl(fakeFs, eventBus),
      providerRegistry: new ProviderRegistryImpl(eventBus),
      sourceParser: new SourceParserImpl(),
      gitClient: fakeGit,
      installer: createTestInstaller(fakeFs, eventBus),
      lockManager: createTestLockManager(fakeFs, eventBus),
      agentRegistry: createTestAgentRegistry(),
      eventBus,
      config: resolveConfig({ fs: fakeFs, cwd: '/proyecto' }),
    });

    const result = await addOp.execute('owner/repo', {
      agents: ['claude-code' as AgentType],
      scope: 'project',
      mode: 'symlink',
      installAll: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.installed).toHaveLength(1);
      expect(result.value.installed[0].cognitive.name).toBe('React 19');
    }

    // Verificar secuencia de eventos
    const eventTypes = eventBus.events.map(e => e.event);
    expect(eventTypes).toContain('operation:start');
    expect(eventTypes).toContain('git:clone:start');
    expect(eventTypes).toContain('discovery:start');
    expect(eventTypes).toContain('install:start');
    expect(eventTypes).toContain('operation:complete');
  });

  it('devuelve los cognitivos descubiertos cuando no se especifican agentes', async () => {
    // Probar el patrón de dos fases no interactivo
    const result = await addOp.execute('owner/repo', {
      // Sin agentes especificados
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.discovered).toHaveLength(1);
      expect(result.value.installed).toHaveLength(0);
    }
  });
});
```

---

## 4. Pruebas de Integración

Las pruebas de integración conectan las implementaciones reales junto con el sistema de archivos en memoria. Prueban las interacciones entre los módulos sin tocar el disco ni la red real.

### 4.1 Prueba de Ciclo de Vida Completo

```typescript
// tests/integration/full-lifecycle.test.ts
describe('Ciclo de vida completo: add -> list -> update -> remove', () => {
  let sdk: CognitSDK;
  let fs: FileSystemAdapter;

  beforeEach(() => {
    fs = createMemoryFs();
    sdk = createCognitSDK({
      cwd: '/proyecto',
      fs,
      telemetry: { enabled: false },
    });
  });

  it('añade, lista y elimina un cognitivo', async () => {
    // 1. Añadir desde una ruta local
    await seedMemoryFs(fs, {
      '/origen/skills/mi-skill/SKILL.md': `---
name: Mi Skill
description: Skill de prueba
---
Contenido aquí.`,
    });

    const addResult = await sdk.add('/origen', {
      agents: ['claude-code' as AgentType],
      scope: 'project',
      installAll: true,
    });
    expect(addResult.ok).toBe(true);

    // 2. Listar
    const listResult = await sdk.list();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value.cognitives).toHaveLength(1);
      expect(listResult.value.cognitives[0].cognitive.name).toBe('Mi Skill');
    }

    // 3. Eliminar
    const removeResult = await sdk.remove('mi-skill');
    expect(removeResult.ok).toBe(true);

    // 4. Verificar que se ha ido
    const listResult2 = await sdk.list();
    expect(listResult2.ok).toBe(true);
    if (listResult2.ok) {
      expect(listResult2.value.cognitives).toHaveLength(0);
    }
  });
});
```

### 4.2 Instalación en Múltiples Agentes

```typescript
// tests/integration/multi-agent.test.ts
describe('Instalación en múltiples agentes', () => {
  it('instala en claude-code y cursor con los symlinks correctos', async () => {
    const fs = createMemoryFs();
    const sdk = createCognitSDK({ cwd: '/proyecto', fs });

    await seedSkill(fs, '/origen', 'react-19', 'React 19');

    const result = await sdk.add('/origen', {
      agents: ['claude-code', 'cursor'] as AgentType[],
      scope: 'project',
      mode: 'symlink',
      installAll: true,
    });

    expect(result.ok).toBe(true);

    // El dir canónico existe
    expect(await fs.exists('/proyecto/.agents/cognit/skills/general/react-19/SKILL.md')).toBe(true);

    // Symlink de Claude
    expect(await fs.exists('/proyecto/.claude/skills/react-19')).toBe(true);
    const claudeLink = await fs.readlink('/proyecto/.claude/skills/react-19');
    expect(claudeLink).toContain('.agents/cognit/skills');

    // Symlink de Cursor
    expect(await fs.exists('/proyecto/.cursor/skills/react-19')).toBe(true);
  });
});
```

### 4.3 Detección de Desviación de Sincronización (Sync Drift)

```typescript
// tests/integration/sync-drift.test.ts
describe('Detección de desviaciones de sincronización', () => {
  it('detecta y corrige un symlink roto', async () => {
    const fs = createMemoryFs();
    const sdk = createCognitSDK({ cwd: '/proyecto', fs });

    // Instalar un cognitivo
    await seedAndInstall(sdk, fs);

    // Romper el symlink eliminando el dir canónico
    await fs.rm('/proyecto/.agents/cognit/skills/general/test-skill', { recursive: true });

    // Sync debería detectar la desviación
    const syncResult = await sdk.sync();
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.value.synced.length).toBeGreaterThan(0);
    }
  });
});
```

### 4.4 Migración del Archivo de Bloqueo

```typescript
// tests/integration/lock-migration.test.ts
describe('Migración del archivo de bloqueo', () => {
  it('migra un archivo de bloqueo v4 a v5 en la primera lectura', async () => {
    const v4Lock = {
      version: 4,
      cognitives: {
        'mi-skill': {
          source: 'owner/repo',
          sourceType: 'github',
          sourceUrl: 'https://github.com/owner/repo',
          cognitiveFolderHash: 'abc123',
          cognitiveType: 'skill',
          installedAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      lastSelectedAgents: ['claude-code'],
    };

    const fs = createMemoryFs({
      '/proyecto/.agents/cognit/.cognit-lock.json': JSON.stringify(v4Lock),
    });

    const sdk = createCognitSDK({ cwd: '/proyecto', fs });
    const listResult = await sdk.list({ includeLockData: true });

    expect(listResult.ok).toBe(true);
    // Verificar que se realizó la migración (v4 cognitives -> v5 entries)
  });
});
```

---

## 5. Pruebas E2E

Las pruebas E2E utilizan el sistema de archivos real y, opcionalmente, la red. Son más lentas y pueden omitirse en CI si no hay acceso a la red.

### 5.1 Añadir Desde una Ruta Local

```typescript
// tests/e2e/add-from-local.test.ts
describe('E2E: Añadir desde una ruta local', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'cognit-test-'));
    // Crear un archivo de skill
    const skillDir = join(tempDir, 'origen', 'skills', 'test-skill');
    await mkdir(skillDir, { recursive: true });
    await writeFile(join(skillDir, 'SKILL.md'), `---
name: Test Skill
description: Una skill de prueba para E2E
---
# Test Skill
Esta es una skill de prueba.`);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('instala una skill desde un directorio local', async () => {
    const projectDir = join(tempDir, 'proyecto');
    await mkdir(projectDir, { recursive: true });

    const sdk = createCognitSDK({ cwd: projectDir });

    const result = await sdk.add(join(tempDir, 'origen'), {
      agents: ['claude-code' as AgentType],
      scope: 'project',
      installAll: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.installed).toHaveLength(1);
    }

    // Verificar los archivos en el sistema de archivos real
    const canonicalPath = join(projectDir, '.agents', 'cognit', 'skills', 'general', 'test-skill', 'SKILL.md');
    expect(existsSync(canonicalPath)).toBe(true);
  });
});
```

### 5.2 Init y Add

```typescript
// tests/e2e/init-and-add.test.ts
describe('E2E: Iniciar un cognitivo y añadirlo', () => {
  it('crea el andamiaje de una nueva skill y la instala', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'cognit-test-'));
    const sdk = createCognitSDK({ cwd: tempDir });

    // Init
    const initResult = await sdk.init({ name: 'mi-nueva-skill', cognitiveType: 'skill' });
    // (init es una operación, no está aún en la interfaz de CognitSDK -- ajustar si es necesario)

    // Verificar que se creó la plantilla
    expect(existsSync(join(tempDir, 'mi-nueva-skill', 'SKILL.md'))).toBe(true);

    // Limpiar
    await rm(tempDir, { recursive: true, force: true });
  });
});
```

---

## 6. Fixtures de Prueba

### 6.1 Fixtures de Archivos Cognitivos

```markdown
<!-- fixtures/skills/valid-skill/SKILL.md -->
---
name: Skill de Prueba Válida
description: Una skill con todos los campos de frontmatter
version: 1.0.0
category: frontend
tags:
  - react
  - testing
author: Autor de Prueba
globs:
  - "**/*.tsx"
---
# Skill de Prueba Válida

Esta es una skill de prueba válida con el frontmatter completo.

## Instrucciones
Hacer la cosa correctamente.
```

```markdown
<!-- fixtures/skills/minimal-skill/SKILL.md -->
---
name: Skill Mínima
description: Solo los campos obligatorios
---
# Skill Mínima

Contenido.
```

```markdown
<!-- fixtures/skills/no-frontmatter/SKILL.md -->
# Sin Frontmatter

Este archivo no tiene frontmatter YAML y debería fallar el análisis.
```

```markdown
<!-- fixtures/skills/internal-skill/SKILL.md -->
---
name: Skill Interna
description: Debería omitirse por el descubrimiento por defecto
internal: true
---
# Skill Interna

Oculta del descubrimiento normal.
```

### 6.2 Fixtures del Archivo de Bloqueo

```json
// fixtures/lock/v4-lock.json
{
  "version": 4,
  "cognitives": {
    "react-19": {
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "sourceUrl": "https://github.com/vercel-labs/agent-skills",
      "cognitivePath": "skills/react-19",
      "cognitiveFolderHash": "abc123",
      "cognitiveType": "skill",
      "installedAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  },
  "lastSelectedAgents": ["claude-code", "cursor"]
}
```

```json
// fixtures/lock/v5-lock.json
{
  "version": 5,
  "cognitives": {
    "react-19": {
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "sourceUrl": "https://github.com/vercel-labs/agent-skills",
      "contentHash": "e3b0c442...",
      "cognitiveType": "skill",
      "installedAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    }
  }
}
```

### 6.3 Fixtures de YAML de Agentes

```yaml
# fixtures/agent-yamls/minimal.yaml
name: agente-prueba
displayName: Agente de Prueba
rootDir: .agente-prueba
```

```yaml
# fixtures/agent-yamls/complex.yaml
name: agente-complejo
displayName: Agente Complejo
localRoot: .agents
globalRoot: ${XDG_CONFIG_HOME}/agente-complejo
detect:
  - xdgConfig: agente-complejo
  - envResolvedPath:
      var: claudeHome
      subpath: skills
showInUniversalList: false
```

---

## 7. Mocks y Fakes

### 7.1 Sistema de Archivos en Memoria (Herramienta de Prueba Principal)

La función `createMemoryFs(seed?)` es la herramienta de prueba principal. Implementa `FileSystemAdapter` con un árbol en memoria:

```typescript
// Sembrar con archivos
const fs = createMemoryFs({
  '/proyecto/.agents/cognit/skills/frontend/react-19/SKILL.md': '---
name: React 19
---',
  '/proyecto/.claude/skills/react-19': '@symlink:/proyecto/.agents/cognit/skills/frontend/react-19',
});
```

### 7.2 Bus de Eventos de Captura

```typescript
// Captura todos los eventos para realizar aserciones
const bus = createCapturingEventBus();
// Después de la operación:
expect(bus.events).toEqual([
  { event: 'operation:start', payload: expect.objectContaining({ operation: 'add' }) },
  { event: 'discovery:start', payload: expect.objectContaining({ path: '/tmp' }) },
  // ...
]);
```

### 7.3 Cliente de Git Falso

```typescript
// tests/helpers/mock-git.ts
export function createFakeGitClient(cloneResult: string): GitClient {
  return {
    clone: async () => cloneResult,
    cleanup: async () => {},
  };
}
```

### 7.4 Proveedor Falso

```typescript
// tests/helpers/mock-providers.ts
export function createFakeProvider(
  id: string,
  matchPattern: RegExp,
  cognitives: RemoteCognitive[],
): HostProvider {
  return {
    id,
    displayName: `Fake ${id}`,
    match: (source) => ({ matches: matchPattern.test(source) }),
    fetchCognitive: async () => cognitives[0] ?? null,
    fetchAll: async () => cognitives,
    toRawUrl: (url) => url,
    getSourceIdentifier: (source) => `fake/${id}`,
  };
}
```

---

## 8. Probar las Operaciones del Sistema de Archivos

### 8.1 Estrategia

Todas las operaciones del sistema de archivos pasan por el `FileSystemAdapter`. Las pruebas unitarias y de integración utilizan `createMemoryFs()`. Solo las pruebas E2E utilizan el sistema de archivos real.

### 8.2 Qué Debe Admitir el FS en Memoria

| Operación | Comportamiento Requerido |
|-----------|-------------------|
| `readFile` | Devolver contenido o lanzar ENOENT |
| `writeFile` | Crear archivo (y los dirs padres si faltan) |
| `mkdir` | Crear directorio, admitir `recursive: true` |
| `readdir` | Devolver entradas con `isFile()`, `isDirectory()`, `isSymbolicLink()` |
| `stat` | Devolver estadísticas para la ruta real (seguir symlinks) |
| `lstat` | Devolver estadísticas sin seguir symlinks |
| `symlink` | Crear una entrada de enlace simbólico |
| `readlink` | Devolver el destino del symlink |
| `rm` | Eliminar archivo/dir, admitir `recursive: true`, `force: true` |
| `rename` | Movimiento atómico (para escrituras del archivo de bloqueo) |
| `exists` | Verdadero si la ruta existe (seguir symlinks) |
| `copyDirectory` | Copia recursiva de directorios |

### 8.3 Probar el Comportamiento de los Symlinks

```typescript
describe('Operaciones de symlink', () => {
  it('crea y resuelve symlinks', async () => {
    const fs = createMemoryFs();
    await fs.mkdir('/origen/dir', { recursive: true });
    await fs.writeFile('/origen/dir/archivo.txt', 'contenido', 'utf-8');
    await fs.symlink('/origen/dir', '/enlace');

    // lstat ve el symlink
    const lstats = await fs.lstat('/enlace');
    expect(lstats.isSymbolicLink()).toBe(true);

    // stat sigue el symlink
    const stats = await fs.stat('/enlace');
    expect(stats.isDirectory()).toBe(true);

    // readlink devuelve el destino
    const target = await fs.readlink('/enlace');
    expect(target).toBe('/origen/dir');
  });
});
```

---

## 9. Probar el Pipeline de Compilación YAML

### 9.1 Pruebas del Script de Compilación

```typescript
// tests/scripts/compile-agents.test.ts
describe('compile-agents', () => {
  it('genera la unión AgentType correcta a partir de archivos YAML', async () => {
    const yamls = [
      { path: 'test-a.yaml', content: 'name: test-a
displayName: Test A
rootDir: .test-a' },
      { path: 'test-b.yaml', content: 'name: test-b
displayName: Test B
rootDir: .test-b' },
    ];

    const result = await compileAgents(yamls, cognitiveTypes);

    expect(result.agentType).toContain("'test-a'");
    expect(result.agentType).toContain("'test-b'");
  });

  it('rechaza nombres de agentes duplicados', () => {
    const yamls = [
      { path: 'dup.yaml', content: 'name: dup
displayName: Dup
rootDir: .dup' },
      { path: 'dup2.yaml', content: 'name: dup
displayName: Dup 2
rootDir: .dup2' },
    ];

    expect(() => validateAgents(yamls)).toThrow(/Nombre de agente duplicado/);
  });

  it('aplica convenciones cuando solo se especifica rootDir', () => {
    const yaml = { path: 'simple.yaml', content: 'name: simple
displayName: Simple
rootDir: .simple' };
    const resolved = resolveAgent(yaml);

    expect(resolved.localRoot).toBe('.simple');
    expect(resolved.globalRoot).toBe('~/.simple');
    expect(resolved.detect).toEqual([{ homeDir: '.simple' }]);
  });

  it('genera los cuerpos de las funciones detectInstalled', () => {
    const yamls = [
      { path: 'test.yaml', content: `name: test
displayName: Test
rootDir: .test
detect:
  - homeDir: ".test"` },
    ];

    const result = compileAgents(yamls, cognitiveTypes);
    expect(result.agents).toContain('existsSync(join(home,');
  });
});
```

---

## 10. Objetivos de Cobertura

### 10.1 Objetivos por Módulo

| Módulo | Sentencias | Ramas | Funciones | Líneas |
|--------|-----------|----------|-----------|-------|
| `types/branded.ts` | 95% | 90% | 95% | 95% |
| `types/result.ts` | 100% | 100% | 100% | 100% |
| `errors/*` | 90% | 85% | 90% | 90% |
| `config/*` | 90% | 85% | 90% | 90% |
| `events/*` | 95% | 90% | 95% | 95% |
| `fs/memory.ts` | 90% | 85% | 90% | 90% |
| `agents/registry.ts` | 85% | 80% | 85% | 85% |
| `agents/detector.ts` | 80% | 75% | 80% | 80% |
| `discovery/parser.ts` | 90% | 85% | 90% | 90% |
| `discovery/scanner.ts` | 85% | 80% | 85% | 85% |
| `providers/registry.ts` | 90% | 85% | 90% | 90% |
| `providers/*.ts` (cada uno) | 80% | 75% | 80% | 80% |
| `source/parser.ts` | 90% | 85% | 90% | 90% |
| `source/git.ts` | 75% | 70% | 75% | 75% |
| `installer/installer.ts` | 85% | 80% | 85% | 85% |
| `installer/file-ops.ts` | 85% | 80% | 85% | 85% |
| `installer/paths.ts` | 95% | 90% | 95% | 95% |
| `lock/manager.ts` | 90% | 85% | 90% | 90% |
| `lock/reader.ts` | 85% | 80% | 85% | 85% |
| `lock/hash.ts` | 90% | 85% | 90% | 90% |
| `lock/migration.ts` | 85% | 80% | 85% | 85% |
| `operations/*.ts` (cada una) | 80% | 75% | 80% | 80% |
| `sdk.ts` | 85% | 80% | 85% | 85% |
| **Total** | **85%** | **80%** | **85%** | **85%** |

### 10.2 Exclusiones de la Cobertura

- `src/**/__generated__/**`: código generado automáticamente.
- `src/**/index.ts`: re-exportaciones de barril (sin lógica).
- `src/types/**`: archivos de tipos puros sin código de ejecución (excepto branded.ts y result.ts que tienen constructores).
- `src/fs/node.ts`: envoltorio delgado sobre la biblioteca estándar de Node.js (probado mediante integración/E2E).

---

## 11. Integración con CI

### 11.1 Workflow de GitHub Actions

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run compile-agents
      - run: pnpm run lint
      - run: pnpm run build
      - run: pnpm run test -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: packages/cognit-core/coverage/lcov.info
```

### 11.2 Modos de Ejecución de Pruebas

| Modo | Comando | Qué se ejecuta | Cuándo |
|------|---------|-----------|------|
| Unitario | `vitest run` | Todas las pruebas unitarias | En cada commit |
| Integración | `vitest run tests/integration/` | Pruebas de integración | En cada commit |
| E2E (local) | `vitest run tests/e2e/ --exclude *github*` | E2E sin red | En cada commit |
| E2E (completo) | `vitest run tests/e2e/` | Todas las E2E incluyendo red | Manual / nocturno |
| Cobertura | `vitest run --coverage` | Todas las pruebas + cobertura | En cada PR |

---

## 12. Lista de Verificación de Calidad de las Pruebas

Para cada módulo, antes de considerarlo "probado":

- [ ] Ruta feliz cubierta.
- [ ] Rutas de error/fallo cubiertas.
- [ ] Casos de borde identificados y probados (entrada vacía, null, valores límite).
- [ ] Eventos verificados (eventos correctos emitidos en el orden correcto).
- [ ] Patrón Result probado (ramas tanto `ok` como `err`).
- [ ] Ninguna prueba depende del orden de ejecución de las pruebas.
- [ ] Ninguna prueba depende del sistema de archivos real ni de la red (excepto E2E).
- [ ] Ninguna prueba utiliza `setTimeout` u otros constructores que dependan del tiempo.
- [ ] Los nombres de las pruebas describen claramente lo que se está probando.
- [ ] Las fixtures se comparten a través de `tests/helpers/` y `tests/fixtures/`.
