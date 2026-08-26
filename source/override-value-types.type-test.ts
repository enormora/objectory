import { describe, expect, test } from 'tstyche';
import { createFactory } from './main.ts';

type Wheel = { readonly diameter: number; };

type Bicycle = {
    readonly brand: string;
    readonly frontWheel: Wheel;
    readonly spareWheels: readonly Wheel[];
    readonly colours: readonly string[];
};

type NullableBicycle = {
    readonly brand: string | null;
    readonly frontWheel: Wheel | null;
};

type UndefinedableBicycle = {
    readonly brand: string | undefined;
    readonly frontWheel: Wheel | undefined;
};

type OptionalBicycle = {
    readonly brand: string;
    readonly nickname?: string;
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

const nullableBicycleFactory = createFactory<NullableBicycle>(function () {
    return { brand: 'Acme', frontWheel: wheelFactory };
});

const undefinedableBicycleFactory = createFactory<UndefinedableBicycle>(function () {
    return { brand: 'Acme', frontWheel: wheelFactory };
});

const optionalBicycleFactory = createFactory<OptionalBicycle>(function () {
    return { brand: 'Acme' };
});

describe('null as an override value', function () {
    test('rejects null for a leaf whose type does not include it', function () {
        expect(bicycleFactory.build).type.not.toBeCallableWith({ brand: null });
    });

    test('rejects null for a nested factory property', function () {
        expect(bicycleFactory.build).type.not.toBeCallableWith({ frontWheel: null });
    });

    test('rejects null for an array factory property', function () {
        expect(bicycleFactory.build).type.not.toBeCallableWith({ spareWheels: null });
    });

    test('rejects null for a plain array property', function () {
        expect(bicycleFactory.build).type.not.toBeCallableWith({ colours: null });
    });

    test('accepts null where the property type includes it', function () {
        expect(nullableBicycleFactory.build).type.toBeCallableWith({ brand: null });
        expect(nullableBicycleFactory.build).type.toBeCallableWith({ frontWheel: null });
    });
});

describe('undefined as an override value', function () {
    test('rejects undefined for a required leaf', function () {
        expect(bicycleFactory.build).type.not.toBeCallableWith({ brand: undefined });
    });

    test('rejects undefined for a required nested factory property', function () {
        expect(bicycleFactory.build).type.not.toBeCallableWith({ frontWheel: undefined });
    });

    test('rejects undefined for a required array factory property', function () {
        expect(bicycleFactory.build).type.not.toBeCallableWith({ spareWheels: undefined });
    });

    test('rejects undefined for an optional property that does not spell undefined', function () {
        expect(optionalBicycleFactory.build).type.not.toBeCallableWith({ nickname: undefined });
    });

    test('accepts undefined where the property type spells it', function () {
        expect(undefinedableBicycleFactory.build).type.toBeCallableWith({ brand: undefined });
        expect(undefinedableBicycleFactory.build).type.toBeCallableWith({ frontWheel: undefined });
    });

    test('accepts undefined at an index of an array factory override to keep that default', function () {
        expect(bicycleFactory.build).type.toBeCallableWith({ spareWheels: [ undefined, { diameter: 26 } ] });
    });

    test('accepts undefined at an index of a plain array override to keep that default', function () {
        expect(bicycleFactory.build).type.toBeCallableWith({ colours: [ undefined, 'green' ] });
    });
});
