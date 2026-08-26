import { test } from 'node:test';
import assert from 'node:assert';
import { addValueAtPath, normalizePath, removePropertyAtPath, setValueAtPath } from './path-operations.ts';

test('normalizePath() splits dotted strings into segments', function () {
    assert.deepStrictEqual(normalizePath('foo.bar.baz'), [ 'foo', 'bar', 'baz' ]);
});

test('normalizePath() splits dotted strings with numbers into segments', function () {
    assert.deepStrictEqual(normalizePath('foo.0.baz'), [ 'foo', 0, 'baz' ]);
});

test('removePropertyAtPath() removes top-level property without mutating original', function () {
    const original = { foo: 'value', bar: 42 } as const;

    const result = removePropertyAtPath(original, [ 'bar' ]);

    assert.deepStrictEqual(result, { foo: 'value' });
    assert.deepStrictEqual(original, { foo: 'value', bar: 42 });
});

test('removePropertyAtPath() removes nested property', function () {
    const original = {
        outer: {
            inner: {
                leaf: 'remove-me',
                keep: 'stay'
            }
        }
    } as const;

    const result = removePropertyAtPath(original, [ 'outer', 'inner', 'leaf' ]);

    assert.deepStrictEqual(result, {
        outer: {
            inner: {
                keep: 'stay'
            }
        }
    });
});

test('removePropertyAtPath() removes array element when index provided', function () {
    const original = {
        items: [ -1, 0, 1 ]
    } as const;

    const result = removePropertyAtPath(original, [ 'items', 1 ]);

    assert.deepStrictEqual(result, {
        items: [ -1, 1 ]
    });
});

test('removePropertyAtPath() throws when an object key in the path does not exist', function () {
    const original = { foo: { bar: 1 } } as const;

    assert.throws(function () {
        return removePropertyAtPath(original, [ 'foo', 'baz' ]);
    }, /Cannot resolve path "foo\.baz"/u);
});

test('removePropertyAtPath() throws when an array index is out of range', function () {
    const original = { items: [ -1, 0 ] } as const;
    const outOfRangeIndex = original.items.length + 1;

    assert.throws(function () {
        return removePropertyAtPath(original, [ 'items', outOfRangeIndex ]);
    }, /Cannot resolve path "items\.3"/u);
});

test('removePropertyAtPath() throws when a path segment leads through a primitive', function () {
    const original = { count: 1 } as const;

    assert.throws(function () {
        return removePropertyAtPath(original, [ 'count', 'deeper' ]);
    }, /Cannot resolve path "count\.deeper"/u);
});

test('setValueAtPath() updates nested object properties immutably', function () {
    const original = {
        outer: {
            inner: {
                value: 1
            }
        }
    } as const;

    const result = setValueAtPath(original, [ 'outer', 'inner', 'value' ], 'not-a-number');

    assert.deepStrictEqual(result, {
        outer: {
            inner: {
                value: 'not-a-number'
            }
        }
    });
    assert.deepStrictEqual(original, {
        outer: {
            inner: {
                value: 1
            }
        }
    });
});

test('setValueAtPath() updates array indices', function () {
    const original = {
        values: [ -1, 0, 1 ]
    } as const;

    const result = setValueAtPath(original, [ 'values', 1 ], 'not-a-number');

    assert.deepStrictEqual(result, {
        values: [ -1, 'not-a-number', 1 ]
    });
});
test('setValueAtPath() throws when an object key in the path does not exist', function () {
    const original = { outer: { inner: 1 } } as const;

    assert.throws(function () {
        return setValueAtPath(original, [ 'outer', 'missing' ], 'value');
    }, /Cannot resolve path "outer\.missing"/u);
});

test('setValueAtPath() throws instead of creating structure through a primitive', function () {
    const original = { count: 1 } as const;

    assert.throws(function () {
        return setValueAtPath(original, [ 'count', 'deeper' ], 'value');
    }, /Cannot resolve path "count\.deeper"/u);
});

test('setValueAtPath() throws when the array index is out of range', function () {
    const original = { values: [ -1, 0 ] } as const;
    const outOfRangeIndex = original.values.length + 1;

    assert.throws(function () {
        return setValueAtPath(original, [ 'values', outOfRangeIndex ], 'value');
    }, /Cannot resolve path "values\.3"/u);
});

test('addValueAtPath() adds a new top-level property immutably', function () {
    const original = { foo: 'value' } as const;

    const result = addValueAtPath(original, [ 'extra' ], 'new');

    assert.deepStrictEqual(result, { foo: 'value', extra: 'new' });
    assert.deepStrictEqual(original, { foo: 'value' });
});

test('addValueAtPath() adds a nested property', function () {
    const original = {
        outer: {
            inner: { keep: 'stay' }
        }
    } as const;

    const result = addValueAtPath(original, [ 'outer', 'inner', 'extra' ], 'new');

    assert.deepStrictEqual(result, {
        outer: {
            inner: { keep: 'stay', extra: 'new' }
        }
    });
});

test('addValueAtPath() splice-inserts into arrays at index', function () {
    const original = {
        values: [ -1, 1 ]
    } as const;

    const result = addValueAtPath(original, [ 'values', 1 ], 0);

    assert.deepStrictEqual(result, {
        values: [ -1, 0, 1 ]
    });
});

test('addValueAtPath() appends to arrays when index equals length', function () {
    const original = {
        values: [ -1, 0 ]
    } as const;

    const result = addValueAtPath(original, [ 'values', original.values.length ], 1);

    assert.deepStrictEqual(result, {
        values: [ -1, 0, 1 ]
    });
});

test('addValueAtPath() throws when the array index is beyond the end', function () {
    const original = {
        values: [ -1, 0 ]
    } as const;
    const outOfRangeIndex = original.values.length + 1;

    assert.throws(function () {
        return addValueAtPath(original, [ 'values', outOfRangeIndex ], 1);
    }, /Cannot resolve path "values\.3"/u);
});

test('addValueAtPath() throws when the target object key already exists', function () {
    const original = { foo: 'value' } as const;

    assert.throws(function () {
        return addValueAtPath(original, [ 'foo' ], 'other');
    }, /Cannot add property at path "foo" because it already exists/u);
});

test('addValueAtPath() names the full path when a nested object key already exists', function () {
    const original = { outer: { inner: { keep: 'stay' } } } as const;

    assert.throws(function () {
        return addValueAtPath(original, [ 'outer', 'inner', 'keep' ], 'other');
    }, /Cannot add property at path "outer\.inner\.keep" because it already exists/u);
});

test('addValueAtPath() throws when the parent path does not exist', function () {
    const original = { outer: { inner: { keep: 'stay' } } } as const;

    assert.throws(function () {
        return addValueAtPath(original, [ 'outer', 'missing', 'extra' ], 'new');
    }, /Cannot resolve path "outer\.missing\.extra"/u);
});
