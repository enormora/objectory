import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory, type ObjectoryFactory } from './main.ts';

type Person = {
    readonly name: string;
    readonly age: number;
};

type Bus = {
    readonly passengers: readonly Person[];
};

function createPersonFactory(): ObjectoryFactory<Person> {
    return createFactory<Person>(function () {
        return { name: 'John Doe', age: 42 };
    });
}

test('build() shrinks an array factory default to an empty override array', function () {
    const factory = createFactory<Bus>(function () {
        return { passengers: createPersonFactory().asArray({ length: 2 }) };
    });

    const actual = factory.build({ passengers: [] });

    assert.deepStrictEqual(actual, { passengers: [] });
});

test('build() shrinks an array factory default to a shorter override array', function () {
    const factory = createFactory<Bus>(function () {
        return { passengers: createPersonFactory().asArray({ length: 3 }) };
    });

    const actual = factory.build({ passengers: [ { name: 'Jane Doe' } ] });

    assert.deepStrictEqual(actual, { passengers: [ { name: 'Jane Doe', age: 42 } ] });
});

test('build() grows an array factory default with a longer override array', function () {
    const factory = createFactory<Bus>(function () {
        return { passengers: createPersonFactory().asArray({ length: 1 }) };
    });

    const actual = factory.build({ passengers: [ undefined, { name: 'Jane Doe' } ] });

    assert.deepStrictEqual(actual, {
        passengers: [ { name: 'John Doe', age: 42 }, { name: 'Jane Doe', age: 42 } ]
    });
});
