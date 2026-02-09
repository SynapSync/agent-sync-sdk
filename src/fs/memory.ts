import * as pathModule from 'node:path';
import type { FileSystemAdapter, FsStats, Dirent } from '../types/config.js';

interface FsNode {
  type: 'file' | 'dir' | 'symlink';
  content?: string;
  target?: string; // for symlinks
  children?: Map<string, FsNode>;
}

export class InMemoryFileSystem implements FileSystemAdapter {
  private root: FsNode = { type: 'dir', children: new Map() };

  private resolve(filePath: string): string {
    return pathModule.resolve(filePath);
  }

  private getNode(filePath: string): FsNode | undefined {
    const resolved = this.resolve(filePath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (current.type !== 'dir' || !current.children) return undefined;
      const next = current.children.get(part);
      if (!next) return undefined;
      current = next;
    }
    return current;
  }

  private ensureParent(filePath: string): FsNode {
    const resolved = this.resolve(filePath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    parts.pop(); // remove filename
    let current = this.root;
    for (const part of parts) {
      if (!current.children) current.children = new Map();
      if (!current.children.has(part)) {
        current.children.set(part, { type: 'dir', children: new Map() });
      }
      current = current.children.get(part)!;
    }
    return current;
  }

  async readFile(filePath: string, _encoding: 'utf-8'): Promise<string> {
    const node = this.getNode(filePath);
    if (!node || node.type !== 'file') throw new Error(`ENOENT: ${filePath}`);
    return node.content!;
  }

  async writeFile(filePath: string, content: string, _encoding: 'utf-8'): Promise<void> {
    const parent = this.ensureParent(filePath);
    const name = pathModule.basename(this.resolve(filePath));
    parent.children!.set(name, { type: 'file', content });
  }

  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    const resolved = this.resolve(dirPath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (!current.children) current.children = new Map();
      if (!current.children.has(part)) {
        if (!options?.recursive) throw new Error(`ENOENT: ${dirPath}`);
        current.children.set(part, { type: 'dir', children: new Map() });
      }
      current = current.children.get(part)!;
    }
  }

  async readdir(_dirPath: string, _options: { withFileTypes: true }): Promise<Dirent[]> {
    const node = this.getNode(_dirPath);
    if (!node || node.type !== 'dir') throw new Error(`ENOTDIR: ${_dirPath}`);
    const entries: Dirent[] = [];
    for (const [name, child] of node.children ?? []) {
      entries.push({
        name,
        isFile: () => child.type === 'file',
        isDirectory: () => child.type === 'dir',
        isSymbolicLink: () => child.type === 'symlink',
      });
    }
    return entries;
  }

  async stat(filePath: string): Promise<FsStats> {
    const node = this.getNode(filePath);
    if (!node) throw new Error(`ENOENT: ${filePath}`);
    return {
      isFile: () => node.type === 'file',
      isDirectory: () => node.type === 'dir',
      isSymbolicLink: () => node.type === 'symlink',
    };
  }

  async lstat(filePath: string): Promise<FsStats> {
    return this.stat(filePath);
  }

  async symlink(target: string, linkPath: string): Promise<void> {
    const parent = this.ensureParent(linkPath);
    const name = pathModule.basename(this.resolve(linkPath));
    parent.children!.set(name, { type: 'symlink', target });
  }

  async readlink(linkPath: string): Promise<string> {
    const node = this.getNode(linkPath);
    if (!node || node.type !== 'symlink') throw new Error(`EINVAL: ${linkPath}`);
    return node.target!;
  }

  async rm(filePath: string, _options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    const resolved = this.resolve(filePath);
    const parts = resolved.split(pathModule.sep).filter(Boolean);
    const name = parts.pop()!;
    let current = this.root;
    for (const part of parts) {
      if (!current.children?.has(part)) {
        if (_options?.force) return;
        throw new Error(`ENOENT: ${filePath}`);
      }
      current = current.children.get(part)!;
    }
    current.children?.delete(name);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const node = this.getNode(oldPath);
    if (!node) throw new Error(`ENOENT: ${oldPath}`);
    await this.rm(oldPath);
    const parent = this.ensureParent(newPath);
    const name = pathModule.basename(this.resolve(newPath));
    parent.children!.set(name, node);
  }

  async exists(filePath: string): Promise<boolean> {
    return this.getNode(filePath) !== undefined;
  }

  async copyDirectory(source: string, target: string): Promise<void> {
    const srcNode = this.getNode(source);
    if (!srcNode || srcNode.type !== 'dir') throw new Error(`ENOTDIR: ${source}`);
    await this.mkdir(target, { recursive: true });
    for (const [name, child] of srcNode.children ?? []) {
      const srcChild = pathModule.join(source, name);
      const destChild = pathModule.join(target, name);
      if (child.type === 'dir') {
        await this.copyDirectory(srcChild, destChild);
      } else if (child.type === 'file') {
        await this.writeFile(destChild, child.content!, 'utf-8');
      }
    }
  }
}

/** Factory: create a pre-seeded in-memory filesystem */
export function createMemoryFs(seed?: Record<string, string>): FileSystemAdapter {
  const fs = new InMemoryFileSystem();
  if (seed) {
    for (const [filePath, content] of Object.entries(seed)) {
      // Synchronous-ish: these are all sync operations on in-memory data
      void fs.writeFile(filePath, content, 'utf-8');
    }
  }
  return fs;
}
