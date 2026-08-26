import assert from 'node:assert';
import { test } from 'node:test';
import fc from 'fast-check';
import { createUnionFactory } from './main.ts';
import { buildFactory, buildWith, type AnyFactory, type GeneratedShape } from './shape-arbitrary.test-support.ts';

const runs = 200;
const seed = 20_260_826;

type VariantPlan = {
    readonly discriminator: string;
    readonly sharedKeys: readonly string[];
    readonly exclusiveKeys: readonly (readonly string[])[];
};

const sharedNames = [ 'id', 'label', 'weight' ] as const;
const exclusiveNames = [ 'onlyA', 'onlyB', 'onlyC' ] as const;

function variantPlanArbitrary(): fc.Arbitrary<VariantPlan> {
    return fc
        .tuple(
            fc.uniqueArray(fc.constantFrom(...sharedNames), { minLength: 0, maxLength: 3 }),
            fc.integer({ min: 2, max: 3 })
        )
        .map(function toPlan([ shared, variantCount ]) {
            return {
                discriminator: 'kind',
                sharedKeys: shared,
                exclusiveKeys: exclusiveNames.slice(0, variantCount).map(function toKeys(name) {
                    return [ name ];
                })
            };
        });
}

function variantShape(plan: VariantPlan, index: number): GeneratedShape {
    const names = [
        ...plan.sharedKeys,
        ...plan.exclusiveKeys[index] ?? [],
        plan.discriminator
    ];

    return Object.fromEntries(names.map(function toEntry(name) {
        const value = name === plan.discriminator ? `variant-${index}` : `value-${name}`;

        return [ name, { kind: 'leaf', value, values: [], length: 0, shapes: [] } ];
    }));
}

function unionFactoryFor(plan: VariantPlan): AnyFactory {
    const [ first, ...rest ] = plan.exclusiveKeys.map(function toFactory(_keys, index) {
        return buildFactory(variantShape(plan, index));
    });

    if (first === undefined) {
        throw new TypeError('A variant plan needs at least one variant');
    }

    return createUnionFactory([ first, ...rest ]);
}

test('switching variant leaves no key exclusive to another variant behind', function () {
    fc.assert(
        fc.property(variantPlanArbitrary(), function checkVariantIntegrity(plan) {
            const factory = unionFactoryFor(plan);

            plan.exclusiveKeys.forEach(function checkTarget(_keys, index) {
                const built = buildWith(factory, { [plan.discriminator]: `variant-${index}` });
                const expected = Object.keys(variantShape(plan, index));

                assert.deepStrictEqual(
                    Object.keys(built).toSorted(function compare(left, right) {
                        return left.localeCompare(right);
                    }),
                    expected.toSorted(function compare(left, right) {
                        return left.localeCompare(right);
                    }),
                    `switching to variant-${index} should produce exactly that variant's keys`
                );
            });
        }),
        { numRuns: runs, seed }
    );
});

test('an override of a shared key stays in the default variant', function () {
    fc.assert(
        fc.property(variantPlanArbitrary(), function checkSharedOverride(plan) {
            if (plan.sharedKeys.length === 0) {
                return;
            }

            const factory = unionFactoryFor(plan);
            const [ sharedKey ] = plan.sharedKeys;
            const built = buildWith(factory, { [sharedKey ?? '']: 'changed' });

            assert.strictEqual(built[plan.discriminator], 'variant-0');
            assert.strictEqual(built[sharedKey ?? ''], 'changed');
        }),
        { numRuns: runs, seed }
    );
});

test('the built value always matches exactly one registered variant', function () {
    fc.assert(
        fc.property(variantPlanArbitrary(), fc.integer({ min: 0, max: 2 }), function checkMembership(plan, target) {
            const factory = unionFactoryFor(plan);
            const index = target % plan.exclusiveKeys.length;
            const built = buildWith(factory, { [plan.discriminator]: `variant-${index}` });
            const matching = plan.exclusiveKeys.filter(function matches(_keys, candidate) {
                const shape = variantShape(plan, candidate);

                return Object.keys(shape).length === Object.keys(built).length &&
                    Object.keys(shape).every(function hasKey(key) {
                        return Object.hasOwn(built, key);
                    });
            });

            assert.strictEqual(matching.length, 1, 'the built value should match exactly one variant');
        }),
        { numRuns: runs, seed }
    );
});
