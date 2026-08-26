import { describe, expect, test } from 'tstyche';
import { createFactory } from './main.ts';

type Price = { readonly currency: string; readonly amount: number; };

type SinglePriceShape = { readonly prices: readonly [Price]; };
type PricePairShape = { readonly prices: readonly [Price, Price]; };
type AdditionalPrices = readonly Price[];
type NonEmptyPricesShape = { readonly prices: readonly [Price, ...AdditionalPrices]; };
type PriceListShape = { readonly prices: readonly Price[]; };

const priceFactory = createFactory<Price>(function () {
    return { currency: 'EUR', amount: 1 };
});

declare const runtimeLength: number;

describe('asArray() lengths against a fixed-length tuple property', function () {
    test('accepts a literal length that matches the tuple', function () {
        expect(createFactory<SinglePriceShape>).type.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: 1 }) };
        });
        expect(createFactory<PricePairShape>).type.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: 2 }) };
        });
    });

    test('rejects a literal length longer than the tuple', function () {
        expect(createFactory<SinglePriceShape>).type.not.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: 2 }) };
        });
    });

    test('rejects a literal length shorter than the tuple', function () {
        expect(createFactory<PricePairShape>).type.not.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: 1 }) };
        });
    });

    test('rejects a length that is not known at compile time', function () {
        expect(createFactory<SinglePriceShape>).type.not.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: runtimeLength }) };
        });
    });

    test('rejects asArray() without a length', function () {
        expect(createFactory<SinglePriceShape>).type.not.toBeCallableWith(function () {
            return { prices: priceFactory.asArray() };
        });
    });

    test('still accepts a tuple of factories', function () {
        expect(createFactory<SinglePriceShape>).type.toBeCallableWith(function () {
            return { prices: [ priceFactory ] };
        });
    });
});

describe('asArray() lengths against an unbounded array property', function () {
    test('accepts any literal length', function () {
        expect(createFactory<PriceListShape>).type.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: 3 }) };
        });
    });

    test('accepts a length that is not known at compile time', function () {
        expect(createFactory<PriceListShape>).type.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: runtimeLength }) };
        });
    });

    test('accepts any literal length for a non-empty tuple property', function () {
        expect(createFactory<NonEmptyPricesShape>).type.toBeCallableWith(function () {
            return { prices: priceFactory.asArray({ length: 3 }) };
        });
    });
});
