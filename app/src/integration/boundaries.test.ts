import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const srcRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowedExternal = /^(react|react-dom|react-router-dom|@testing-library\/|vitest|node:)/;
const coreAlias = /^#(core|contracts|types|mocks)\//;

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (/\.tsx?$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function importSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from\s+|import\s*\()['"]([^'"\\]+)['"]/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined);
}

describe('UI dependency boundaries', () => {
  it('uses only public Core aliases and approved external packages', () => {
    for (const file of walk(srcRoot)) {
      const source = readFileSync(file, 'utf8');
      const relative = path.relative(srcRoot, file);

      for (const specifier of importSpecifiers(source)) {
        if (specifier.startsWith('.')) continue;
        assert.ok(
          specifier.startsWith('#') ? coreAlias.test(specifier) : allowedExternal.test(specifier),
          `${relative} has an unexpected import: ${specifier}`,
        );
        assert.doesNotMatch(specifier, /\.\./, `${relative} escapes its package scope`);
        assert.doesNotMatch(
          specifier,
          /modules\/(network|messaging|groups|file-transfer|storage)/,
          `${relative} imports an unfinished module`,
        );
      }

      assert.doesNotMatch(source, /\b(fetch|WebSocket|EventSource)\s*\(/, `${relative} uses a network API`);
    }
  });

  it('imports the UI facade and mock implementation through public aliases', () => {
    const provider = readFileSync(path.join(srcRoot, 'integration/MessengerProvider.tsx'), 'utf8');
    assert.match(provider, /from '#contracts\/app\.ts'/);
    assert.match(provider, /from '#mocks\/index\.ts'/);
  });
});
