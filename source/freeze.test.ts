import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

type Wheel = {
    readonly diameter: number;
};

type Bicycle = {
    readonly brand: string;
    readonly frontWheel: Wheel;
    readonly spareWheels: readonly Wheel[];
    readonly colours: readonly string[];
};

const wheelFactory = createFactory<Wheel>(function () {
    return { diameter: 28 };
});

const bicycleFactory = createFactory<Bicycle>(function () {
    return {
        brand: 'Acme',
        frontWheel: wheelFactory,
        spareWheels: wheelFactory.asArray({ length: 2 }),
        colours: [ 'red', 'blue' ]
    };
});

test('build() returns a mutable value by default', function () {
    const bicycle = bicycleFactory.build();

    assert.strictEqual(Object.isFrozen(bicycle), false);
    assert.strictEqual(Object.isFrozen(bicycle.frontWheel), false);
    assert.strictEqual(Object.isFrozen(bicycle.spareWheels), false);
});

test('build() freezes the whole value when asked to', function () {
    const bicycle = bicycleFactory.build({}, { freeze: true });

    assert.strictEqual(Object.isFrozen(bicycle), true);
    assert.strictEqual(Object.isFrozen(bicycle.frontWheel), true);
    assert.strictEqual(Object.isFrozen(bicycle.spareWheels), true);
    assert.strictEqual(Object.isFrozen(bicycle.colours), true);
});

test('build() freezes the elements of an array property', function () {
    const bicycle = bicycleFactory.build({}, { freeze: true });
    const [ firstSpare ] = bicycle.spareWheels;

    assert.strictEqual(Object.isFrozen(firstSpare), true);
});

test('build() keeps the value mutable for an explicit freeze of false', function () {
    const bicycle = bicycleFactory.build({}, { freeze: false });

    assert.strictEqual(Object.isFrozen(bicycle), false);
});

test('build() freezes a value that carries overrides', function () {
    const bicycle = bicycleFactory.build({ frontWheel: { diameter: 26 } }, { freeze: true });

    assert.deepStrictEqual(bicycle.frontWheel, { diameter: 26 });
    assert.strictEqual(Object.isFrozen(bicycle.frontWheel), true);
});

test('build() rejects a mutation of a frozen value', function () {
    const bicycle = bicycleFactory.build({}, { freeze: true });

    assert.throws(function () {
        // @ts-expect-error -- the shape is readonly, and the value is frozen at runtime too
        bicycle.frontWheel.diameter = 30;
    }, { name: 'TypeError' });
});

test('buildList() returns mutable elements by default', function () {
    const bicycles = bicycleFactory.buildList({ length: 2 });

    assert.strictEqual(Object.isFrozen(bicycles), false);
    assert.strictEqual(Object.isFrozen(bicycles[0]), false);
});

test('buildList() freezes the list and every element when asked to', function () {
    const bicycles = bicycleFactory.buildList({ length: 2, freeze: true });

    assert.strictEqual(Object.isFrozen(bicycles), true);
    assert.strictEqual(Object.isFrozen(bicycles[0]), true);
    assert.strictEqual(Object.isFrozen(bicycles[1].frontWheel), true);
});

test('buildList() keeps distinct elements when freezing', function () {
    const bicycles = bicycleFactory.buildList({ length: 2, freeze: true });

    assert.notStrictEqual(bicycles[0], bicycles[1]);
    assert.deepStrictEqual(bicycles[0], bicycles[1]);
});

test('build() freezes a Date in the built value', function () {
    const factory = createFactory<{ readonly createdAt: Date; }>(function () {
        return { createdAt: new Date(0) };
    });

    const built = factory.build({}, { freeze: true });

    assert.strictEqual(Object.isFrozen(built.createdAt), true);
});
