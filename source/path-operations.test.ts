import { test } from 'node:test';
import assert from 'node:assert';
import { normalizePath, removePropertyAtPath } from './path-operations.ts';

test('normalizePath() splits dotted strings into segments', () => {
    assert.deepStrictEqual(normalizePath('foo.bar.baz'), ['foo', 'bar', 'baz']);
});

test('normalizePath() splits dotted strings with numbers into segments', () => {
    assert.deepStrictEqual(normalizePath('foo.0.baz'), ['foo', 0, 'baz']);
});

test('removePropertyAtPath() removes top-level property without mutating original', () => {
    const original = { foo: 'value', bar: 42 } as const;

    const result = removePropertyAtPath(original, ['bar']);

    assert.deepStrictEqual(result, { foo: 'value' });
    assert.deepStrictEqual(original, { foo: 'value', bar: 42 });
});

test('removePropertyAtPath() removes nested property', () => {
    const original = {
        outer: {
            inner: {
                leaf: 'remove-me',
                keep: 'stay'
            }
        }
    } as const;

    const result = removePropertyAtPath(original, ['outer', 'inner', 'leaf']);

    assert.deepStrictEqual(result, {
        outer: {
            inner: {
                keep: 'stay'
            }
        }
    });
});

test('removePropertyAtPath() removes array element when index provided', () => {
    const original = {
        items: [-1, 0, 1]
    } as const;

    const result = removePropertyAtPath(original, ['items', 1]);

    assert.deepStrictEqual(result, {
        items: [-1, 1]
    });
});

test('removePropertyAtPath() leaves value untouched when path missing', () => {
    const original = { foo: { bar: 1 } } as const;

    const result = removePropertyAtPath(original, ['foo', 'baz']);

    assert.deepStrictEqual(result, { foo: { bar: 1 } });
});
