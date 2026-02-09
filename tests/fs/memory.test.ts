import { describe, it, expect } from 'vitest';
import { InMemoryFileSystem, createMemoryFs } from '../../src/fs/memory.js';

function makeFs() {
  return new InMemoryFileSystem();
}

describe('InMemoryFileSystem', () => {
  it('writeFile + readFile roundtrip', async () => {
    const fs = makeFs();
    await fs.writeFile('/tmp/hello.txt', 'world', 'utf-8');
    const content = await fs.readFile('/tmp/hello.txt', 'utf-8');
    expect(content).toBe('world');
  });

  it('mkdir with recursive: true creates nested directories', async () => {
    const fs = makeFs();
    await fs.mkdir('/a/b/c', { recursive: true });
    const stat = await fs.stat('/a/b/c');
    expect(stat.isDirectory()).toBe(true);
  });

  it('readdir returns correct entries with isFile()/isDirectory()/isSymbolicLink()', async () => {
    const fs = makeFs();
    await fs.mkdir('/root', { recursive: true });
    await fs.writeFile('/root/file.txt', 'data', 'utf-8');
    await fs.mkdir('/root/subdir', { recursive: true });
    await fs.symlink('/somewhere', '/root/link');

    const entries = await fs.readdir('/root', { withFileTypes: true });
    const names = entries.map((e) => e.name).sort();
    expect(names).toEqual(['file.txt', 'link', 'subdir']);

    const fileEntry = entries.find((e) => e.name === 'file.txt')!;
    expect(fileEntry.isFile()).toBe(true);
    expect(fileEntry.isDirectory()).toBe(false);
    expect(fileEntry.isSymbolicLink()).toBe(false);

    const dirEntry = entries.find((e) => e.name === 'subdir')!;
    expect(dirEntry.isDirectory()).toBe(true);
    expect(dirEntry.isFile()).toBe(false);

    const linkEntry = entries.find((e) => e.name === 'link')!;
    expect(linkEntry.isSymbolicLink()).toBe(true);
    expect(linkEntry.isFile()).toBe(false);
  });

  it('exists returns true for files, false for missing', async () => {
    const fs = makeFs();
    await fs.writeFile('/tmp/exists.txt', 'yes', 'utf-8');
    expect(await fs.exists('/tmp/exists.txt')).toBe(true);
    expect(await fs.exists('/tmp/nope.txt')).toBe(false);
  });

  it('symlink + readlink roundtrip', async () => {
    const fs = makeFs();
    await fs.mkdir('/base', { recursive: true });
    await fs.symlink('/target/path', '/base/mylink');
    const target = await fs.readlink('/base/mylink');
    expect(target).toBe('/target/path');
  });

  it('rm removes files', async () => {
    const fs = makeFs();
    await fs.writeFile('/tmp/removeme.txt', 'gone', 'utf-8');
    expect(await fs.exists('/tmp/removeme.txt')).toBe(true);
    await fs.rm('/tmp/removeme.txt');
    expect(await fs.exists('/tmp/removeme.txt')).toBe(false);
  });

  it('copyDirectory copies recursively', async () => {
    const fs = makeFs();
    await fs.mkdir('/src/nested', { recursive: true });
    await fs.writeFile('/src/a.txt', 'alpha', 'utf-8');
    await fs.writeFile('/src/nested/b.txt', 'beta', 'utf-8');

    await fs.copyDirectory('/src', '/dest');

    expect(await fs.readFile('/dest/a.txt', 'utf-8')).toBe('alpha');
    expect(await fs.readFile('/dest/nested/b.txt', 'utf-8')).toBe('beta');
  });

  it('reading non-existent file throws', async () => {
    const fs = makeFs();
    await expect(fs.readFile('/no/such/file.txt', 'utf-8')).rejects.toThrow('ENOENT');
  });
});

describe('createMemoryFs()', () => {
  it('populates from seed object', async () => {
    const fs = createMemoryFs({
      '/data/config.json': '{"key":"value"}',
      '/data/readme.md': '# Hello',
    });

    const json = await fs.readFile('/data/config.json', 'utf-8');
    expect(json).toBe('{"key":"value"}');

    const md = await fs.readFile('/data/readme.md', 'utf-8');
    expect(md).toBe('# Hello');
  });
});
