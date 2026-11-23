import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.name.endsWith('.ts')) files.push(fullPath);
  }
  return files;
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const specifiers: string[] = [];
  const pattern = /(?:from\s+|import\s*\()['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.push(specifier);
  }
  return specifiers;
}

function filesUnder(directory: string): string[] {
  return walk(path.join(root, directory)).map((file) =>
    path.relative(root, file),
  );
}

test('shared contracts and types never depend on implementations', () => {
  for (const file of [...filesUnder('shared/contracts'), ...filesUnder('shared/types')]) {
    for (const specifier of importsOf(path.join(root, file))) {
      assert.equal(
        specifier.startsWith('#core') ||
          specifier.startsWith('#mocks') ||
          specifier.includes('modules/'),
        false,
        `${file} imports implementation: ${specifier}`,
      );
    }
  }
});

test('core depends only on contracts, types and itself', () => {
  for (const file of filesUnder('modules/core')) {
    for (const specifier of importsOf(path.join(root, file))) {
      assert.equal(
        specifier.startsWith('#mocks') ||
          specifier.includes('modules/network') ||
          specifier.includes('modules/messaging') ||
          specifier.includes('modules/groups') ||
          specifier.includes('modules/file-transfer'),
        false,
        `${file} imports a feature module: ${specifier}`,
      );
    }
  }
});

test('mocks never import feature modules', () => {
  for (const file of filesUnder('shared/mocks')) {
    for (const specifier of importsOf(path.join(root, file))) {
      assert.equal(
        /modules\/(?!core\/)/.test(specifier),
        false,
        `${file} imports a feature module: ${specifier}`,
      );
    }
  }
});

test('shared contract helpers are importable at runtime', async () => {
  const contracts = await import('#contracts/index.ts');

  assert.equal(
    contracts.privateConversationId('peer_aisha'),
    'dm:peer_aisha',
  );
  assert.equal(
    contracts.groupConversationId('group_local_crew'),
    'group:group_local_crew',
  );
  assert.equal(contracts.CHANNELS.files, 'files');
});
