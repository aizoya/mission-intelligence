import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export class Store {
  constructor(root = '.data') { this.root = root; }
  path(id) {
    if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid mission identifier');
    return join(this.root, `${id}.json`);
  }
  async save(mission) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const path = this.path(mission.id);
    const tmp = `${path}.${randomUUID()}.tmp`;
    await writeFile(tmp, JSON.stringify(mission), { mode: 0o600 });
    await rename(tmp, path);
  }
  async get(id) { return JSON.parse(await readFile(this.path(id), 'utf8')); }
}
