import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = dirname(fileURLToPath(import.meta.url));

/**
 * Locates the built web client. The API runs from its own dist folder in
 * development (tsx) and from the workspace dist folder in production, so both
 * layouts are probed instead of relying on the current working directory.
 */
export function resolveWebRoot(): string | null {
  const candidates = [
    resolve(process.cwd(), 'apps/web/dist'),
    resolve(process.cwd(), '../web/dist'),
    resolve(moduleDirectory, '../../../../web/dist'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  return null;
}
