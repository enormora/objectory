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
