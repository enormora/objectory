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

const nestedFactoryMessage = 'a nested factory takes an object of overrides, received';
const arrayPropertyMessage = 'an array property takes an array of overrides, received';

test('build() throws when a nested factory is given a string', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ frontWheel: 'oops' });
    }, { name: 'TypeError', message: `Invalid override at "frontWheel": ${nestedFactoryMessage} a string` });
});

test('build() throws when a nested factory is given an array', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ frontWheel: [ { diameter: 26 } ] });
    }, { name: 'TypeError', message: `Invalid override at "frontWheel": ${nestedFactoryMessage} an array` });
});

test('build() throws when a nested factory is given a Date', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ frontWheel: new Date(0) });
    }, { name: 'TypeError', message: `Invalid override at "frontWheel": ${nestedFactoryMessage} a Date` });
});

test('build() throws when a nested factory is given an instance of a class', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ frontWheel: new Map() });
    }, { name: 'TypeError', message: `Invalid override at "frontWheel": ${nestedFactoryMessage} an object` });
});

test('build() throws when an array factory property is given a non-array object', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ spareWheels: { 0: { diameter: 26 } } });
    }, { name: 'TypeError', message: `Invalid override at "spareWheels": ${arrayPropertyMessage} an object` });
});

test('build() throws when an array factory property is given an instance of a class', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ spareWheels: new Map() });
    }, { name: 'TypeError', message: `Invalid override at "spareWheels": ${arrayPropertyMessage} an object` });
});

test('build() throws when a plain array property is given a non-array object', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ colours: { 0: 'green' } });
    }, { name: 'TypeError', message: `Invalid override at "colours": ${arrayPropertyMessage} an object` });
});

test('build() throws when withOverrides() carries a mismatched override kind', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.withOverrides({ frontWheel: 'oops' }).build();
    }, { name: 'TypeError', message: `Invalid override at "frontWheel": ${nestedFactoryMessage} a string` });
});

test('build() names the path from the root when a nested override has the wrong kind', function () {
    type Frame = { readonly wheel: Wheel; };
    const frameFactory = createFactory<Frame>(function () {
        return { wheel: wheelFactory };
    });
    const factory = createFactory<{ readonly frame: Frame; }>(function () {
        return { frame: frameFactory };
    });

    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return factory.build({ frame: { wheel: 'oops' } });
    }, { name: 'TypeError', message: `Invalid override at "frame.wheel": ${nestedFactoryMessage} a string` });
});

test('build() throws when an element of an array factory override is null', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ spareWheels: [ null ] });
    }, { name: 'TypeError', message: `Invalid override at "spareWheels.0": ${nestedFactoryMessage} null` });
});

test('build() throws when an element of an array factory override has the wrong kind', function () {
    assert.throws(function () {
        // @ts-expect-error -- consumers can bypass the invalid override with a type assertion
        return bicycleFactory.build({ spareWheels: [ { diameter: 26 }, 'oops' ] });
    }, { name: 'TypeError', message: `Invalid override at "spareWheels.1": ${nestedFactoryMessage} a string` });
});
