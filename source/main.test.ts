import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

type Person = {
    readonly name: string;
    readonly age: number;
};

type Passengers = {
    readonly amount: number;
    readonly totalWeight: number;
};

type Car = {
    readonly passengers: Passengers;
};

type Passenger = {
    readonly name: string;
    readonly age: number;
};

type Bus = {
    readonly passengers: readonly Passenger[];
};

test('build() returns the given factory object as is', () => {
    const factory = createFactory<Person>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build();

    assert.deepStrictEqual<Person>(actual, { name: 'John Doe', age: 42 });
});

test('build() returns the given factory object as is even when using nested factories', () => {
    const factory = createFactory<{ top: { second: { third: string; level: number } } }>(() => {
        return {
            top: createFactory(() => {
                return {
                    second: createFactory(() => {
                        return {
                            level: 42,
                            third: 'foo'
                        };
                    })
                };
            })
        };
    });

    const actual = factory.build();

    assert.deepStrictEqual(actual, { top: { second: { level: 42, third: 'foo' } } });
});

test('build() allows overriding certain top level properties', () => {
    const factory = createFactory<Person>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build({ age: 24 });

    assert.deepStrictEqual<Person>(actual, { name: 'John Doe', age: 24 });
});

test('build() allows overriding all top level properties', () => {
    const factory = createFactory<Person>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build({ name: 'Foobar', age: 24 });

    assert.deepStrictEqual<Person>(actual, { name: 'Foobar', age: 24 });
});

test('build() allows overriding two-level nested properties partially', () => {
    const passengersFactory = createFactory<Passengers>(() => {
        return {
            totalWeight: 0,
            amount: 0
        };
    });

    const carFactory = createFactory<Car>(() => {
        return {
            passengers: passengersFactory
        };
    });

    const actual = carFactory.build({ passengers: { amount: 4 } });

    assert.deepStrictEqual<Car>(actual, { passengers: { amount: 4, totalWeight: 0 } });
});

test('build() allows overriding two-level nested properties fully', () => {
    const passengersFactory = createFactory<Passengers>(() => {
        return {
            totalWeight: 0,
            amount: 0
        };
    });

    const carFactory = createFactory<Car>(() => {
        return {
            passengers: passengersFactory
        };
    });

    const actual = carFactory.build({ passengers: { totalWeight: 24, amount: 4 } });

    assert.deepStrictEqual<Car>(actual, { passengers: { amount: 4, totalWeight: 24 } });
});

test('build() allows overriding three-level nested properties partially', () => {
    const factory = createFactory<{ top: { second: { third: string; level: number } } }>(() => {
        return {
            top: createFactory(() => {
                return {
                    second: createFactory(() => {
                        return {
                            level: 42,
                            third: 'foo'
                        };
                    })
                };
            })
        };
    });

    const actual = factory.build({ top: { second: { level: 21 } } });

    assert.deepStrictEqual(actual, { top: { second: { third: 'foo', level: 21 } } });
});

test('build() resolves factories nested inside arrays', () => {
    const passengerFactory = createFactory<Passenger>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(() => {
        return {
            passengers: passengerFactory.asArray({ length: 1 })
        };
    });

    const actual = busFactory.build();

    assert.deepStrictEqual(actual, {
        passengers: [
            {
                name: 'John Doe',
                age: 42
            }
        ]
    });
});

test('build() returns empty arrays by default when using factories as arrays', () => {
    const passengerFactory = createFactory<Passenger>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(() => {
        return {
            passengers: passengerFactory.asArray()
        };
    });

    const actual = busFactory.build();

    assert.deepStrictEqual(actual, {
        passengers: []
    });
});

test('build() uses length when configuring factories as arrays', () => {
    const passengerFactory = createFactory<Passenger>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(() => {
        return {
            passengers: passengerFactory.asArray({ length: 2 })
        };
    });

    const actual = busFactory.build();

    assert.deepStrictEqual(actual, {
        passengers: [
            {
                name: 'John Doe',
                age: 42
            },
            {
                name: 'John Doe',
                age: 42
            }
        ]
    });
});

test('build() allows overriding factories nested inside arrays', () => {
    const passengerFactory = createFactory<Passenger>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(() => {
        return {
            passengers: passengerFactory.asArray()
        };
    });

    const actual = busFactory.build({
        passengers: [
            {
                name: 'Jane Doe'
            }
        ]
    });

    assert.deepStrictEqual(actual, {
        passengers: [
            {
                name: 'Jane Doe',
                age: 42
            }
        ]
    });
});

test('build() allows overriding factories nested inside arrays in arbitrary elements', () => {
    const passengerFactory = createFactory<Passenger>(() => {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(() => {
        return {
            passengers: passengerFactory.asArray()
        };
    });

    const actual = busFactory.build({
        passengers: [
            {
                name: 'Jane Doe'
            },
            {
                name: 'Foo Bar'
            }
        ]
    });

    assert.deepStrictEqual(actual, {
        passengers: [
            {
                name: 'Jane Doe',
                age: 42
            },
            {
                name: 'Foo Bar',
                age: 42
            }
        ]
    });
});

test('build() allows overriding factories with plain arrays', () => {
    const factory = createFactory<{ items: string[] }>(() => {
        return {
            items: ['foo', 'baz']
        };
    });

    const actual = factory.build({
        items: ['bar']
    });

    assert.deepStrictEqual(actual, {
        items: ['bar']
    });
});

const passengerFactoryForTypes = createFactory<Passenger>(() => {
    return {
        name: 'Type Jane',
        age: 30
    };
});

// @ts-expect-error -- arrays of factories must use `asArray()`
createFactory<Bus>(() => {
    return {
        passengers: [passengerFactoryForTypes]
    };
});

test('build() works with numbers', () => {
    const factory = createFactory<{ foo: number }>(() => {
        return {
            foo: 42
        };
    });

    const actual = factory.build({
        foo: 21
    });

    assert.deepStrictEqual(actual, {
        foo: 21
    });
});

test('build() works with strings', () => {
    const factory = createFactory<{ foo: string }>(() => {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.build({
        foo: 'baz'
    });

    assert.deepStrictEqual(actual, {
        foo: 'baz'
    });
});

test('build() works with booleans', () => {
    const factory = createFactory<{ foo: boolean }>(() => {
        return {
            foo: true
        };
    });

    const actual = factory.build({
        foo: false
    });

    assert.deepStrictEqual(actual, {
        foo: false
    });
});

test('build() works with nullable types', () => {
    const factory = createFactory<{ foo: boolean | null }>(() => {
        return {
            foo: null
        };
    });

    const actual = factory.build({
        foo: true
    });

    assert.deepStrictEqual(actual, {
        foo: true
    });
});

test('build() works with undefined types', () => {
    const factory = createFactory<{ foo: boolean | undefined }>(() => {
        return {
            foo: undefined
        };
    });

    const actual = factory.build({
        foo: true
    });

    assert.deepStrictEqual(actual, {
        foo: true
    });
});

test('build() works with functions', () => {
    const fn = (value: number): number => {
        return value + 1;
    };
    const factory = createFactory<{ foo: (value: number) => number }>(() => {
        return {
            foo: fn
        };
    });

    const actual = factory.build();

    assert.deepStrictEqual(actual, {
        foo: fn
    });
});

test('build() works with Date', () => {
    const factory = createFactory<{ foo: Date }>(() => {
        return {
            foo: new Date(0)
        };
    });

    const actual = factory.build({ foo: new Date(1) });

    assert.deepStrictEqual(actual, {
        foo: new Date(1)
    });
});
