import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareDisplayNamePatch } from '#core/profile.ts';
import { isErr, isOk } from '#core/result.ts';

test('prepareDisplayNamePatch returns a normalized display-name-only patch', () => {
  const result = prepareDisplayNamePatch('  Ashif  ');

  assert.equal(isOk(result), true);
  if (!isOk(result)) return;
  assert.deepEqual(result.value, { displayName: 'Ashif' });
  assert.deepEqual(Object.keys(result.value), ['displayName']);
});

test('prepareDisplayNamePatch rejects empty and whitespace-only names', () => {
  for (const value of ['', '   ']) {
    const result = prepareDisplayNamePatch(value);

    assert.equal(isErr(result), true);
    if (!isErr(result)) continue;
    assert.equal(result.error.code, 'invalid_argument');
    assert.equal(result.error.message, 'Display name must not be empty');
  }
});

test('prepareDisplayNamePatch rejects names longer than forty characters', () => {
  const result = prepareDisplayNamePatch('x'.repeat(41));

  assert.equal(isErr(result), true);
  if (!isErr(result)) return;
  assert.equal(result.error.code, 'invalid_argument');
  assert.equal(result.error.message, 'Display name must be at most 40 characters');
});

test('prepareDisplayNamePatch rejects control characters', () => {
  const result = prepareDisplayNamePatch('bad\nname');

  assert.equal(isErr(result), true);
  if (!isErr(result)) return;
  assert.equal(result.error.code, 'invalid_argument');
  assert.equal(
    result.error.message,
    'Display name must not contain control characters',
  );
});
