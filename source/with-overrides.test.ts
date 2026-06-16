import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('withOverrides() returns a factory with updated defaults', function () {
    const factory = createFactory<{ readonly foo: string; readonly count: number; }>(function () {
        return {
            foo: 'base',
            count: 1
        };
    });

    const customized = factory.withOverrides({ count: 5 });

    assert.deepStrictEqual(factory.build(), { foo: 'base', count: 1 });
    assert.deepStrictEqual(customized.build(), { foo: 'base', count: 5 });
});

test('withOverrides() merges nested factory overrides', function () {
    const factory = createFactory<{ readonly nested: { readonly value: string; }; }>(function () {
        return {
            nested: createFactory(function () {
                return { value: 'alpha' };
            })
        };
    });

    const customized = factory.withOverrides({ nested: { value: 'beta' } });

    assert.deepStrictEqual(factory.build(), { nested: { value: 'alpha' } });
    assert.deepStrictEqual(customized.build(), { nested: { value: 'beta' } });
});

test('withOverrides() can be chained and still accepts build overrides', function () {
    const factory = createFactory<{ readonly foo: string; readonly bar: string; }>(function () {
        return {
            foo: 'one',
            bar: 'two'
        };
    });

    const customized = factory.withOverrides({ foo: 'custom' }).withOverrides({ bar: 'default' });

    const actual = customized.build({ bar: 'override' });

    assert.deepStrictEqual(actual, { foo: 'custom', bar: 'override' });
});
