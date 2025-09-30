import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

type Person = {
    readonly name: string;
    readonly age: number;
};

await test('build() returns the given factory object as is', () => {
    const factory = createFactory<Person>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build();

    assert.deepStrictEqual<Person>(actual, { name: 'John Doe', age: 42 });
});

await test('build() allows overriding certain top level properties', () => {
    const factory = createFactory<Person>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build({ age: 24 });

    assert.deepStrictEqual<Person>(actual, { name: 'John Doe', age: 24 });
});
