import { describe, expect, test } from 'tstyche';
import { createFactory } from './main.ts';

type Pet = { readonly kind: string; readonly age: number; };
type Driver = { readonly name: string; readonly pet: Pet; };

const petFactory = createFactory<Pet>(function () {
    return { kind: 'cat', age: 3 };
});

const driverFactory = createFactory<Driver>(function () {
    return { name: 'Jane Doe', pet: petFactory };
});

describe('override values accepted by build()', function () {
    test('accepts the values built by another factory', function () {
        expect(driverFactory.build).type.toBeCallableWith({ pet: petFactory.build() });
    });

    test('rejects a factory', function () {
        expect(driverFactory.build).type.not.toBeCallableWith({ pet: petFactory });
    });

    test('rejects an array factory', function () {
        expect(driverFactory.build).type.not.toBeCallableWith({ pet: petFactory.asArray({ length: 1 }) });
    });
});
