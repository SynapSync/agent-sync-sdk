import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import type { FileSystemAdapter, FsStats, Dirent } from '../types/config.js';

export class NodeFileSystem implements FileSystemAdapter {
  async readFile(filePath: string, encoding: 'utf-8'): Promise<string> {
    return fsp.readFile(filePath, encoding);
  }

  async writeFile(filePath: string, content: string, encoding: 'utf-8'): Promise<void> {
    await fsp.writeFile(filePath, content, encoding);
  }

  async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
    await fsp.mkdir(dirPath, options);
  }

  async readdir(dirPath: string, options: { withFileTypes: true }): Promise<Dirent[]> {
    return fsp.readdir(dirPath, options) as Promise<Dirent[]>;
  }

  async stat(filePath: string): Promise<FsStats> {
    return fsp.stat(filePath);
  }

  async lstat(filePath: string): Promise<FsStats> {
    return fsp.lstat(filePath);
  }

  async symlink(target: string, linkPath: string): Promise<void> {
    await fsp.symlink(target, linkPath);
  }

  async readlink(linkPath: string): Promise<string> {
    return fsp.readlink(linkPath);
  }

  async rm(filePath: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    await fsp.rm(filePath, options);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await fsp.rename(oldPath, newPath);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fsp.stat(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async copyDirectory(source: string, target: string): Promise<void> {
    await fsp.mkdir(target, { recursive: true });
    const entries = await fsp.readdir(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const destPath = path.join(target, entry.name);
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fsp.copyFile(srcPath, destPath);
      }
    }
  }
}

export const nodeFs = new NodeFileSystem();
