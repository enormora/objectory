import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('buildList() returns an empty array by default', () => {
    const factory = createFactory<{ foo: string }>(() => {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.buildList();

    assert.deepStrictEqual(actual, []);
});

test('buildList() generates objects using the factory defaults', () => {
    let counter = 0;
    const factory = createFactory<{ index: number }>(() => {
        const value = counter;
        counter += 1;

        return {
            index: value
        };
    });

    const actual = factory.buildList({ length: 3 });

    assert.deepStrictEqual(actual, [{ index: 0 }, { index: 1 }, { index: 2 }]);
});

test('buildList() respects withOverrides()', () => {
    const baseFactory = createFactory<{ label: string; count: number }>(() => {
        return {
            label: 'base',
            count: 1
        };
    });

    const customizedFactory = baseFactory.withOverrides({ label: 'custom' });

    const actual = customizedFactory.buildList({ length: 2 });

    assert.deepStrictEqual(actual, [
        { label: 'custom', count: 1 },
        { label: 'custom', count: 1 }
    ]);
});
