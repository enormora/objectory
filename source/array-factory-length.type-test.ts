import { describe, expect, test } from 'tstyche';
import { createFactory, type ArrayFactoryValue } from './main.ts';

type Price = { readonly currency: string; readonly amount: number; };

type SinglePriceShape = { readonly prices: readonly [Price]; };
type PricePairShape = { readonly prices: readonly [Price, Price]; };
type AdditionalPrices = readonly Price[];
type InlineTupleLimit = 64;
type ThreeElements = 3;
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

describe('the element types buildList() produces', function () {
    test('produces a tuple of exactly the requested length', function () {
        expect(priceFactory.buildList({ length: 3 })).type.toBe<readonly [Price, Price, Price]>();
        expect(priceFactory.buildList({ length: 1 })).type.toBe<readonly [Price]>();
    });

    test('produces an empty tuple without options', function () {
        expect(priceFactory.buildList()).type.toBe<readonly []>();
        expect(priceFactory.buildList({})).type.toBe<readonly []>();
    });

    test('gives every element of the tuple a defined type', function () {
        const [ first, second, third ] = priceFactory.buildList({ length: 3 });

        expect(first).type.toBe<Price>();
        expect(second).type.toBe<Price>();
        expect(third).type.toBe<Price>();
    });

    test('falls back to an unbounded array when the length is not known at compile time', function () {
        expect(priceFactory.buildList({ length: runtimeLength })).type.toBe<readonly Price[]>();
    });

    test('falls back to an unbounded array beyond the inline tuple limit', function () {
        expect(priceFactory.buildList({ length: 65 })).type.toBe<readonly Price[]>();
        expect(priceFactory.buildList({ length: 200 })).type.toBe<readonly Price[]>();
    });

    test('still produces a tuple at the inline tuple limit', function () {
        const elements = priceFactory.buildList({ length: 64 });

        expect(elements).type.not.toBe<readonly Price[]>();
        expect(elements.length).type.toBe<InlineTupleLimit>();
    });
});

describe('the length an array factory carries', function () {
    test('carries a literal length', function () {
        expect(priceFactory.asArray({ length: 3 })).type.toBe<ArrayFactoryValue<Price, ThreeElements>>();
    });

    test('carries a widened length when the length is not known at compile time', function () {
        expect(priceFactory.asArray({ length: runtimeLength })).type.toBe<ArrayFactoryValue<Price>>();
    });

    test('carries a zero length without options', function () {
        expect(priceFactory.asArray()).type.toBe<ArrayFactoryValue<Price, 0>>();
    });
});
