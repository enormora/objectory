/* eslint-disable @stylistic/operator-linebreak, @stylistic/indent -- conflicts with dprint */
import { addValueAtPath, normalizePath, removePropertyAtPath, setValueAtPath } from './path-operations.ts';
import { isRecord } from './record.ts';

const arrayFactorySymbol: unique symbol = Symbol('objectory.arrayFactory');
const factorySymbol: unique symbol = Symbol('objectory.factory');
const noOverrideSymbol: unique symbol = Symbol('objectory.noOverride');
const overrideWrapperSymbol: unique symbol = Symbol('objectory.overrideWrapper');
const primitiveAllowedTypes = new Set([ 'string', 'number', 'boolean', 'bigint', 'symbol', 'function' ]);

export type ArrayFactoryOptions = {
    readonly length?: number;
};

export type ArrayFactoryValue<ObjectShape extends Record<string, AllowedObjectShapeValues>> = {
    readonly factory: ObjectoryFactory<ObjectShape>;
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
    readonly build: (overrides?: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>) => ObjectShape;
    readonly asArray: (options?: ArrayFactoryOptions) => ArrayFactoryValue<ObjectShape>;
    readonly withOverrides: (
        overrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>
    ) => ObjectoryFactory<ObjectShape>;
    readonly extend: <ExtendedObjectShape extends ObjectShape>(
        extensionGenerator: () => ShapeToGeneratorReturnValue<ExtensionShape<ObjectShape, ExtendedObjectShape>>
    ) => ObjectoryFactory<ExtendedObjectShape>;
    readonly buildList: (options?: ArrayFactoryOptions) => readonly ObjectShape[];
    readonly buildInvalidWithout: (path: string) => unknown;
    readonly buildInvalidWithChanged: (path: string, value: unknown) => unknown;
    readonly buildInvalidWithAdditional: (path: string, value: unknown) => unknown;
    readonly [factorySymbol]: true;
};

type ArrayItemToGeneratorReturnValue<ItemShape> = [ItemShape] extends [Record<string, AllowedObjectShapeValues>]
    ? ArrayFactoryValue<Extract<ItemShape, Record<string, AllowedObjectShapeValues>>>
    : readonly ShapeToGeneratorReturnValueHelper<ItemShape>[];

type TupleToGeneratorReturnValue<TupleShape> = {
    readonly [Index in keyof TupleShape]: ShapeToGeneratorReturnValueHelper<TupleShape[Index]>;
};

export type ShapeToGeneratorReturnValueHelper<T> = T extends readonly (infer ItemShape)[]
    ? number extends T['length']
        ? ArrayItemToGeneratorReturnValue<ItemShape> | readonly ShapeToGeneratorReturnValueHelper<ItemShape>[]
    : TupleToGeneratorReturnValue<T>
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

function isArrayFactoryValue(value: unknown): value is ArrayFactoryValue<Record<string, AllowedObjectShapeValues>> {
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

function describeOverrideValue(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (Array.isArray(value)) {
        return 'an array';
    }

    if (value instanceof Date) {
        return 'a Date';
    }

    if (isRecord(value)) {
        return 'an object';
    }

    return `a ${typeof value}`;
}

function isOverrideRecord(value: unknown): value is Record<PropertyKey, unknown> {
    if (!isRecord(value)) {
        return false;
    }

    const prototype: unknown = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
}

function assertOverrideMatchesNestedFactory(value: unknown, path: string): void {
    if (!isOverrideRecord(value)) {
        throw new TypeError(
            `Invalid override at "${path}": a nested factory takes an object of overrides, received ${
                describeOverrideValue(value)
            }`
        );
    }
}

function assertOverrideMatchesArrayProperty(value: unknown, path: string): void {
    if (!Array.isArray(value)) {
        throw new TypeError(
            `Invalid override at "${path}": an array property takes an array of overrides, received ${
                describeOverrideValue(value)
            }`
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
    arrayFactory: ArrayFactoryValue<Record<string, AllowedObjectShapeValues>>,
    override: unknown
): AllowedObjectShapeValues {
    const overrideArray: readonly unknown[] | undefined = Array.isArray(override) ? override : undefined;
    const length = overrideArray?.length ?? arrayFactory.length;

    return Array.from({ length }, function (_unused, index) {
        const itemOverride = overrideArray?.[index];

        if (!isOverridesForFactory(arrayFactory.factory, itemOverride)) {
            throw new TypeError('Invalid override value provided for array factory item');
        }

        if (itemOverride === undefined) {
            return arrayFactory.factory.build();
        }

        return arrayFactory.factory.build(itemOverride);
    });
}

function buildFactoryValue(
    factory: ObjectoryFactory<Record<string, AllowedObjectShapeValues>>,
    override: unknown
): AllowedObjectShapeValues {
    if (isOverridesForFactory(factory, override)) {
        if (override === undefined) {
            return factory.build();
        }

        return factory.build(override);
    }

    throw new TypeError('Invalid override value provided for nested factory');
}

type TemplateItemResolver = (
    value: AllowedGeneratorReturnShape,
    overrideValue: unknown,
    path: string
) => AllowedObjectShapeValues;

function materializeTemplateArray(
    template: readonly AllowedGeneratorReturnShape[],
    override: unknown,
    resolve: TemplateItemResolver,
    path: string
): AllowedObjectShapeValues {
    if (Array.isArray(override)) {
        return override.map(function (item, index) {
            const templateItem = template[index];

            if (templateItem !== undefined) {
                return resolve(templateItem, item, `${path}.${index}`);
            }

            return assertAllowedObjectShapeValue(item);
        });
    }

    return template.map(function (item, index) {
        return resolve(item, undefined, `${path}.${index}`);
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
    path: string
): AllowedObjectShapeValues {
    return withMaterializedOverride(override, function (resolved) {
        if (resolved !== undefined) {
            assertOverrideMatchesNestedFactory(resolved, path);
        }

        return buildFactoryValue(value, resolved);
    });
}

function materializeArrayFactoryWithOverride(
    value: ArrayFactoryValue<Record<string, AllowedObjectShapeValues>>,
    override: NormalizedOverride,
    path: string
): AllowedObjectShapeValues {
    return withMaterializedOverride(override, function (resolved) {
        if (resolved !== undefined) {
            assertOverrideMatchesArrayProperty(resolved, path);
        }

        return materializeArrayFactoryValue(value, resolved);
    });
}

function materializeTemplateWithOverride(
    value: readonly AllowedGeneratorReturnShape[],
    override: NormalizedOverride,
    resolve: TemplateItemResolver,
    path: string
): AllowedObjectShapeValues {
    return withMaterializedOverride(override, function (resolved) {
        if (resolved !== undefined) {
            assertOverrideMatchesArrayProperty(resolved, path);
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
    path: string
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

    assertObjectValueComesFromFactory(value, path);

    return materializeLeafValue(value, normalizedOverride);
}

function applyOverrides<GeneratedObject extends Record<string, AllowedGeneratorReturnShape>>(
    generatedObject: GeneratedObject,
    overrides: Overrides<GeneratedObject>
): GeneratedObjectToShape<GeneratedObject> {
    const keys = new Set<keyof GeneratedObject>([
        ...(Object.keys(generatedObject) as (keyof GeneratedObject)[]),
        ...(Object.keys(overrides) as (keyof GeneratedObject)[])
    ]);

    const entries: [keyof GeneratedObject, GeneratedObjectToShapeHelper<GeneratedObject[keyof GeneratedObject]>][] = [];

    for (const key of keys) {
        const value = generatedObject[key];
        const hasOverride = Object.hasOwn(overrides, key);
        const overrideValue = hasOverride
            ? createOverrideWrapper(assertOverrideContainsNoFactories(overrides[key], String(key)))
            : noOverrideSymbol;
        const materialized = materializeValue(value, overrideValue, String(key));

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

function createArrayFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    factory: ObjectoryFactory<ObjectShape>,
    options?: ArrayFactoryOptions
): ArrayFactoryValue<ObjectShape> {
    return {
        factory,
        length: options?.length ?? 0,
        [arrayFactorySymbol]: true
    };
}

function instantiateFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>,
    defaultOverrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>
): ObjectoryFactory<ObjectShape> {
    const factory: ObjectoryFactory<ObjectShape> = {
        build(overrides = {}) {
            const generatedObject = generatorFunction();
            const mergedOverrides = mergeOverrides(defaultOverrides, overrides);

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
            return applyOverrides(generatedObject, mergedOverrides) as ObjectShape;
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
        buildList({ length = 0 }: ArrayFactoryOptions = {}) {
            return Array.from({ length }, function () {
                return factory.build();
            });
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
