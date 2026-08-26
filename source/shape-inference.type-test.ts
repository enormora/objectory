import { describe, expect, test } from 'tstyche';
import { createFactory } from './main.ts';

describe('object shapes inferred from the generator function', function () {
    test('keeps literal types of scalar properties', function () {
        const factory = createFactory(function () {
            return { type: 'a' };
        });

        expect(factory.build().type).type.toBe<'a'>();
    });

    test('widens the element type of an array property', function () {
        const factory = createFactory(function () {
            return { tags: [ 'a', 'b' ] };
        });

        expect(factory.build().tags[0]).type.toBe<string | undefined>();
    });

    test('resolves a nested factory to the shape it builds', function () {
        const factory = createFactory(function () {
            return {
                nested: createFactory<{ readonly kind: string; }>(function () {
                    return { kind: 'a' };
                })
            };
        });

        expect(factory.build().nested.kind).type.toBe<string>();
    });

    test('keeps the literal type of a nested factory that was not given a type argument', function () {
        const factory = createFactory(function () {
            return {
                nested: createFactory(function () {
                    return { kind: 'a' };
                })
            };
        });

        expect(factory.build().nested.kind).type.toBe<'a'>();
    });
});
