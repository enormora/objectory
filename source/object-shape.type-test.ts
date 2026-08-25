import { describe, expect, test } from 'tstyche';
import { createFactory } from './main.ts';

type LiteralUnionShape = { readonly type: 'a' | 'b'; };
type UniformArrayShape = { readonly tags: readonly string[]; };
type UnionArrayShape = { readonly tags: readonly ('a' | 'b')[]; };
type BooleanArrayShape = { readonly flags: readonly boolean[]; };
type TupleShape = { readonly pair: readonly ['a', true]; };
type VariantA = { readonly kind: 'a'; };
type VariantB = { readonly kind: 'b'; };
type UnionItemArrayShape = { readonly items: readonly (VariantA | VariantB)[]; };

/* eslint-disable @typescript-eslint/consistent-type-definitions -- only an interface lacks an implicit index signature, which is what the cases below are about */
interface InterfaceShape {
    readonly kind: 'a' | 'b';
}

interface InterfaceArrayShape {
    readonly tags: readonly ('a' | 'b')[];
}

interface BaseInterfaceShape {
    readonly url: string;
}

interface ExtendedInterfaceShape extends BaseInterfaceShape {
    readonly method: 'GET';
}
/* eslint-enable @typescript-eslint/consistent-type-definitions -- back to the project default */

type NestedInterfaceShape = { readonly nested: InterfaceShape; };

describe('object shapes accepted by createFactory()', function () {
    test('accepts a literal union without requiring an as const assertion', function () {
        expect(createFactory<LiteralUnionShape>).type.toBeCallableWith(function () {
            return { type: 'a' };
        });
        expect(createFactory<LiteralUnionShape>).type.not.toBeCallableWith(function () {
            return { type: 'c' };
        });
    });

    test('accepts an array with a single element type', function () {
        expect(createFactory<UniformArrayShape>).type.toBeCallableWith(function () {
            return { tags: [ 'first', 'second' ] };
        });
    });

    test('accepts an array with a union element type', function () {
        expect(createFactory<UnionArrayShape>).type.toBeCallableWith(function () {
            return { tags: [ 'a', 'b' ] };
        });
        expect(createFactory<UnionArrayShape>).type.not.toBeCallableWith(function () {
            return { tags: [ 'a', 'c' ] };
        });
    });

    test('accepts an array of booleans', function () {
        expect(createFactory<BooleanArrayShape>).type.toBeCallableWith(function () {
            return { flags: [ true, false ] };
        });
    });

    test('keeps the element order of a tuple', function () {
        expect(createFactory<TupleShape>).type.toBeCallableWith(function () {
            return { pair: [ 'a', true ] };
        });
        expect(createFactory<TupleShape>).type.not.toBeCallableWith(function () {
            return { pair: [ true, 'a' ] };
        });
    });

    test('requires an array factory covering every item shape of a union', function () {
        const singleVariantFactory = createFactory<VariantA>(function () {
            return { kind: 'a' };
        });
        const unionFactory = createFactory<VariantA | VariantB>(function () {
            return { kind: 'a' };
        });

        expect(createFactory<UnionItemArrayShape>).type.toBeCallableWith(function () {
            return { items: unionFactory.asArray({ length: 1 }) };
        });
        expect(createFactory<UnionItemArrayShape>).type.not.toBeCallableWith(function () {
            return { items: singleVariantFactory.asArray({ length: 1 }) };
        });
    });

    test('accepts an interface as the object shape', function () {
        const factory = createFactory<InterfaceShape>(function () {
            return { kind: 'a' };
        });

        expect(factory.build()).type.toBeAssignableTo<InterfaceShape>();
        expect(factory.build({ kind: 'b' })).type.toBeAssignableTo<InterfaceShape>();
    });

    test('accepts an interface as the type of a nested property', function () {
        const nestedFactory = createFactory<InterfaceShape>(function () {
            return { kind: 'a' };
        });
        const factory = createFactory<NestedInterfaceShape>(function () {
            return { nested: nestedFactory };
        });

        expect(factory.build()).type.toBeAssignableTo<NestedInterfaceShape>();
        expect(factory.build({ nested: { kind: 'b' } })).type.toBeAssignableTo<NestedInterfaceShape>();
    });

    test('accepts an interface with an array property', function () {
        const factory = createFactory<InterfaceArrayShape>(function () {
            return { tags: [ 'a', 'b' ] };
        });

        expect(factory.build()).type.toBeAssignableTo<InterfaceArrayShape>();
    });

    test('extends a factory with an interface', function () {
        const baseFactory = createFactory<BaseInterfaceShape>(function () {
            return { url: 'https://example.com' };
        });
        const extendedFactory = baseFactory.extend<ExtendedInterfaceShape>(function () {
            return { method: 'GET' };
        });

        expect(extendedFactory.build()).type.toBeAssignableTo<ExtendedInterfaceShape>();
    });
});
