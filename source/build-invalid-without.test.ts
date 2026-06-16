import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('buildInvalidWithout() removes a top level property', function () {
    const factory = createFactory<{ readonly foo: string; readonly bar: number; }>(function () {
        return {
            foo: 'value',
            bar: 42
        };
    });

    const actual = factory.buildInvalidWithout('bar');

    assert.deepStrictEqual(actual, { foo: 'value' });
});

test('buildInvalidWithout() removes a nested property using dotted path', function () {
    const factory = createFactory<
        { readonly outer: { readonly inner: { readonly leaf: string; readonly keep: string; }; }; }
    >(function () {
        return {
            outer: createFactory(function () {
                return {
                    inner: createFactory(function () {
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

test('buildInvalidWithout() removes array elements when index is provided', function () {
    const factory = createFactory<{ readonly items: readonly number[]; }>(function () {
        return {
            items: [ -1, 0, 1 ]
        };
    });

    const actual = factory.buildInvalidWithout('items.1');

    assert.deepStrictEqual(actual, {
        items: [ -1, 1 ]
    });
});
