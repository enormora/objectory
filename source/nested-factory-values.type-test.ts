import { describe, expect, test } from 'tstyche';
import { createFactory, type ObjectoryFactory } from './main.ts';

type Driver = { readonly name: string; };
type Trip = { readonly driver: Driver; };

type WithoutSymbolKeys<Shape> = {
    readonly [Key in keyof Shape as Key extends string ? Key : never]: Shape[Key];
};

describe('nested factory values accepted by createFactory()', function () {
    test('accepts a factory created by createFactory()', function () {
        expect(createFactory<Trip>).type.toBeCallableWith(function () {
            return {
                driver: createFactory<Driver>(function () {
                    return { name: 'Jane Doe' };
                })
            };
        });
    });

    test('rejects a plain object where a nested factory is required', function () {
        expect(createFactory<Trip>).type.not.toBeCallableWith(function () {
            return { driver: { name: 'Jane Doe' } };
        });
    });

    test('rejects an object that implements all factory methods but was not created by createFactory()', function () {
        expect<WithoutSymbolKeys<ObjectoryFactory<Driver>>>()
            .type
            .not
            .toBeAssignableTo<ObjectoryFactory<Driver>>();
    });
});
