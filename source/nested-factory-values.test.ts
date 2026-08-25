import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

type Driver = {
    readonly name: string;
    readonly age: number;
};

type Trip = {
    readonly driver: Driver;
};

type Bus = {
    readonly passengers: readonly Driver[];
};

const expectedMessage = 'use createFactory() for nested objects and asArray() for arrays of objects';

test('build() throws when a nested object is not built by a factory', function () {
    // @ts-expect-error -- consumers can bypass the missing nested factory with a type assertion
    const factory = createFactory<Trip>(function () {
        return { driver: { name: 'Jane Doe', age: 32 } };
    });

    assert.throws(function () {
        return factory.build();
    }, { name: 'TypeError', message: `Invalid value at "driver": ${expectedMessage}` });
});

test('build() throws when a nested object is not built by a factory even though it is overridden', function () {
    // @ts-expect-error -- consumers can bypass the missing nested factory with a type assertion
    const factory = createFactory<Trip>(function () {
        return { driver: { name: 'Jane Doe', age: 32 } };
    });

    assert.throws(function () {
        return factory.build({ driver: { age: 40 } });
    }, { name: 'TypeError', message: `Invalid value at "driver": ${expectedMessage}` });
});

test('build() throws with the index of the offending item when an array contains plain objects', function () {
    // @ts-expect-error -- consumers can bypass the missing array factory with a type assertion
    const factory = createFactory<Bus>(function () {
        return { passengers: [ { name: 'Jane Doe', age: 32 } ] };
    });

    assert.throws(function () {
        return factory.build();
    }, { name: 'TypeError', message: `Invalid value at "passengers.0": ${expectedMessage}` });
});

test('build() throws when an object only looks like a factory', function () {
    // @ts-expect-error -- a foreign builder must not be mistaken for an objectory factory
    const factory = createFactory<Trip>(function () {
        return {
            driver: {
                build() {
                    return { name: 'Jane Doe', age: 32 };
                }
            }
        };
    });

    assert.throws(function () {
        return factory.build();
    }, { name: 'TypeError', message: `Invalid value at "driver": ${expectedMessage}` });
});

test('build() throws when a class instance is provided instead of a factory', function () {
    // @ts-expect-error -- class instances are not object shapes objectory can build
    const factory = createFactory<{ readonly seats: ReadonlyMap<string, string>; }>(function () {
        return { seats: new Map() };
    });

    assert.throws(function () {
        return factory.build();
    }, { name: 'TypeError', message: `Invalid value at "seats": ${expectedMessage}` });
});

test('build() reports the path relative to the factory the invalid value belongs to', function () {
    const factory = createFactory<{ readonly trip: Trip; }>(function () {
        return {
            // @ts-expect-error -- consumers can bypass the missing nested factory with a type assertion
            trip: createFactory<Trip>(function () {
                return { driver: { name: 'Jane Doe', age: 32 } };
            })
        };
    });

    assert.throws(function () {
        return factory.build();
    }, { name: 'TypeError', message: `Invalid value at "driver": ${expectedMessage}` });
});

test('buildList() throws when a nested object is not built by a factory', function () {
    // @ts-expect-error -- consumers can bypass the missing nested factory with a type assertion
    const factory = createFactory<Trip>(function () {
        return { driver: { name: 'Jane Doe', age: 32 } };
    });

    assert.throws(function () {
        return factory.buildList({ length: 2 });
    }, { name: 'TypeError', message: `Invalid value at "driver": ${expectedMessage}` });
});
