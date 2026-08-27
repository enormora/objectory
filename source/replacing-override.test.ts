import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory } from './main.ts';

type Wheel = {
    readonly diameter: number;
};

type Bicycle = {
    readonly frontWheel: Wheel | null;
    readonly rearWheel: Wheel | undefined;
    readonly spareWheels: readonly Wheel[] | null;
    readonly relatedWheels: readonly Wheel[] | null;
    readonly colours: readonly string[] | null;
};

const wheelFactory = createFactory<Wheel>(function () {
    return { diameter: 28 };
});

const bicycleFactory = createFactory<Bicycle>(function () {
    return {
        frontWheel: wheelFactory,
        rearWheel: wheelFactory,
        spareWheels: wheelFactory.asArray({ length: 2 }),
        relatedWheels: [ wheelFactory ],
        colours: [ 'red', 'blue' ]
    };
});

test('build() sets a nested factory property to null', function () {
    assert.strictEqual(bicycleFactory.build({ frontWheel: null }).frontWheel, null);
});

test('build() sets a nested factory property to undefined', function () {
    assert.strictEqual(bicycleFactory.build({ rearWheel: undefined }).rearWheel, undefined);
});

test('build() sets an array factory property to null', function () {
    assert.strictEqual(bicycleFactory.build({ spareWheels: null }).spareWheels, null);
});

test('build() sets an array of factories property to null', function () {
    assert.strictEqual(bicycleFactory.build({ relatedWheels: null }).relatedWheels, null);
});

test('build() sets an array of primitives property to null', function () {
    assert.strictEqual(bicycleFactory.build({ colours: null }).colours, null);
});

test('build() keeps the other defaults when one property is replaced', function () {
    const actual = bicycleFactory.build({ frontWheel: null });

    assert.deepStrictEqual(actual, {
        frontWheel: null,
        rearWheel: { diameter: 28 },
        spareWheels: [ { diameter: 28 }, { diameter: 28 } ],
        relatedWheels: [ { diameter: 28 } ],
        colours: [ 'red', 'blue' ]
    });
});

test('withOverrides() carries a replacing override for a nested factory property', function () {
    assert.strictEqual(bicycleFactory.withOverrides({ frontWheel: null }).build().frontWheel, null);
});

test('build() replaces a nested factory property at depth', function () {
    type Frame = {
        readonly wheel: Wheel | null;
    };
    const frameFactory = createFactory<Frame>(function () {
        return { wheel: wheelFactory };
    });
    const factory = createFactory<{ readonly frame: Frame; }>(function () {
        return { frame: frameFactory };
    });

    const actual = factory.build({ frame: { wheel: null } });

    assert.deepStrictEqual(actual, { frame: { wheel: null } });
});

test('build() replaces a factory at an index of an array override', function () {
    type Rack = {
        readonly wheels: readonly (Wheel | null)[];
    };
    const rackFactory = createFactory<Rack>(function () {
        return { wheels: [ wheelFactory, wheelFactory ] };
    });

    const actual = rackFactory.build({ wheels: [ null, { diameter: 26 } ] });

    assert.deepStrictEqual(actual, { wheels: [ null, { diameter: 26 } ] });
});

type Trailer = {
    readonly spareWheels: string | readonly Wheel[];
    readonly relatedWheels: number | readonly Wheel[];
    readonly colours: string | readonly string[];
    readonly inspectedAt: Date | readonly Wheel[];
};

const trailerFactory = createFactory<Trailer>(function () {
    return {
        spareWheels: wheelFactory.asArray({ length: 2 }),
        relatedWheels: [ wheelFactory ],
        colours: [ 'red' ],
        inspectedAt: wheelFactory.asArray({ length: 1 })
    };
});

test('build() replaces an array factory property with a string the type allows', function () {
    assert.strictEqual(trailerFactory.build({ spareWheels: 'none' }).spareWheels, 'none');
});

test('build() replaces an array of factories property with a number the type allows', function () {
    assert.strictEqual(trailerFactory.build({ relatedWheels: 0 }).relatedWheels, 0);
});

test('build() replaces an array of primitives property with a string the type allows', function () {
    assert.strictEqual(trailerFactory.build({ colours: 'none' }).colours, 'none');
});

test('build() replaces an array factory property with a Date the type allows', function () {
    assert.deepStrictEqual(trailerFactory.build({ inspectedAt: new Date(0) }).inspectedAt, new Date(0));
});
