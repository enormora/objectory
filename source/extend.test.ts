import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('extend() merges base and extension outputs', function () {
    const baseFactory = createFactory<{ readonly foo: string; readonly count: number; }>(function () {
        return {
            foo: 'base',
            count: 1
        };
    });

    const extendedFactory = baseFactory.extend<{ readonly foo: string; readonly count: number; readonly bar: string; }>(
        function () {
            return {
                bar: 'extended',
                foo: 'extended foo'
            };
        }
    );

    assert.deepStrictEqual(baseFactory.build(), { foo: 'base', count: 1 });
    assert.deepStrictEqual(extendedFactory.build(), {
        foo: 'extended foo',
        count: 1,
        bar: 'extended'
    });
});

test('extend() supports overrides for new properties', function () {
    const baseFactory = createFactory<{ readonly foo: string; readonly nested: { readonly value: string; }; }>(
        function () {
            return {
                foo: 'base',
                nested: createFactory(function () {
                    return { value: 'nested base' };
                })
            };
        }
    );

    const extendedFactory = baseFactory.extend<{
        readonly foo: string;
        readonly nested: { readonly value: string; };
        readonly extra: string;
    }>(function () {
        return {
            extra: 'default extra'
        };
    });

    const customized = extendedFactory.withOverrides({
        foo: 'override foo',
        extra: 'override extra',
        nested: { value: 'override nested' }
    });

    assert.deepStrictEqual(extendedFactory.build(), {
        foo: 'base',
        nested: { value: 'nested base' },
        extra: 'default extra'
    });

    assert.deepStrictEqual(customized.build(), {
        foo: 'override foo',
        nested: { value: 'override nested' },
        extra: 'override extra'
    });
});
