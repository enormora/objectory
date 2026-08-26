import fc from 'fast-check';
import {
    createFactory,
    type AllowedObjectShapeValues,
    type ObjectoryFactory,
    type ShapeToGeneratorReturnValue
} from './main.ts';

type LeafValue = Date | boolean | number | string | null;

type PropertyKind = 'arrayFactory' | 'factoryArray' | 'leaf' | 'nestedFactory' | 'valueArray';

export type GeneratedProperty = {
    readonly kind: PropertyKind;
    readonly value: LeafValue;
    readonly values: readonly LeafValue[];
    readonly length: number;
    readonly shapes: readonly GeneratedShape[];
};

export type GeneratedShape = Readonly<Record<string, GeneratedProperty>>;

type AnyShape = Readonly<Record<string, AllowedObjectShapeValues>>;

export type AnyFactory = ObjectoryFactory<AnyShape>;

export type UntypedOverride = Readonly<Record<string, unknown>>;

const propertyNames = [ 'alpha', 'beta', 'gamma', 'delta' ] as const;
const factoryKinds: ReadonlySet<PropertyKind> = new Set([ 'arrayFactory', 'factoryArray', 'nestedFactory' ]);
const maxArrayLength = 3;
const wrongKindValues: readonly unknown[] = [ null, 'a string', maxArrayLength, new Date(0), true ];

function leafValueArbitrary(): fc.Arbitrary<LeafValue> {
    return fc.oneof(
        fc.string({ maxLength: 4 }),
        fc.integer({ min: -20, max: 20 }),
        fc.boolean(),
        fc.constant(null),
        fc.constant(new Date(0))
    );
}

function emptyProperty(kind: PropertyKind): GeneratedProperty {
    return { kind, value: null, values: [], length: 0, shapes: [] };
}

function shapeFromNames(
    names: readonly string[],
    properties: readonly GeneratedProperty[]
): GeneratedShape {
    return Object.fromEntries(names.map(function toEntry(name, index) {
        return [ name, properties[index] ?? emptyProperty('leaf') ];
    }));
}

export function shapeArbitrary(): fc.Arbitrary<GeneratedShape> {
    const { shape } = fc.letrec<{ readonly property: GeneratedProperty; readonly shape: GeneratedShape; }>(
        function build(tie) {
            return {
                property: fc.oneof(
                    {
                        arbitrary: leafValueArbitrary().map(function toLeaf(value) {
                            return { ...emptyProperty('leaf'), value };
                        }),
                        depthSize: 'small',
                        weight: 3
                    },
                    {
                        arbitrary: fc
                            .array(leafValueArbitrary(), { maxLength: maxArrayLength })
                            .map(function toValueArray(values) {
                                return { ...emptyProperty('valueArray'), values };
                            }),
                        weight: 1
                    },
                    {
                        arbitrary: tie('shape').map(function toNested(nested) {
                            return { ...emptyProperty('nestedFactory'), shapes: [ nested ] };
                        }),
                        weight: 2
                    },
                    {
                        arbitrary: fc
                            .tuple(tie('shape'), fc.integer({ min: 0, max: maxArrayLength }))
                            .map(function toArrayFactory([ nested, length ]) {
                                return { ...emptyProperty('arrayFactory'), length, shapes: [ nested ] };
                            }),
                        weight: 1
                    },
                    {
                        arbitrary: fc
                            .array(tie('shape'), { minLength: 1, maxLength: 2 })
                            .map(function toFactoryArray(shapes) {
                                return { ...emptyProperty('factoryArray'), shapes };
                            }),
                        weight: 1
                    }
                ),
                shape: fc
                    .uniqueArray(fc.constantFrom(...propertyNames), { minLength: 1, maxLength: 4 })
                    .chain(function withProperties(names) {
                        return fc
                            .array(tie('property'), { minLength: names.length, maxLength: names.length })
                            .map(function toShape(properties) {
                                return shapeFromNames(names, properties);
                            });
                    })
            };
        }
    );

    return shape;
}

type FactoryBuilder = (shape: GeneratedShape) => AnyFactory;

function firstShape(property: GeneratedProperty): GeneratedShape {
    return property.shapes[0] ?? {};
}

function toGeneratorValue(property: GeneratedProperty, build: FactoryBuilder): unknown {
    if (property.kind === 'leaf') {
        return property.value;
    }

    if (property.kind === 'valueArray') {
        return property.values;
    }

    if (property.kind === 'nestedFactory') {
        return build(firstShape(property));
    }

    if (property.kind === 'arrayFactory') {
        return build(firstShape(property)).asArray({ length: property.length });
    }

    return property.shapes.map(build);
}

export function buildFactory(shape: GeneratedShape): AnyFactory {
    return createFactory<AnyShape>(function generate() {
        const generated = Object.fromEntries(
            Object.entries(shape).map(function toEntry([ name, property ]) {
                return [ name, toGeneratorValue(property, buildFactory) ];
            })
        );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- built to match by construction
        return generated as ShapeToGeneratorReturnValue<AnyShape>;
    });
}

export function buildWith(factory: AnyFactory, override: UntypedOverride): UntypedOverride {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- a property test drives build() dynamically
    const build = factory.build as (overrides: UntypedOverride) => UntypedOverride;

    return build(override);
}

export function elementsAt(built: UntypedOverride, name: string): readonly unknown[] {
    const value = built[name];

    if (!Array.isArray(value)) {
        throw new TypeError(`Expected "${name}" to be an array`);
    }

    return value;
}

export type MismatchedOverride = { readonly name: string; readonly value: unknown; };

export function mismatchedOverrideArbitrary(shape: GeneratedShape): fc.Arbitrary<MismatchedOverride> {
    const candidates = Object
        .entries(shape)
        .filter(function takesRecordOrArray([ , property ]) {
            return factoryKinds.has(property.kind);
        })
        .flatMap(function toCandidates([ name ]) {
            return wrongKindValues.map(function toCandidate(value): MismatchedOverride {
                return { name, value };
            });
        });

    if (candidates.length === 0) {
        return fc.constant({ name: '', value: undefined });
    }

    return fc.constantFrom(...candidates);
}
