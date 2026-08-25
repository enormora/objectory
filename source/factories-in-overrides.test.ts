import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

type Pet = {
    readonly kind: string;
    readonly age: number;
};

type Driver = {
    readonly name: string;
    readonly pet: Pet;
};

type Trip = {
    readonly driver: Driver;
};

type Kennel = {
    readonly pets: readonly Pet[];
};

const expectedMessage = 'factories cannot be used as override values, use build() or buildList()';

const petFactory = createFactory<Pet>(function () {
    return { kind: 'cat', age: 3 };
});

const driverFactory = createFactory<Driver>(function () {
    return { name: 'Jane Doe', pet: petFactory };
});

const tripFactory = createFactory<Trip>(function () {
    return { driver: driverFactory };
});

const kennelFactory = createFactory<Kennel>(function () {
    return { pets: petFactory.asArray({ length: 1 }) };
});

test('build() throws when a factory is used as an override value', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return driverFactory.build({ pet: petFactory });
    }, { name: 'TypeError', message: `Invalid override at "pet": ${expectedMessage}` });
});

test('build() throws with the full path when a factory is used as a nested override value', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return tripFactory.build({ driver: { pet: petFactory } });
    }, { name: 'TypeError', message: `Invalid override at "driver.pet": ${expectedMessage}` });
});

test('build() throws when an array factory is used as an override value', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return driverFactory.build({ pet: petFactory.asArray({ length: 1 }) });
    }, { name: 'TypeError', message: `Invalid override at "pet": ${expectedMessage}` });
});

test('build() throws with the index of the offending item when a factory is inside an array override', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return kennelFactory.build({ pets: [ petFactory ] });
    }, { name: 'TypeError', message: `Invalid override at "pets.0": ${expectedMessage}` });
});

test('withOverrides() throws when a factory is used as an override value', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return driverFactory.withOverrides({ pet: petFactory }).build();
    }, { name: 'TypeError', message: `Invalid override at "pet": ${expectedMessage}` });
});

test('build() accepts the values built by another factory as an override', function () {
    const actual = tripFactory.build({ driver: { pet: petFactory.build({ kind: 'dog' }) } });

    assert.deepStrictEqual(actual, { driver: { name: 'Jane Doe', pet: { kind: 'dog', age: 3 } } });
});

test('build() accepts the values built by another factory as an array override', function () {
    const actual = kennelFactory.build({ pets: petFactory.buildList({ length: 2 }) });

    assert.deepStrictEqual(actual, { pets: [ { kind: 'cat', age: 3 }, { kind: 'cat', age: 3 } ] });
});
