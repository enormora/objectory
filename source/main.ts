/* eslint-disable @stylistic/operator-linebreak, @stylistic/indent -- conflicts with dprint */
import { addValueAtPath, normalizePath, removePropertyAtPath, setValueAtPath } from './path-operations.ts';
import type { ElementsForOptions, LengthForOptions } from './array-lengths.ts';
import type { ArrayFactoryOptions, BuildListOptions, BuildOptions } from './factory-options.ts';
import {
    createOverrideWrapper,
    noOverrideMarker,
    normalizeOverride,
    type NormalizedOverride
} from './override-wrapper.ts';

import { createVariantSelector } from './union-variants.ts';
import { assertAllowedObjectShapeValue, assertObjectValueComesFromFactory } from './object-shape-values.ts';
import { deepFreeze } from './deep-freeze.ts';
import {
    assertOverrideMatchesArrayProperty,
    assertOverrideMatchesNestedFactory,
    childPath,
    joinPath,
    rootPath,
    type ValuePath
} from './override-values.ts';
import { arrayFactorySymbol, buildAtPathSymbol, factorySymbol } from './factory-symbols.ts';
import {
    assertOverrideContainsNoFactories,
    isAllowedOverrideValue,
    isArrayFactoryValue,
    isFactory
} from './factory-guards.ts';

type AnyOverridableShape = Readonly<Record<string, AllowedObjectShapeValues>>;

type AllKeys<Union> = Union extends unknown ? keyof Union : never;

type Forbid<Keys extends PropertyKey> = Readonly<Partial<Record<Keys, never>>>;

type UnionToIntersection<Union> = (Union extends unknown ? (argument: Union) => void : never) extends
    (argument: infer Intersection) => void ? Intersection : never;

type IsUnion<Candidate, Copy = Candidate> = Candidate extends unknown ? ([Copy] extends [Candidate] ? false : true)
    : never;

type OverridesForShape<Shape> = Shape extends AnyOverridableShape ? Overrides<ShapeToGeneratorReturnValue<Shape>>
    : never;

type DiscriminatingKeys<Default, Target> = {
    [Key in keyof Target]-?: Key extends keyof Default ? (Default[Key] extends Target[Key] ? never : Key) : never;
}[keyof Target];

type KeysToOverride<Default, Target> = Exclude<keyof Target, DiscriminatingKeys<Default, Target>>;

type VariantBranch<Union, Default, Target> =
    & Forbid<Exclude<AllKeys<Union>, keyof Target>>
    & OverridesForShape<Pick<Target, KeysToOverride<Default, Target>>>
    & Pick<Target, DiscriminatingKeys<Default, Target> & keyof Target>;

type SharedBranch<Union> =
    & Forbid<Exclude<AllKeys<Union>, keyof Union>>
    & UnionToIntersection<Union extends unknown ? OverridesForShape<Pick<Union, keyof Union>> : never>;

type VariantBranches<Union, Default, Members> = Members extends unknown ? VariantBranch<Union, Default, Members>
    : never;

type UnionOverride<Union, Default> = SharedBranch<Union> | VariantBranches<Union, Default, Union>;

type FactoryOverride<ObjectShape, Default> = true extends IsUnion<ObjectShape> ? UnionOverride<ObjectShape, Default>
    : Overrides<ShapeToGeneratorReturnValue<Extract<ObjectShape, AnyOverridableShape>>>;

function emptyOverrides<ObjectShape extends AnyOverridableShape, DefaultShape extends ObjectShape>(): FactoryOverride<
    ObjectShape,
    DefaultShape
> {
    const noOverrides: unknown = {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- an empty override fits every branch
    return noOverrides as FactoryOverride<ObjectShape, DefaultShape>;
}

type UseCreateUnionFactory = 'objectory: this shape is a union of object types, use createUnionFactory() instead';

type GeneratedShapeOrRejection<ObjectShape extends AnyOverridableShape> = true extends IsUnion<ObjectShape>
    ? UseCreateUnionFactory
    : ShapeToGeneratorReturnValue<ObjectShape>;

export type ArrayFactoryValue<
    ObjectShape extends Record<string, AllowedObjectShapeValues>,
    Length extends number = number
> = {
    readonly factory: {
        readonly build: (overrides?: never) => ObjectShape;
        readonly [factorySymbol]: true;
    };
    readonly length: Length;
    readonly [arrayFactorySymbol]: true;
};

type MaterializableArrayFactory = {
    readonly factory: ObjectoryFactory<Readonly<Record<string, AllowedObjectShapeValues>>>;
    readonly length: number;
    readonly [arrayFactorySymbol]: true;
};

export type ExtensionShape<
    BaseShape extends Record<string, AllowedObjectShapeValues>,
    ExtendedShape extends BaseShape
> = Partial<Pick<ExtendedShape, keyof BaseShape>> & Pick<ExtendedShape, Exclude<keyof ExtendedShape, keyof BaseShape>>;

type UseWithOverrides = 'objectory: this is the shape the factory already builds, use withOverrides() instead';

type ExtensionOrRejection<
    BaseShape extends Record<string, AllowedObjectShapeValues>,
    ExtendedShape extends BaseShape
> = [BaseShape] extends [ExtendedShape] ? UseWithOverrides
    : ShapeToGeneratorReturnValue<ExtensionShape<BaseShape, ExtendedShape>>;

export type Overrides<ObjectShape> = {
    readonly [P in keyof ObjectShape]?: OverridesHelper<ObjectShape[P]>;
};

type FactoryLike<Shape> = { readonly build: (...args: never) => Shape; readonly [factorySymbol]: true; };

type ShapeBuiltByFactory<T> = T extends FactoryLike<infer Shape> ? Shape : never;

export type OverridesHelper<T> = [ShapeBuiltByFactory<T>] extends [never]
    ? (T extends ArrayFactoryValue<infer U> ? readonly (Overrides<ShapeToGeneratorReturnValue<U>> | undefined)[]
        : T extends readonly (infer U)[] ? readonly (OverridesHelper<U> | undefined)[]
        : T)
    : Extract<T, null | undefined> | FactoryOverride<ShapeBuiltByFactory<T>, ShapeBuiltByFactory<T>>;

export type ObjectoryFactory<
    ObjectShape extends Record<string, AllowedObjectShapeValues>,
    DefaultShape extends ObjectShape = ObjectShape
> = {
    readonly build: (
        overrides?: FactoryOverride<ObjectShape, DefaultShape>,
        options?: BuildOptions
    ) => ObjectShape;
    readonly asArray: <const Options extends ArrayFactoryOptions = Readonly<Record<string, never>>>(
        options?: Options
    ) => ArrayFactoryValue<ObjectShape, LengthForOptions<Options>>;
    readonly withOverrides: (
        overrides: FactoryOverride<ObjectShape, DefaultShape>
    ) => ObjectoryFactory<ObjectShape, DefaultShape>;
    readonly extend: <ExtendedObjectShape extends ObjectShape>(
        extensionGenerator: () => ExtensionOrRejection<ObjectShape, ExtendedObjectShape>
    ) => ObjectoryFactory<ExtendedObjectShape>;
    readonly buildList: <const Options extends BuildListOptions = Readonly<Record<string, never>>>(
        options?: Options
    ) => ElementsForOptions<ObjectShape, Options>;
    readonly buildInvalidWithout: (path: string) => unknown;
    readonly buildInvalidWithChanged: (path: string, value: unknown) => unknown;
    readonly buildInvalidWithAdditional: (path: string, value: unknown) => unknown;
    readonly [buildAtPathSymbol]: (
        overrides: FactoryOverride<ObjectShape, DefaultShape>,
        pathPrefix: string
    ) => ObjectShape;
    readonly [factorySymbol]: true;
};

type ArrayItemToGeneratorReturnValue<ItemShape> = [ItemShape] extends [Record<string, AllowedObjectShapeValues>]
    ? ArrayFactoryValue<Extract<ItemShape, Record<string, AllowedObjectShapeValues>>>
    : readonly ShapeToGeneratorReturnValueHelper<ItemShape>[];

type TupleToGeneratorReturnValue<TupleShape> = {
    readonly [Index in keyof TupleShape]: ShapeToGeneratorReturnValueHelper<TupleShape[Index]>;
};

type TupleArrayFactory<TupleShape extends { readonly length: number; }> = TupleShape extends
    readonly (infer ItemShape)[]
    ? ([ItemShape] extends [Record<string, AllowedObjectShapeValues>]
        ? ArrayFactoryValue<Extract<ItemShape, Record<string, AllowedObjectShapeValues>>, TupleShape['length']>
        : never)
    : never;

type ShapePart<T> = Exclude<T, null | undefined>;

type WholeShapeFactory<T> = [ShapePart<T>] extends [readonly unknown[]] ? never
    : [ShapePart<T>] extends [Record<string, AllowedObjectShapeValues>]
        ? Extract<T, null | undefined> | ObjectoryFactory<ShapePart<T>>
    : never;

type NonObjectGeneratorValue<T> = T extends Record<string, AllowedObjectShapeValues> ? never
    : DistributedShapeToGeneratorReturnValue<T>;

type DistributedShapeToGeneratorReturnValue<T> = T extends readonly (infer ItemShape)[]
    ? number extends T['length']
        ? ArrayItemToGeneratorReturnValue<ItemShape> | readonly ShapeToGeneratorReturnValueHelper<ItemShape>[]
    : TupleArrayFactory<T> | TupleToGeneratorReturnValue<T>
    : T extends Record<string, AllowedObjectShapeValues> ? ObjectoryFactory<T>
    : T;

export type ShapeToGeneratorReturnValueHelper<T> =
    | DistributedShapeToGeneratorReturnValue<T>
    | WholeShapeFactory<T>;

type PropertyGeneratorValue<Value> = true extends IsUnion<ShapePart<Value>>
    ? NonObjectGeneratorValue<Value> | WholeShapeFactory<Value>
    : ShapeToGeneratorReturnValueHelper<Value>;

export type ShapeToGeneratorReturnValue<T extends Record<string, AllowedObjectShapeValues>> = {
    readonly [P in keyof T]: PropertyGeneratorValue<T[P]>;
};

type GeneratedObjectToShape<T> = {
    readonly [P in keyof T]: GeneratedObjectToShapeHelper<T[P]>;
};

type GeneratedObjectToShapeHelper<T> = T extends ObjectoryFactory<infer U> ? U
    : T extends ArrayFactoryValue<infer U> ? readonly GeneratedArrayItemShape<U>[]
    : T extends readonly (infer U)[] ? readonly GeneratedObjectToShapeHelper<U>[]
    : T;

type GeneratedArrayItemShape<ObjectShape extends Record<string, AllowedObjectShapeValues>> = GeneratedObjectToShape<
    ShapeToGeneratorReturnValue<ObjectShape>
>;

export type GeneratorFunction<ObjectShape extends Record<string, AllowedObjectShapeValues>> = () =>
    ShapeToGeneratorReturnValue<ObjectShape>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ok in this case
export type AnyFunction = (...args: readonly any[]) => unknown;

export type BaseTypes = AnyFunction | Date | bigint | boolean | number | string | symbol | null | undefined;

export type AllowedObjectShapeValues =
    | BaseTypes
    | readonly AllowedObjectShapeValues[]
    | { readonly [key: string]: AllowedObjectShapeValues; };

type ObjectShapeValueOf<Value> = Value extends BaseTypes ? Value : ObjectShapeOf<Value>;

export type ObjectShapeOf<Shape> = Shape extends BaseTypes ? never : {
    [Key in keyof Shape]: ObjectShapeValueOf<Shape[Key]>;
};

export type AllowedGeneratorReturnShape =
    | ArrayFactoryValue<Record<string, AllowedObjectShapeValues>>
    | BaseTypes
    | ObjectoryFactory<Record<string, AllowedObjectShapeValues>>
    | readonly AllowedGeneratorReturnShape[];

function toNestedOverride(override: unknown): FactoryOverride<AnyOverridableShape, AnyOverridableShape> {
    return (override ?? {}) as FactoryOverride<AnyOverridableShape, AnyOverridableShape>;
}

function toNestedFactory(value: unknown): ObjectoryFactory<AnyOverridableShape> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- isFactory checked the marker
    return value as ObjectoryFactory<AnyOverridableShape>;
}

function toArrayFactory(value: unknown): MaterializableArrayFactory {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- isArrayFactoryValue checked the marker
    return value as MaterializableArrayFactory;
}

function toExtensionValues(extensionGenerated: unknown): Readonly<Record<string, unknown>> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the rejected extension is a type-level marker only
    return extensionGenerated as Readonly<Record<string, unknown>>;
}

function materializeArrayFactoryValue(
    arrayFactory: MaterializableArrayFactory,
    override: unknown,
    path: ValuePath
): unknown {
    const overrideArray: readonly unknown[] | undefined = Array.isArray(override) ? override : undefined;
    const length = overrideArray?.length ?? arrayFactory.length;

    return Array.from({ length }, function (_unused, index) {
        const itemOverride = overrideArray?.[index];
        const itemPath = joinPath(path.fromRoot, index.toString());

        if (itemOverride !== undefined) {
            assertOverrideMatchesNestedFactory(itemOverride, itemPath);
        }

        if (!isAllowedOverrideValue(itemOverride)) {
            throw new TypeError('Invalid override value provided for array factory item');
        }
        return arrayFactory.factory[buildAtPathSymbol](toNestedOverride(itemOverride), itemPath);
    });
}

function buildFactoryValue(
    factory: ObjectoryFactory<Record<string, AllowedObjectShapeValues>>,
    override: unknown,
    pathPrefix: string
): unknown {
    if (isAllowedOverrideValue(override)) {
        return factory[buildAtPathSymbol](toNestedOverride(override), pathPrefix);
    }

    throw new TypeError('Invalid override value provided for nested factory');
}

type TemplateItemResolver = (
    value: unknown,
    overrideValue: unknown,
    path: ValuePath
) => unknown;

function materializeTemplateArray(
    template: readonly unknown[],
    override: unknown,
    resolve: TemplateItemResolver,
    path: ValuePath
): unknown {
    if (Array.isArray(override)) {
        return override.map(function (item, index) {
            const templateItem = template[index];

            if (templateItem !== undefined) {
                return resolve(templateItem, item, childPath(path, index.toString()));
            }

            return assertAllowedObjectShapeValue(item);
        });
    }

    return template.map(function (item, index) {
        return resolve(item, undefined, childPath(path, index.toString()));
    });
}

function withMaterializedOverride(
    override: NormalizedOverride,
    materialize: (overrideValue: unknown) => unknown
): unknown {
    if (!override.applied) {
        return materialize(undefined);
    }

    if (override.value === undefined) {
        return undefined;
    }

    return materialize(override.value);
}

function materializeFactoryWithOverride(
    value: ObjectoryFactory<Record<string, AllowedObjectShapeValues>>,
    override: NormalizedOverride,
    path: ValuePath
): unknown {
    return withMaterializedOverride(override, function (resolved) {
        if (resolved !== undefined) {
            assertOverrideMatchesNestedFactory(resolved, path.fromRoot);
        }

        return buildFactoryValue(value, resolved, path.fromRoot);
    });
}

function materializeArrayFactoryWithOverride(
    value: MaterializableArrayFactory,
    override: NormalizedOverride,
    path: ValuePath
): unknown {
    return withMaterializedOverride(override, function (resolved) {
        if (resolved !== undefined) {
            assertOverrideMatchesArrayProperty(resolved, path.fromRoot);
        }

        return materializeArrayFactoryValue(value, resolved, path);
    });
}

function materializeTemplateWithOverride(
    value: readonly unknown[],
    override: NormalizedOverride,
    resolve: TemplateItemResolver,
    path: ValuePath
): unknown {
    return withMaterializedOverride(override, function (resolved) {
        if (resolved !== undefined) {
            assertOverrideMatchesArrayProperty(resolved, path.fromRoot);
        }

        return materializeTemplateArray(value, resolved, resolve, path);
    });
}

function materializeLeafValue(
    value: unknown,
    override: NormalizedOverride
): unknown {
    if (override.applied) {
        return assertAllowedObjectShapeValue(override.value);
    }

    return assertAllowedObjectShapeValue(value);
}

function materializeValue(
    value: unknown,
    override: unknown,
    path: ValuePath
): unknown {
    const normalizedOverride = normalizeOverride(override);

    if (isFactory(value)) {
        return materializeFactoryWithOverride(toNestedFactory(value), normalizedOverride, path);
    }

    if (isArrayFactoryValue(value)) {
        return materializeArrayFactoryWithOverride(toArrayFactory(value), normalizedOverride, path);
    }

    if (Array.isArray(value)) {
        return materializeTemplateWithOverride(value, normalizedOverride, materializeValue, path);
    }

    assertObjectValueComesFromFactory(value, path.withinFactory);

    return materializeLeafValue(value, normalizedOverride);
}

function applyOverrides<GeneratedObject extends Readonly<Record<string, unknown>>>(
    generatedObject: GeneratedObject,
    overrides: Overrides<GeneratedObject>,
    pathPrefix: string
): GeneratedObjectToShape<GeneratedObject> {
    const keys = new Set<keyof GeneratedObject>([
        ...(Object.keys(generatedObject) as (keyof GeneratedObject)[]),
        ...(Object.keys(overrides) as (keyof GeneratedObject)[])
    ]);

    const entries: [keyof GeneratedObject, GeneratedObjectToShapeHelper<GeneratedObject[keyof GeneratedObject]>][] = [];

    for (const key of keys) {
        const value = generatedObject[key];
        const path = rootPath(pathPrefix, String(key));
        const hasOverride = Object.hasOwn(overrides, key);
        const overrideValue = hasOverride
            ? createOverrideWrapper(assertOverrideContainsNoFactories(overrides[key], path.fromRoot))
            : noOverrideMarker;
        const materialized = materializeValue(value, overrideValue, path);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
        entries.push([ key, materialized as GeneratedObjectToShapeHelper<GeneratedObject[typeof key]> ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
    return Object.fromEntries(entries) as GeneratedObjectToShape<GeneratedObject>;
}

type OverrideRecord = Readonly<Record<string, unknown>>;

function mergeOverrides(base: OverrideRecord, extension: OverrideRecord): OverrideRecord {
    return { ...base, ...extension };
}

function createArrayFactory<
    ObjectShape extends Record<string, AllowedObjectShapeValues>,
    Options extends ArrayFactoryOptions
>(factory: ObjectoryFactory<ObjectShape>, options?: Options): ArrayFactoryValue<
    ObjectShape,
    LengthForOptions<Options>
> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the length is the literal the options carry
    const length = (options?.length ?? 0) as LengthForOptions<Options>;

    return {
        factory,
        length,
        [arrayFactorySymbol]: true
    };
}

type BuildShape<ObjectShape extends Record<string, AllowedObjectShapeValues>> = (
    overrides: OverrideRecord,
    pathPrefix: string
) => ObjectShape;

function applyGenerator<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>,
    overrides: OverrideRecord,
    pathPrefix: string
): ObjectShape {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- an override is a plain record
    const generatedOverrides = overrides as Overrides<ShapeToGeneratorReturnValue<ObjectShape>>;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
    return applyOverrides(generatorFunction(), generatedOverrides, pathPrefix) as ObjectShape;
}

function instantiateFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>,
    defaultOverrides: OverrideRecord,
    materializeShape: BuildShape<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    const factory: ObjectoryFactory<ObjectShape> = {
        build(overrides, options) {
            const built = factory[buildAtPathSymbol](overrides ?? emptyOverrides(), '');

            return options?.freeze === true ? deepFreeze(built) : built;
        },
        [buildAtPathSymbol](overrides, pathPrefix) {
            return materializeShape(mergeOverrides(defaultOverrides, overrides as OverrideRecord), pathPrefix);
        },
        asArray(options) {
            return createArrayFactory(factory, options);
        },
        withOverrides(overrides) {
            const merged = mergeOverrides(defaultOverrides, overrides as OverrideRecord);

            return instantiateFactory(generatorFunction, merged, materializeShape);
        },
        extend<ExtendedObjectShape extends ObjectShape>(
            extensionGenerator: () => ExtensionOrRejection<ObjectShape, ExtendedObjectShape>
        ) {
            const extendedGeneratorFunction = function (): ShapeToGeneratorReturnValue<ExtendedObjectShape> {
                const baseGenerated = generatorFunction();
                const extensionGenerated = toExtensionValues(extensionGenerator());
                const mergedGenerated: Readonly<Record<string, unknown>> = {
                    ...baseGenerated,
                    ...extensionGenerated
                };

                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
                return mergedGenerated as ShapeToGeneratorReturnValue<ExtendedObjectShape>;
            };

            return instantiateFactory(
                extendedGeneratorFunction,
                defaultOverrides,
                function materializeExtendedShape(overrides, pathPrefix) {
                    return applyGenerator(extendedGeneratorFunction, overrides, pathPrefix);
                }
            );
        },
        buildList<const Options extends BuildListOptions = Readonly<Record<string, never>>>(options?: Options) {
            const length = options?.length ?? 0;
            const shouldFreeze = options?.freeze === true;
            const elements = Array.from({ length }, function () {
                return factory.build(undefined, { freeze: shouldFreeze });
            });
            const list = shouldFreeze ? deepFreeze(elements) : elements;

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the tuple length is the options literal
            return list as ElementsForOptions<ObjectShape, Options>;
        },
        buildInvalidWithout(path) {
            const pathSegments = normalizePath(path);
            const baseObject = factory.build();

            return removePropertyAtPath(baseObject, pathSegments);
        },
        buildInvalidWithChanged(path, newValue) {
            const pathSegments = normalizePath(path);
            const baseObject = factory.build();

            return setValueAtPath(baseObject, pathSegments, newValue);
        },
        buildInvalidWithAdditional(path, additionalValue) {
            const pathSegments = normalizePath(path);
            const baseObject = factory.build();

            return addValueAtPath(baseObject, pathSegments, additionalValue);
        },
        [factorySymbol]: true
    };

    return factory;
}

export function createFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: () => GeneratedShapeOrRejection<ObjectShape>
): ObjectoryFactory<ObjectShape>;
export function createFactory<ObjectShape>(
    generatorFunction: () => GeneratedShapeOrRejection<ObjectShapeOf<ObjectShape>>
): ObjectoryFactory<ObjectShapeOf<ObjectShape>>;
export function createFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    return instantiateFactory(
        generatorFunction,
        {},
        function materializeGeneratedShape(overrides, pathPrefix) {
            return applyGenerator(generatorFunction, overrides, pathPrefix);
        }
    );
}

type AnyObjectoryFactory = ObjectoryFactory<Readonly<Record<string, AllowedObjectShapeValues>>>;

export type VariantList = readonly [AnyObjectoryFactory, ...AnyObjectoryFactory[]];

type ShapeBuiltBy<Variant> = Variant extends ObjectoryFactory<infer Shape> ? Shape : never;

export type CoveredShape<Variants extends VariantList> = ShapeBuiltBy<Variants[number]>;

export type DefaultVariantShape<Variants extends VariantList> = ShapeBuiltBy<Variants[0]>;

export function createUnionFactory<const Variants extends VariantList>(
    variants: Variants
): ObjectoryFactory<CoveredShape<Variants>, CoveredShape<Variants> & DefaultVariantShape<Variants>> {
    const selectVariant = createVariantSelector(variants, function variantDefaults(variant) {
        return variant.build();
    });

    function materializeSelectedVariant(
        overrides: Readonly<Record<string, unknown>>,
        pathPrefix: string
    ): CoveredShape<Variants> {
        const variant = selectVariant(overrides);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the selected variant builds a member of the union
        return variant[buildAtPathSymbol](overrides as never, pathPrefix) as CoveredShape<Variants>;
    }

    function unsupportedGenerator(): never {
        throw new TypeError('A union factory builds through its variants, so it has no generator of its own');
    }

    return instantiateFactory(unsupportedGenerator, {}, materializeSelectedVariant);
}
