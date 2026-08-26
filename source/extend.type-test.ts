import { describe, expect, test } from 'tstyche';
import { createFactory } from './main.ts';

type BaseShape = { readonly foo: string; };
type SameShape = { readonly foo: string; };
type ExtendedShape = { readonly foo: string; readonly bar: string; };

const baseFactory = createFactory<BaseShape>(function () {
    return { foo: 'base' };
});

describe('shapes accepted by extend()', function () {
    test('accepts a shape that adds a property', function () {
        expect(baseFactory.extend<ExtendedShape>).type.toBeCallableWith(function () {
            return { bar: 'extended' };
        });
    });

    test('rejects the shape the factory already builds', function () {
        expect(baseFactory.extend<BaseShape>).type.not.toBeCallableWith(function () {
            return { foo: 'extended' };
        });
    });

    test('rejects a separately declared shape identical to the one the factory already builds', function () {
        expect(baseFactory.extend<SameShape>).type.not.toBeCallableWith(function () {
            return { foo: 'extended' };
        });
    });

    test('rejects an extension without a type argument', function () {
        expect(baseFactory.extend).type.not.toBeCallableWith(function () {
            return { foo: 'extended' };
        });
    });
});
