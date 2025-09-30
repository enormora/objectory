import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

type Person = {
    readonly name: string;
};

await test('build() returns the given factory object as is', () => {
    const factory = createFactory<Person>(() => {
        return {
            name: 'John Doe'
        };
    });

    const actual = factory.build();

    assert.deepStrictEqual(actual, { name: 'John Doe' });
});
