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

test('build() returns the given factory object as is', function () {
    const factory = createFactory<Person>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build();

    assert.deepStrictEqual<Person>(actual, { name: 'John Doe', age: 42 });
});

test('build() returns the given factory object as is even when using nested factories', function () {
    const factory = createFactory<{ top: { second: { third: string; level: number; }; }; }>(function () {
        return {
            top: createFactory(function () {
                return {
                    second: createFactory(function () {
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

test('build() allows overriding certain top level properties', function () {
    const factory = createFactory<Person>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build({ age: 24 });

    assert.deepStrictEqual<Person>(actual, { name: 'John Doe', age: 24 });
});

test('build() allows overriding all top level properties', function () {
    const factory = createFactory<Person>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const actual = factory.build({ name: 'Foobar', age: 24 });

    assert.deepStrictEqual<Person>(actual, { name: 'Foobar', age: 24 });
});

test('build() allows overriding two-level nested properties partially', function () {
    const passengersFactory = createFactory<Passengers>(function () {
        return {
            totalWeight: 0,
            amount: 0
        };
    });

    const carFactory = createFactory<Car>(function () {
        return {
            passengers: passengersFactory
        };
    });

    const actual = carFactory.build({ passengers: { amount: 4 } });

    assert.deepStrictEqual<Car>(actual, { passengers: { amount: 4, totalWeight: 0 } });
});

test('build() allows overriding two-level nested properties fully', function () {
    const passengersFactory = createFactory<Passengers>(function () {
        return {
            totalWeight: 0,
            amount: 0
        };
    });

    const carFactory = createFactory<Car>(function () {
        return {
            passengers: passengersFactory
        };
    });

    const actual = carFactory.build({ passengers: { totalWeight: 24, amount: 4 } });

    assert.deepStrictEqual<Car>(actual, { passengers: { amount: 4, totalWeight: 24 } });
});

test('build() allows overriding three-level nested properties partially', function () {
    const factory = createFactory<{ top: { second: { third: string; level: number; }; }; }>(function () {
        return {
            top: createFactory(function () {
                return {
                    second: createFactory(function () {
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

test('build() resolves factories nested inside arrays', function () {
    const passengerFactory = createFactory<Passenger>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(function () {
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

test('build() returns empty arrays by default when using factories as arrays', function () {
    const passengerFactory = createFactory<Passenger>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(function () {
        return {
            passengers: passengerFactory.asArray()
        };
    });

    const actual = busFactory.build();

    assert.deepStrictEqual(actual, {
        passengers: []
    });
});

test('build() uses length when configuring factories as arrays', function () {
    const passengerFactory = createFactory<Passenger>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(function () {
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

test('build() allows overriding factories nested inside arrays', function () {
    const passengerFactory = createFactory<Passenger>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(function () {
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

test('build() allows overriding factories nested inside arrays in arbitrary elements', function () {
    const passengerFactory = createFactory<Passenger>(function () {
        return {
            name: 'John Doe',
            age: 42
        };
    });

    const busFactory = createFactory<Bus>(function () {
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

test('build() allows overriding factories with plain arrays', function () {
    const factory = createFactory<{ items: string[]; }>(function () {
        return {
            items: [ 'foo', 'baz' ]
        };
    });

    const actual = factory.build({
        items: [ 'bar' ]
    });

    assert.deepStrictEqual(actual, {
        items: [ 'bar' ]
    });
});

const passengerFactoryForTypes = createFactory<Passenger>(function () {
    return {
        name: 'Type Jane',
        age: 30
    };
});

// @ts-expect-error -- arrays of factories must use `asArray()`
createFactory<Bus>(function () {
    return {
        passengers: [ passengerFactoryForTypes ]
    };
});

test('build() works with numbers', function () {
    const factory = createFactory<{ foo: number; }>(function () {
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

test('build() works with strings', function () {
    const factory = createFactory<{ foo: string; }>(function () {
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

test('build() works with booleans', function () {
    const factory = createFactory<{ foo: boolean; }>(function () {
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

test('build() works with nullable types', function () {
    const factory = createFactory<{ foo: boolean | null; }>(function () {
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

test('build() works with undefined types', function () {
    const factory = createFactory<{ foo: boolean | undefined; }>(function () {
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

test('build() works with functions', function () {
    const fn = function (value: number): number {
        return value + 1;
    };
    const factory = createFactory<{ foo: (value: number) => number; }>(function () {
        return {
            foo: fn
        };
    });

    const actual = factory.build();

    assert.deepStrictEqual(actual, {
        foo: fn
    });
});

test('build() works with Date', function () {
    const factory = createFactory<{ foo: Date; }>(function () {
        return {
            foo: new Date(0)
        };
    });

    const actual = factory.build({ foo: new Date(1) });

    assert.deepStrictEqual(actual, {
        foo: new Date(1)
    });
});

test('build() works with overriding optional fields with undefined', function () {
    const factory = createFactory<{ foo?: string | undefined; }>(function () {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.build({ foo: undefined });

    assert.deepStrictEqual(actual, { foo: undefined });
});

test('build() works with overriding nullable fields with null', function () {
    const factory = createFactory<{ foo: string | null; }>(function () {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.build({ foo: null });

    assert.deepStrictEqual(actual, { foo: null });
});

test('build() works with overriding optional and nullable fields with undefined', function () {
    const factory = createFactory<{ baz: { foo: { bar: string; } | null | undefined; }; }>(function () {
        return {
            baz: createFactory<{ foo: { bar: string; } | null | undefined; }>(function () {
                return { foo: undefined };
            })
        };
    });

    const actual = factory.build({ baz: { foo: null } });

    assert.deepStrictEqual(actual, { baz: { foo: null } });
});

test('build() works with overriding arrays of primitives', function () {
    const factory = createFactory<{ foo: string[]; }>(function () {
        return {
            foo: [ 'qux' ]
        };
    });

    const actual = factory.build({ foo: [ 'bar' ] });

    assert.deepStrictEqual(actual, { foo: [ 'bar' ] });
});

test('build() works with overriding nested optional arrays of primitives', function () {
    const factory = createFactory<{ bar: { foo?: string[]; }; }>(function () {
        return {
            bar: createFactory<{ foo?: string[]; }>(function () {
                return {};
            })
        };
    });

    const actual = factory.build({ bar: { foo: [ 'bar' ] } });

    assert.deepStrictEqual(actual, { bar: { foo: [ 'bar' ] } });
});

test('build() works with overriding nullish Partial<> object', function () {
    type InnerType = { readonly foo: string; readonly bar: string | null; readonly baz: number; } | null | undefined;
    type PartialInnerType = Readonly<Partial<InnerType>>;
    const factory = createFactory<{ bar: PartialInnerType; }>(function () {
        return {
            bar: createFactory(function () {
                return { foo: 'bar', bar: 'baz' };
            })
        };
    });

    const actual = factory.build({
        bar: {
            bar: undefined
        }
    });

    assert.deepStrictEqual(actual, { bar: { foo: 'bar', bar: undefined } });
});
