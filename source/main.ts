/* eslint-disable @stylistic/operator-linebreak, @stylistic/indent -- conflicts with dprint */
import { addValueAtPath, normalizePath, removePropertyAtPath, setValueAtPath } from './path-operations.ts';
import type { ElementsForOptions, LengthForOptions } from './array-lengths.ts';
import { deepFreeze } from './deep-freeze.ts';
import { assertOverrideMatchesArrayProperty, assertOverrideMatchesNestedFactory } from './override-values.ts';
import { isRecord } from './record.ts';

const arrayFactorySymbol: unique symbol = Symbol('objectory.arrayFactory');
const factorySymbol: unique symbol = Symbol('objectory.factory');
const noOverrideSymbol: unique symbol = Symbol('objectory.noOverride');
const overrideWrapperSymbol: unique symbol = Symbol('objectory.overrideWrapper');
const buildAtPathSymbol: unique symbol = Symbol('objectory.buildAtPath');
const primitiveAllowedTypes = new Set([ 'string', 'number', 'boolean', 'bigint', 'symbol', 'function' ]);

export type ArrayFactoryOptions = {
    readonly length?: number;
};

export type BuildOptions = {
    readonly freeze?: boolean;
};

export type BuildListOptions = ArrayFactoryOptions & BuildOptions;

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

export type Overrides<ObjectShape extends Record<string, AllowedGeneratorReturnShape>> = {
    readonly [P in keyof ObjectShape]?: OverridesHelper<ObjectShape[P]>;
};

export type OverridesHelper<T> = T extends ObjectoryFactory<infer U> ? Overrides<ShapeToGeneratorReturnValue<U>>
    : T extends ArrayFactoryValue<infer U> ? readonly (Overrides<ShapeToGeneratorReturnValue<U>> | undefined)[]
    : T extends readonly (infer U)[] ? readonly (OverridesHelper<U> | undefined)[]
    : T;

export type ObjectoryFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>> = {
    readonly build: (
        overrides?: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>,
        options?: BuildOptions
    ) => ObjectShape;
    readonly asArray: <const Options extends ArrayFactoryOptions = Readonly<Record<string, never>>>(
        options?: Options
    ) => ArrayFactoryValue<ObjectShape, LengthForOptions<Options>>;
    readonly withOverrides: (
        overrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>
    ) => ObjectoryFactory<ObjectShape>;
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
        overrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>,
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

export type ShapeToGeneratorReturnValueHelper<T> = T extends readonly (infer ItemShape)[]
    ? number extends T['length']
        ? ArrayItemToGeneratorReturnValue<ItemShape> | readonly ShapeToGeneratorReturnValueHelper<ItemShape>[]
    : TupleArrayFactory<T> | TupleToGeneratorReturnValue<T>
    : T extends Record<string, AllowedObjectShapeValues> ? ObjectoryFactory<T>
    : T;

export type ShapeToGeneratorReturnValue<T extends Record<string, AllowedObjectShapeValues>> = {
    readonly [P in keyof T]: ShapeToGeneratorReturnValueHelper<T[P]>;
};

type GeneratedObjectToShape<T extends Record<string, AllowedGeneratorReturnShape>> = {
    readonly [P in keyof T]: GeneratedObjectToShapeHelper<T[P]>;
};

type GeneratedObjectToShapeHelper<T> = T extends ObjectoryFactory<infer U> ? U
    : T extends ArrayFactoryValue<infer U> ? readonly GeneratedArrayItemShape<U>[]
    : T extends readonly (infer U)[] ? readonly GeneratedObjectToShapeHelper<U>[]
    : T;

type GeneratedArrayItemShape<ObjectShape extends Record<string, AllowedObjectShapeValues>> = GeneratedObjectToShape<
    ShapeToGeneratorReturnValue<ObjectShape>
>;

type OverrideWrapper = { readonly value: unknown; readonly [overrideWrapperSymbol]: true; };

type NormalizedOverride = { readonly applied: false; } | { readonly applied: true; readonly value: unknown; };

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

function isPrimitiveAllowedObjectShapeValue(value: unknown): boolean {
    if (value === null || value === undefined) {
        return true;
    }

    if (value instanceof Date) {
        return true;
    }

    return primitiveAllowedTypes.has(typeof value);
}

function isAllowedObjectShapeValue(value: unknown): value is AllowedObjectShapeValues {
    if (isPrimitiveAllowedObjectShapeValue(value)) {
        return true;
    }

    if (Array.isArray(value)) {
        return value.every(isAllowedObjectShapeValue);
    }

    if (isRecord(value)) {
        return Object.values(value).every(isAllowedObjectShapeValue);
    }

    return false;
}

function assertObjectValueComesFromFactory(value: unknown, path: string): void {
    if (!isPrimitiveAllowedObjectShapeValue(value)) {
        throw new TypeError(
            `Invalid value at "${path}": use createFactory() for nested objects and asArray() for arrays of objects`
        );
    }
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

function assertAllowedObjectShapeValue(value: unknown): AllowedObjectShapeValues {
    if (!isAllowedObjectShapeValue(value)) {
        throw new TypeError('Invalid value provided for objectory factory');
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

function createOverrideWrapper(value: unknown): OverrideWrapper {
    return {
        value,
        [overrideWrapperSymbol]: true
    };
}

function isOverrideWrapper(value: unknown): value is OverrideWrapper {
    return isRecord(value) && value[overrideWrapperSymbol] === true;
}

function isNoOverride(override: unknown): override is typeof noOverrideSymbol {
    return override === noOverrideSymbol;
}

function normalizeOverride(override: unknown): NormalizedOverride {
    if (override === undefined) {
        return { applied: false };
    }

    if (isNoOverride(override)) {
        return { applied: false };
    }

    if (isOverrideWrapper(override)) {
        return { applied: true, value: override.value };
    }

    return { applied: true, value: override };
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
    value: AllowedGeneratorReturnShape,
    overrideValue: unknown,
    path: ValuePath
) => AllowedObjectShapeValues;

function materializeTemplateArray(
    template: readonly AllowedGeneratorReturnShape[],
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
    value: readonly AllowedGeneratorReturnShape[],
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
    value: AllowedGeneratorReturnShape,
    override: NormalizedOverride
): AllowedObjectShapeValues {
    if (override.applied) {
        return assertAllowedObjectShapeValue(override.value);
    }

    return assertAllowedObjectShapeValue(value);
}

function materializeValue(
    value: AllowedGeneratorReturnShape,
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

function applyOverrides<GeneratedObject extends Record<string, AllowedGeneratorReturnShape>>(
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
            : noOverrideSymbol;
        const materialized = materializeValue(value, overrideValue, path);

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
        entries.push([ key, materialized as GeneratedObjectToShapeHelper<GeneratedObject[typeof key]> ]);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
    return Object.fromEntries(entries) as GeneratedObjectToShape<GeneratedObject>;
}

function mergeOverrides<GeneratedObject extends Record<string, AllowedGeneratorReturnShape>>(
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

function instantiateFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>,
    defaultOverrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>
): ObjectoryFactory<ObjectShape> {
    const factory: ObjectoryFactory<ObjectShape> = {
        build(overrides, options) {
            const built = factory[buildAtPathSymbol](overrides ?? {}, '');

            return options?.freeze === true ? deepFreeze(built) : built;
        },
        [buildAtPathSymbol](overrides, pathPrefix) {
            const generatedObject = generatorFunction();
            const mergedOverrides = mergeOverrides(defaultOverrides, overrides);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
            return applyOverrides(generatedObject, mergedOverrides, pathPrefix) as ObjectShape;
        },
        asArray(options) {
            return createArrayFactory(factory, options);
        },
        withOverrides(overrides) {
            const mergedOverrides = mergeOverrides(defaultOverrides, overrides);

            return instantiateFactory(generatorFunction, mergedOverrides);
        },
        extend<ExtendedObjectShape extends ObjectShape>(
            extensionGenerator: () => ShapeToGeneratorReturnValue<ExtensionShape<ObjectShape, ExtendedObjectShape>>
        ) {
            const extendedGeneratorFunction = function (): ShapeToGeneratorReturnValue<ExtendedObjectShape> {
                const baseGenerated = generatorFunction();
                const extensionGenerated = extensionGenerator();
                const mergedGenerated: Record<string, AllowedGeneratorReturnShape> = {
                    ...baseGenerated,
                    ...extensionGenerated
                };

                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
                return mergedGenerated as ShapeToGeneratorReturnValue<ExtendedObjectShape>;
            };

            const extendedDefaultOverrides =
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- default overrides remain compatible when extending
                defaultOverrides as Overrides<ShapeToGeneratorReturnValue<ExtendedObjectShape>>;

            return instantiateFactory(extendedGeneratorFunction, extendedDefaultOverrides);
        },
        buildList<const Options extends BuildListOptions = Readonly<Record<string, never>>>(options?: Options) {
            const length = options?.length ?? 0;
            const shouldFreeze = options?.freeze === true;
            const elements = Array.from({ length }, function () {
                return factory.build({}, { freeze: shouldFreeze });
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
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape>;
export function createFactory<ObjectShape>(
    generatorFunction: GeneratorFunction<ObjectShapeOf<ObjectShape>>
): ObjectoryFactory<ObjectShapeOf<ObjectShape>>;
export function createFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    return instantiateFactory(generatorFunction, {});
}
