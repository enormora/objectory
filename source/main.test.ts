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

test('build() works with overriding optional fields with undefined', () => {
    const factory = createFactory<{ foo?: string | undefined }>(() => {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.build({ foo: undefined });

    assert.deepStrictEqual(actual, { foo: undefined });
});

test('build() works with overriding nullable fields with null', () => {
    const factory = createFactory<{ foo: string | null }>(() => {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.build({ foo: null });

    assert.deepStrictEqual(actual, { foo: null });
});

test('build() works with overriding optional and nullable fields with undefined', () => {
    const factory = createFactory<{ baz: { foo: { bar: string } | null | undefined } }>(() => {
        return {
            baz: createFactory<{ foo: { bar: string } | null | undefined }>(() => {
                return { foo: undefined };
            })
        };
    });

    const actual = factory.build({ baz: { foo: null } });

    assert.deepStrictEqual(actual, { baz: { foo: null } });
});

test('build() works with overriding arrays of primitives', () => {
    const factory = createFactory<{ foo: string[] }>(() => {
        return {
            foo: ['qux']
        };
    });

    const actual = factory.build({ foo: ['bar'] });

    assert.deepStrictEqual(actual, { foo: ['bar'] });
});

test('build() works with overriding nested optional arrays of primitives', () => {
    const factory = createFactory<{ bar: { foo?: string[] } }>(() => {
        return {
            bar: createFactory<{ foo?: string[] }>(() => {
                return {};
            })
        };
    });

    const actual = factory.build({ bar: { foo: ['bar'] } });

    assert.deepStrictEqual(actual, { bar: { foo: ['bar'] } });
});

test('build() works with overriding nullish Partial<> object', () => {
    type InnerType = { foo: string; bar: string | null; baz: number } | null | undefined;
    type PartialInnerType = Partial<InnerType>;
    const factory = createFactory<{ bar: PartialInnerType }>(() => {
        return {
            bar: createFactory(() => {
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

test('buildList() returns an empty array by default', () => {
    const factory = createFactory<{ foo: string }>(() => {
        return {
            foo: 'bar'
        };
    });

    const actual = factory.buildList();

    assert.deepStrictEqual(actual, []);
});

test('buildList() generates objects using the factory defaults', () => {
    let counter = 0;
    const factory = createFactory<{ index: number }>(() => {
        const value = counter;
        counter += 1;

        return {
            index: value
        };
    });

    const actual = factory.buildList({ length: 3 });

    assert.deepStrictEqual(actual, [{ index: 0 }, { index: 1 }, { index: 2 }]);
});

test('buildList() respects withOverrides()', () => {
    const baseFactory = createFactory<{ label: string; count: number }>(() => {
        return {
            label: 'base',
            count: 1
        };
    });

    const customizedFactory = baseFactory.withOverrides({ label: 'custom' });

    const actual = customizedFactory.buildList({ length: 2 });

    assert.deepStrictEqual(actual, [
        { label: 'custom', count: 1 },
        { label: 'custom', count: 1 }
    ]);
});

test('withOverrides() returns a factory with updated defaults', () => {
    const factory = createFactory<{ foo: string; count: number }>(() => {
        return {
            foo: 'base',
            count: 1
        };
    });

    const customized = factory.withOverrides({ count: 5 });

    assert.deepStrictEqual(factory.build(), { foo: 'base', count: 1 });
    assert.deepStrictEqual(customized.build(), { foo: 'base', count: 5 });
});

test('withOverrides() merges nested factory overrides', () => {
    const factory = createFactory<{ nested: { value: string } }>(() => {
        return {
            nested: createFactory(() => {
                return { value: 'alpha' };
            })
        };
    });

    const customized = factory.withOverrides({ nested: { value: 'beta' } });

    assert.deepStrictEqual(factory.build(), { nested: { value: 'alpha' } });
    assert.deepStrictEqual(customized.build(), { nested: { value: 'beta' } });
});

test('withOverrides() can be chained and still accepts build overrides', () => {
    const factory = createFactory<{ foo: string; bar: string }>(() => {
        return {
            foo: 'one',
            bar: 'two'
        };
    });

    const customized = factory.withOverrides({ foo: 'custom' }).withOverrides({ bar: 'default' });

    const actual = customized.build({ bar: 'override' });

    assert.deepStrictEqual(actual, { foo: 'custom', bar: 'override' });
});
