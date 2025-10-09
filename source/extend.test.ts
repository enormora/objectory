import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('extend() merges base and extension outputs', () => {
    const baseFactory = createFactory<{ foo: string; count: number }>(() => {
        return {
            foo: 'base',
            count: 1
        };
    });

    const extendedFactory = baseFactory.extend<{ foo: string; count: number; bar: string }>(() => {
        return {
            bar: 'extended',
            foo: 'extended foo'
        };
    });

    assert.deepStrictEqual(baseFactory.build(), { foo: 'base', count: 1 });
    assert.deepStrictEqual(extendedFactory.build(), {
        foo: 'extended foo',
        count: 1,
        bar: 'extended'
    });
});

test('extend() supports overrides for new properties', () => {
    const baseFactory = createFactory<{ foo: string; nested: { value: string } }>(() => {
        return {
            foo: 'base',
            nested: createFactory(() => {
                return { value: 'nested base' };
            })
        };
    });

    const extendedFactory = baseFactory.extend<{
        foo: string;
        nested: { value: string };
        extra: string;
    }>(() => {
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
