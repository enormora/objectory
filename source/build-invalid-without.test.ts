import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('buildInvalidWithout() removes a top level property', () => {
    const factory = createFactory<{ foo: string; bar: number }>(() => {
        return {
            foo: 'value',
            bar: 42
        };
    });

    const actual = factory.buildInvalidWithout('bar');

    assert.deepStrictEqual(actual, { foo: 'value' });
});

test('buildInvalidWithout() removes a nested property using dotted path', () => {
    const factory = createFactory<{ outer: { inner: { leaf: string; keep: string } } }>(() => {
        return {
            outer: createFactory(() => {
                return {
                    inner: createFactory(() => {
                        return {
                            leaf: 'remove-me',
                            keep: 'stay'
                        };
                    })
                };
            })
        };
    });

    const actual = factory.buildInvalidWithout('outer.inner.leaf');

    assert.deepStrictEqual(actual, {
        outer: {
            inner: {
                keep: 'stay'
            }
        }
    });
});

test('buildInvalidWithout() removes array elements when index is provided', () => {
    const factory = createFactory<{ items: number[] }>(() => {
        return {
            items: [-1, 0, 1]
        };
    });

    const actual = factory.buildInvalidWithout('items.1');

    assert.deepStrictEqual(actual, {
        items: [-1, 1]
    });
});
