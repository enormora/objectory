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
import { emptyOverrides, type FactoryOverride, type GeneratedShapeOrRejection } from './union-overrides.ts';
import {
    createVariantSelector,
    type CoveredShape,
    type DefaultVariantShape,
    type VariantList
} from './union-variants.ts';
import {
    assertAllowedObjectShapeValue,
    assertObjectValueComesFromFactory,
    isAllowedObjectShapeValue
} from './object-shape-values.ts';
import { deepFreeze } from './deep-freeze.ts';
import { assertOverrideMatchesArrayProperty, assertOverrideMatchesNestedFactory } from './override-values.ts';
import { isRecord } from './record.ts';

const arrayFactorySymbol: unique symbol = Symbol('objectory.arrayFactory');
const factorySymbol: unique symbol = Symbol('objectory.factory');
const buildAtPathSymbol: unique symbol = Symbol('objectory.buildAtPath');
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

export type Overrides<ObjectShape> = {
    readonly [P in keyof ObjectShape]?: OverridesHelper<ObjectShape[P]>;
};

export type OverridesHelper<T> = T extends ObjectoryFactory<infer U, infer D> ? FactoryOverride<U, D>
    : T extends ArrayFactoryValue<infer U> ? readonly (Overrides<ShapeToGeneratorReturnValue<U>> | undefined)[]
    : T extends readonly (infer U)[] ? readonly (OverridesHelper<U> | undefined)[]
    : T;

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
        extensionGenerator: () => ShapeToGeneratorReturnValue<ExtensionShape<ObjectShape, ExtendedObjectShape>>
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

type WholeShapeFactory<T> = [T] extends [readonly unknown[]] ? never
    : [T] extends [Record<string, AllowedObjectShapeValues>] ? ObjectoryFactory<T>
    : never;

type DistributedShapeToGeneratorReturnValue<T> = T extends readonly (infer ItemShape)[]
    ? number extends T['length']
        ? ArrayItemToGeneratorReturnValue<ItemShape> | readonly ShapeToGeneratorReturnValueHelper<ItemShape>[]
    : TupleArrayFactory<T> | TupleToGeneratorReturnValue<T>
    : T extends Record<string, AllowedObjectShapeValues> ? ObjectoryFactory<T>
    : T;

export type ShapeToGeneratorReturnValueHelper<T> =
    | DistributedShapeToGeneratorReturnValue<T>
    | WholeShapeFactory<T>;

export type ShapeToGeneratorReturnValue<T extends Record<string, AllowedObjectShapeValues>> = {
    readonly [P in keyof T]: ShapeToGeneratorReturnValueHelper<T[P]>;
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

function isFactory<T extends Record<string, AllowedObjectShapeValues>>(value: unknown): value is ObjectoryFactory<T> {
    return isRecord(value) && value[factorySymbol] === true;
}

function isArrayFactoryValue(value: unknown): value is MaterializableArrayFactory {
    if (!isRecord(value)) {
        return false;
    }

    if (value[arrayFactorySymbol] !== true) {
        return false;
    }

    return isFactory(value.factory) && typeof value.length === 'number';
}

function assertOverrideValueIsNotAFactory(value: unknown, path: string): void {
    if (isFactory(value) || isArrayFactoryValue(value)) {
        throw new TypeError(
            `Invalid override at "${path}": factories cannot be used as override values, use build() or buildList()`
        );
    }
}

function assertOverrideContainsNoFactories(value: unknown, path: string): unknown {
    assertOverrideValueIsNotAFactory(value, path);

    if (Array.isArray(value)) {
        for (const [ index, item ] of value.entries()) {
            assertOverrideContainsNoFactories(item, `${path}.${index}`);
        }
    }

    if (isRecord(value)) {
        for (const [ key, child ] of Object.entries(value)) {
            assertOverrideContainsNoFactories(child, `${path}.${key}`);
        }
    }

    return value;
}

function isAllowedOverrideValue(value: unknown): boolean {
    if (value === undefined) {
        return true;
    }

    if (Array.isArray(value)) {
        return value.every(isAllowedOverrideValue);
    }

    if (isRecord(value)) {
        return Object.values(value).every(isAllowedOverrideValue);
    }

    return isAllowedObjectShapeValue(value);
}

function isOverridesForFactory<F extends ObjectoryFactory<Record<string, AllowedObjectShapeValues>>>(
    _factory: F,
    override: unknown
): override is Parameters<F['build']>[0] {
    return override === undefined || isAllowedOverrideValue(override);
}

function joinPath(pathPrefix: string, segment: string): string {
    return pathPrefix === '' ? segment : `${pathPrefix}.${segment}`;
}

type ValuePath = {
    readonly withinFactory: string;
    readonly fromRoot: string;
};

function childPath(parent: ValuePath, segment: string): ValuePath {
    return {
        withinFactory: joinPath(parent.withinFactory, segment),
        fromRoot: joinPath(parent.fromRoot, segment)
    };
}

function materializeArrayFactoryValue(
    arrayFactory: MaterializableArrayFactory,
    override: unknown,
    path: ValuePath
): AllowedObjectShapeValues {
    const overrideArray: readonly unknown[] | undefined = Array.isArray(override) ? override : undefined;
    const length = overrideArray?.length ?? arrayFactory.length;

    return Array.from({ length }, function (_unused, index) {
        const itemOverride = overrideArray?.[index];
        const itemPath = joinPath(path.fromRoot, index.toString());

        if (itemOverride !== undefined) {
            assertOverrideMatchesNestedFactory(itemOverride, itemPath);
        }

        if (!isOverridesForFactory(arrayFactory.factory, itemOverride)) {
            throw new TypeError('Invalid override value provided for array factory item');
        }

        if (itemOverride === undefined) {
            return arrayFactory.factory[buildAtPathSymbol]({}, itemPath);
        }

        return arrayFactory.factory[buildAtPathSymbol](itemOverride, itemPath);
    });
}

function buildFactoryValue(
    factory: ObjectoryFactory<Record<string, AllowedObjectShapeValues>>,
    override: unknown,
    pathPrefix: string
): AllowedObjectShapeValues {
    if (isOverridesForFactory(factory, override)) {
        if (override === undefined) {
            return factory[buildAtPathSymbol]({}, pathPrefix);
        }

        return factory[buildAtPathSymbol](override, pathPrefix);
    }

    throw new TypeError('Invalid override value provided for nested factory');
}

type TemplateItemResolver = (
    value: unknown,
    overrideValue: unknown,
    path: ValuePath
) => AllowedObjectShapeValues;

function materializeTemplateArray(
    template: readonly unknown[],
    override: unknown,
    resolve: TemplateItemResolver,
    path: ValuePath
): AllowedObjectShapeValues {
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
    materialize: (overrideValue: unknown) => AllowedObjectShapeValues
): AllowedObjectShapeValues {
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
): AllowedObjectShapeValues {
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
): AllowedObjectShapeValues {
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
): AllowedObjectShapeValues {
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
): AllowedObjectShapeValues {
    if (override.applied) {
        return assertAllowedObjectShapeValue(override.value);
    }

    return assertAllowedObjectShapeValue(value);
}

function materializeValue(
    value: unknown,
    override: unknown,
    path: ValuePath
): AllowedObjectShapeValues {
    const normalizedOverride = normalizeOverride(override);

    if (isFactory(value)) {
        return materializeFactoryWithOverride(value, normalizedOverride, path);
    }

    if (isArrayFactoryValue(value)) {
        return materializeArrayFactoryWithOverride(value, normalizedOverride, path);
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
        const path: ValuePath = {
            withinFactory: String(key),
            fromRoot: joinPath(pathPrefix, String(key))
        };
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

function mergeOverrides<GeneratedObject>(
    base: Overrides<GeneratedObject>,
    extension: Overrides<GeneratedObject>
): Overrides<GeneratedObject> {
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
    overrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>,
    pathPrefix: string
) => ObjectShape;

function applyGenerator<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>,
    overrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>,
    pathPrefix: string
): ObjectShape {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
    return applyOverrides(generatorFunction(), overrides, pathPrefix) as ObjectShape;
}

function instantiateFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>,
    defaultOverrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>,
    materializeShape: BuildShape<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    const factory: ObjectoryFactory<ObjectShape> = {
        build(overrides, options) {
            const built = factory[buildAtPathSymbol](overrides ?? emptyOverrides<ObjectShape, ObjectShape>(), '');

            return options?.freeze === true ? deepFreeze(built) : built;
        },
        [buildAtPathSymbol](overrides, pathPrefix) {
            const mergedOverrides = mergeOverrides(defaultOverrides, overrides);

            return materializeShape(mergedOverrides, pathPrefix);
        },
        asArray(options) {
            return createArrayFactory(factory, options);
        },
        withOverrides(overrides) {
            const mergedOverrides = mergeOverrides(defaultOverrides, overrides);

            return instantiateFactory(generatorFunction, mergedOverrides, materializeShape);
        },
        extend<ExtendedObjectShape extends ObjectShape>(
            extensionGenerator: () => ShapeToGeneratorReturnValue<ExtensionShape<ObjectShape, ExtendedObjectShape>>
        ) {
            const extendedGeneratorFunction = function (): ShapeToGeneratorReturnValue<ExtendedObjectShape> {
                const baseGenerated = generatorFunction();
                const extensionGenerated = extensionGenerator();
                const mergedGenerated: Readonly<Record<string, unknown>> = {
                    ...baseGenerated,
                    ...extensionGenerated
                };

                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
                return mergedGenerated as ShapeToGeneratorReturnValue<ExtendedObjectShape>;
            };

            const extendedDefaultOverrides =
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- default overrides remain compatible when extending
                defaultOverrides as Overrides<ShapeToGeneratorReturnValue<ExtendedObjectShape>>;

            return instantiateFactory(
                extendedGeneratorFunction,
                extendedDefaultOverrides,
                function materializeExtendedShape(overrides, pathPrefix) {
                    return applyGenerator(extendedGeneratorFunction, overrides, pathPrefix);
                }
            );
        },
        buildList<const Options extends BuildListOptions = Readonly<Record<string, never>>>(options?: Options) {
            const length = options?.length ?? 0;
            const shouldFreeze = options?.freeze === true;
            const elements = Array.from({ length }, function () {
                return factory.build(emptyOverrides<ObjectShape, ObjectShape>(), { freeze: shouldFreeze });
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
        emptyOverrides(),
        function materializeGeneratedShape(overrides, pathPrefix) {
            return applyGenerator(generatorFunction, overrides, pathPrefix);
        }
    );
}

export function createUnionFactory<const Variants extends VariantList>(
    variants: Variants
): ObjectoryFactory<CoveredShape<Variants>, CoveredShape<Variants> & DefaultVariantShape<Variants>> {
    const selectVariant = createVariantSelector(variants, function variantDefaults(variant) {
        return variant.build();
    });

    function materializeSelectedVariant(
        overrides: Overrides<ShapeToGeneratorReturnValue<CoveredShape<Variants>>>,
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
