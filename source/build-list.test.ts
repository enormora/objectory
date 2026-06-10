import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('buildList() returns an empty array by default', function () {
    const factory = createFactory<{ foo: string; }>(function () {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.buildList();

    assert.deepStrictEqual(actual, []);
});

test('buildList() generates objects using the factory defaults', function () {
    let counter = 0;
    const factory = createFactory<{ index: number; }>(function () {
        const value = counter;
        counter += 1;

        return {
            index: value
        };
    });

    const actual = factory.buildList({ length: 3 });

    assert.deepStrictEqual(actual, [ { index: 0 }, { index: 1 }, { index: 2 } ]);
});

test('buildList() respects withOverrides()', function () {
    const baseFactory = createFactory<{ label: string; count: number; }>(function () {
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
