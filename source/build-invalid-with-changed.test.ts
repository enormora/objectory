import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('buildInvalidWithChanged() updates nested object properties', () => {
    const factory = createFactory<{ profile: { name: string; age: number } }>(() => {
        return {
            profile: createFactory(() => {
                return {
                    name: 'Alice',
                    age: 30
                };
            })
        };
    });

    const actual = factory.buildInvalidWithChanged('profile.age', 'not-a-number');

    assert.deepStrictEqual(actual, {
        profile: {
            name: 'Alice',
            age: 'not-a-number'
        }
    });
});

test('buildInvalidWithChanged() accepts array path segments', () => {
    const factory = createFactory<{ values: number[] }>(() => {
        return {
            values: [-1, 0, 1]
        };
    });

    const actual = factory.buildInvalidWithChanged('values.1', 'not-a-number');

    assert.deepStrictEqual(actual, {
        values: [-1, 'not-a-number', 1]
    });
});

test('buildInvalidWithChanged() leaves original defaults untouched', () => {
    const factory = createFactory<{ flag: boolean }>(() => {
        return {
            flag: false
        };
    });

    const modified = factory.buildInvalidWithChanged('flag', 0);
    const original = factory.build();

    assert.deepStrictEqual(modified, { flag: 0 });
    assert.deepStrictEqual(original, { flag: false });
});
