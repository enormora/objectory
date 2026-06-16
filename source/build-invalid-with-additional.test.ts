import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

test('buildInvalidWithAdditional() adds a new top-level property', function () {
    const factory = createFactory<{ readonly name: string; }>(function () {
        return {
            name: 'Alice'
        };
    });

    const actual = factory.buildInvalidWithAdditional('extra', 'value');

    assert.deepStrictEqual(actual, {
        name: 'Alice',
        extra: 'value'
    });
});

test('buildInvalidWithAdditional() adds a nested property using dotted path', function () {
    const factory = createFactory<{ readonly profile: { readonly name: string; }; }>(function () {
        return {
            profile: createFactory(function () {
                return {
                    name: 'Alice'
                };
            })
        };
    });

    const actual = factory.buildInvalidWithAdditional('profile.extra', 'value');

    assert.deepStrictEqual(actual, {
        profile: {
            name: 'Alice',
            extra: 'value'
        }
    });
});

test('buildInvalidWithAdditional() splice-inserts into arrays at index', function () {
    const factory = createFactory<{ readonly values: readonly number[]; }>(function () {
        return {
            values: [ -1, 1 ]
        };
    });

    const actual = factory.buildInvalidWithAdditional('values.1', 0);

    assert.deepStrictEqual(actual, {
        values: [ -1, 0, 1 ]
    });
});

test('buildInvalidWithAdditional() throws when the property already exists', function () {
    const factory = createFactory<{ readonly name: string; }>(function () {
        return {
            name: 'Alice'
        };
    });

    assert.throws(function () {
        return factory.buildInvalidWithAdditional('name', 'other');
    }, /already exists/u);
});

test('buildInvalidWithAdditional() leaves original defaults untouched', function () {
    const factory = createFactory<{ readonly flag: boolean; }>(function () {
        return {
            flag: false
        };
    });

    const modified = factory.buildInvalidWithAdditional('extra', 'value');
    const original = factory.build();

    assert.deepStrictEqual(modified, { flag: false, extra: 'value' });
    assert.deepStrictEqual(original, { flag: false });
});
