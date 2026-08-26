import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('buildList() returns an empty array by default', function () {
    const factory = createFactory<{ readonly foo: string; }>(function () {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.buildList();

    assert.deepStrictEqual(actual, []);
});

test('buildList() generates objects using the factory defaults', function () {
    let counter = 0;
    const factory = createFactory<{ readonly index: number; }>(function () {
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
    const baseFactory = createFactory<{ readonly label: string; readonly count: number; }>(function () {
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

test('buildList() returns a distinct object per element', function () {
    const factory = createFactory<{ readonly name: string; }>(function () {
        return { name: 'Jane Doe' };
    });

    const [ first, second ] = factory.buildList({ length: 2 });

    assert.notStrictEqual(first, second);
    assert.deepStrictEqual(first, second);
});

test('buildList() gives each element its own nested object', function () {
    const nestedFactory = createFactory<{ readonly value: string; }>(function () {
        return { value: 'nested' };
    });
    const factory = createFactory<{ readonly nested: { readonly value: string; }; }>(function () {
        return { nested: nestedFactory };
    });

    const [ first, second ] = factory.buildList({ length: 2 });

    assert.notStrictEqual(first.nested, second.nested);
});

test('buildList() applies overrides carried by withOverrides() to every element', function () {
    const factory = createFactory<{ readonly name: string; readonly age: number; }>(function () {
        return { name: 'Jane Doe', age: 32 };
    });

    const elements = factory.withOverrides({ name: 'Chris' }).buildList({ length: 3 });

    assert.deepStrictEqual(elements, [
        { name: 'Chris', age: 32 },
        { name: 'Chris', age: 32 },
        { name: 'Chris', age: 32 }
    ]);
});

test('buildList() calls the generator once per element', function () {
    let calls = 0;
    const factory = createFactory<{ readonly index: number; }>(function () {
        calls += 1;

        return { index: calls };
    });

    const elements = factory.buildList({ length: 3 });

    assert.deepStrictEqual(elements, [ { index: 1 }, { index: 2 }, { index: 3 } ]);
});
