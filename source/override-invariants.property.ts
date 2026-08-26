import assert from 'node:assert';
import { test } from 'node:test';
import fc from 'fast-check';
import { isRecord } from './record.ts';
import {
    buildFactory,
    buildWith,
    type AnyFactory,
    elementsAt,
    mismatchedOverrideArbitrary,
    shapeArbitrary,
    type GeneratedShape,
    type UntypedOverride
} from './shape-arbitrary.test-support.ts';

const runs = 300;
const seed = 20_260_826;

function overrideArbitraryFor(shape: GeneratedShape): fc.Arbitrary<UntypedOverride> {
    const entries = Object.entries(shape).map(function toEntry([ name, property ]) {
        if (property.kind === 'leaf') {
            return fc.constant([ name, 'overridden' ] as const);
        }

        if (property.kind === 'valueArray') {
            return fc.constant([ name, [ 'overridden' ] ] as const);
        }

        if (property.kind === 'nestedFactory') {
            return fc.constant([ name, {} ] as const);
        }

        return fc.constant([ name, [] ] as const);
    });

    return fc.subarray(entries, { minLength: 0 }).chain(function pick(chosen) {
        if (chosen.length === 0) {
            return fc.constant({});
        }

        return fc.tuple(...chosen).map(function toOverride(pairs) {
            return Object.fromEntries(pairs);
        });
    });
}

function sortedKeys(value: Readonly<Record<string, unknown>>): readonly string[] {
    return Object.keys(value).toSorted(function compare(left, right) {
        return left.localeCompare(right);
    });
}

function tryBuild(factory: AnyFactory, override: UntypedOverride): UntypedOverride | null {
    try {
        return buildWith(factory, override);
    } catch {
        return null;
    }
}

function collectSymbolKeys(value: unknown): readonly symbol[] {
    if (Array.isArray(value)) {
        return value.flatMap(collectSymbolKeys);
    }

    if (isRecord(value)) {
        return [
            ...Object.getOwnPropertySymbols(value),
            ...Object.values(value).flatMap(collectSymbolKeys)
        ];
    }

    return [];
}

test('every override is either observable in the built object or throws', function () {
    fc.assert(
        fc.property(shapeArbitrary(), function checkOverridesApply(shape) {
            const factory = buildFactory(shape);

            fc.assert(
                fc.property(overrideArbitraryFor(shape), function checkOverride(override) {
                    const built = buildWith(factory, override);

                    for (const [ name, value ] of Object.entries(override)) {
                        const builtValue = built[name];

                        if (Array.isArray(value)) {
                            assert.strictEqual(
                                elementsAt(built, name).length,
                                value.length,
                                `${name} should take the override length`
                            );
                        } else if (typeof value === 'string') {
                            assert.strictEqual(builtValue, value, `${name} should take the override value`);
                        }
                    }
                }),
                { numRuns: 20, seed }
            );
        }),
        { numRuns: runs, seed }
    );
});

test('the built key set is the generated keys together with the override keys', function () {
    fc.assert(
        fc.property(shapeArbitrary(), function checkKeys(shape) {
            const built = buildFactory(shape).build();

            assert.deepStrictEqual(sortedKeys(built), sortedKeys(shape));
        }),
        { numRuns: runs, seed }
    );
});

test('no internal marker ever reaches the built object', function () {
    fc.assert(
        fc.property(shapeArbitrary(), function checkNoMarkers(shape) {
            const factory = buildFactory(shape);
            const override = Object.fromEntries(
                Object
                    .entries(shape)
                    .filter(function isNested([ , property ]) {
                        return property.kind === 'nestedFactory';
                    })
                    .map(function toEntry([ name ]) {
                        return [ name, {} ];
                    })
            );

            assert.deepStrictEqual(collectSymbolKeys(buildWith(factory, override)), []);
        }),
        { numRuns: runs, seed }
    );
});

test('build() does not mutate the overrides it was given', function () {
    fc.assert(
        fc.property(shapeArbitrary(), function checkPurity(shape) {
            const factory = buildFactory(shape);
            const override = Object.fromEntries(
                Object
                    .entries(shape)
                    .filter(function isNested([ , property ]) {
                        return property.kind === 'nestedFactory';
                    })
                    .map(function toEntry([ name ]) {
                        return [ name, {} ];
                    })
            );
            const snapshot = structuredClone(override);

            buildWith(factory, override);

            assert.deepStrictEqual(override, snapshot);
        }),
        { numRuns: runs, seed }
    );
});

test('building twice with the same overrides gives a deeply equal result', function () {
    fc.assert(
        fc.property(shapeArbitrary(), function checkDeterminism(shape) {
            const factory = buildFactory(shape);

            assert.deepStrictEqual(factory.build(), factory.build());
        }),
        { numRuns: runs, seed }
    );
});

test('an override array length always wins over the generated length', function () {
    fc.assert(
        fc.property(shapeArbitrary(), fc.integer({ min: 0, max: 4 }), function checkLength(shape, length) {
            const factory = buildFactory(shape);
            const arrayNames = Object
                .entries(shape)
                .filter(function isArrayLike([ , property ]) {
                    return property.kind === 'arrayFactory' || property.kind === 'factoryArray';
                })
                .map(function toName([ name ]) {
                    return name;
                });
            const override = Object.fromEntries(arrayNames.map(function toEntry(name) {
                return [
                    name,
                    Array.from({ length }, function toItem() {
                        return {};
                    })
                ];
            }));
            const built = buildWith(factory, override);

            for (const name of arrayNames) {
                assert.strictEqual(elementsAt(built, name).length, length, `${name} length`);
            }
        }),
        { numRuns: runs, seed }
    );
});

test('an override of the wrong kind is never silently dropped', function () {
    fc.assert(
        fc.property(shapeArbitrary(), function checkNoSilentDrop(shape) {
            const factory = buildFactory(shape);

            fc.assert(
                fc.property(mismatchedOverrideArbitrary(shape), function checkMismatch({ name, value }) {
                    if (name === '') {
                        return;
                    }

                    const withoutOverride = buildWith(factory, {});
                    const built = tryBuild(factory, { [name]: value });

                    if (built === null) {
                        return;
                    }

                    assert.notDeepStrictEqual(
                        built[name],
                        withoutOverride[name],
                        `overriding "${name}" with ${String(value)} neither applied nor threw`
                    );
                }),
                { numRuns: 30, seed }
            );
        }),
        { numRuns: runs, seed }
    );
});
