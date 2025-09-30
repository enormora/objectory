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
