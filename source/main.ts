/* eslint-disable @stylistic/operator-linebreak, @stylistic/indent -- conflicts with dprint */
import { addValueAtPath, normalizePath, removePropertyAtPath, setValueAtPath } from './path-operations.ts';
import { isRecord } from './record.ts';

const arrayFactorySymbol: unique symbol = Symbol('objectory.arrayFactory');
const noOverrideSymbol: unique symbol = Symbol('objectory.noOverride');
const overrideWrapperSymbol: unique symbol = Symbol('objectory.overrideWrapper');
const removePropertySymbol: unique symbol = Symbol('objectory.removeProperty');
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

export type OverridesHelper<T> =
    | RemoveProperty
    | (T extends ObjectoryFactory<infer U> ? Overrides<ShapeToGeneratorReturnValue<U>>
        : T extends ArrayFactoryValue<infer U> ? readonly Overrides<ShapeToGeneratorReturnValue<U>>[]
        : T extends readonly (infer U)[] ? readonly OverridesHelper<U>[]
        : T)
    | null
    | undefined;

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
};

// eslint-disable-next-line functional/type-declaration-immutability -- recursive conditional type over an unconstrained generic; the rule resolves its immutability to "Unknown" and cannot be satisfied by any annotation
export type ShapeToGeneratorReturnValueHelper<T> = T extends readonly (infer U)[]
    ? U extends Record<string, AllowedObjectShapeValues> ? ArrayFactoryReturnValue<U>
    : readonly ShapeToGeneratorReturnValueHelper<U>[]
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

export type ArrayFactoryReturnValue<T> = T extends Record<string, AllowedObjectShapeValues> ? ArrayFactoryValue<T>
    : never;

type GeneratedArrayItemShape<ObjectShape extends Record<string, AllowedObjectShapeValues>> = GeneratedObjectToShape<
    ShapeToGeneratorReturnValue<ObjectShape>
>;

type OverrideWrapper = { readonly value: unknown; readonly [overrideWrapperSymbol]: true; };

type NormalizedOverride = { readonly applied: false; } | { readonly applied: true; readonly value: unknown; };

export type RemoveProperty = { readonly [removePropertySymbol]: true; };

type MaterializedValue = AllowedObjectShapeValues | RemoveProperty;

export type GeneratorFunction<ObjectShape extends Record<string, AllowedObjectShapeValues>> = () =>
    ShapeToGeneratorReturnValue<ObjectShape>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ok in this case
export type AnyFunction = (...args: readonly any[]) => unknown;

export type BaseTypes = AnyFunction | Date | bigint | boolean | number | string | symbol | null | undefined;

export type AllowedObjectShapeValues =
    | BaseTypes
    | readonly AllowedObjectShapeValues[]
    | { readonly [key: string]: AllowedObjectShapeValues; };
export type AllowedGeneratorReturnShape =
    | ArrayFactoryValue<Record<string, AllowedObjectShapeValues>>
    | BaseTypes
    | ObjectoryFactory<Record<string, AllowedObjectShapeValues>>
    | readonly AllowedGeneratorReturnShape[];

function isFactory<T extends Record<string, AllowedObjectShapeValues>>(value: unknown): value is ObjectoryFactory<T> {
    return isRecord(value) && typeof value.build === 'function';
}

function isArrayFactoryValue(value: unknown): value is ArrayFactoryValue<Record<string, AllowedObjectShapeValues>> {
    if (!isRecord(value)) {
        return false;
    }

    // eslint-disable-next-line unicorn/no-unsafe-property-key -- unique symbol keys are safe; the rule false-positives on symbol types
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
        // eslint-disable-next-line unicorn/no-unsafe-property-key -- unique symbol keys are safe; the rule false-positives on symbol types
        [overrideWrapperSymbol]: true
    };
}

function isOverrideWrapper(value: unknown): value is OverrideWrapper {
    // eslint-disable-next-line unicorn/no-unsafe-property-key -- unique symbol keys are safe; the rule false-positives on symbol types
    return isRecord(value) && value[overrideWrapperSymbol] === true;
}

function createRemovePropertySentinel(): RemoveProperty {
    return {
        // eslint-disable-next-line unicorn/no-unsafe-property-key -- unique symbol keys are safe; the rule false-positives on symbol types
        [removePropertySymbol]: true
    };
}

function mapRecordEntries(
    record: Readonly<Record<PropertyKey, unknown>>,
    mapValue: (child: unknown) => unknown
): Record<string, unknown> {
    const prepared: Record<string, unknown> = {};

    for (const [ key, child ] of Object.entries(record)) {
        prepared[key] = mapValue(child);
    }

    return prepared;
}

function prepareNestedOverrideValue(value: unknown): unknown {
    if (value === undefined) {
        return createRemovePropertySentinel();
    }

    if (Array.isArray(value)) {
        return value.map(prepareNestedOverrideValue);
    }

    if (value instanceof Date) {
        return value;
    }

    if (isRecord(value)) {
        return mapRecordEntries(value, prepareNestedOverrideValue);
    }

    return value;
}

function prepareOverrideValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(prepareNestedOverrideValue);
    }

    if (value instanceof Date) {
        return value;
    }

    if (isRecord(value)) {
        return mapRecordEntries(value, function (child) {
            return child === undefined ? undefined : prepareNestedOverrideValue(child);
        });
    }

    return value;
}

function isRemoveProperty(value: unknown): value is RemoveProperty {
    // eslint-disable-next-line unicorn/no-unsafe-property-key -- unique symbol keys are safe; the rule false-positives on symbol types
    return isRecord(value) && value[removePropertySymbol] === true;
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
    const maxLength = Math.max(arrayFactory.length, overrideArray?.length ?? 0);

    return Array.from({ length: maxLength }, function (_unused, index) {
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

function materializeTemplateArray(
    template: readonly AllowedGeneratorReturnShape[],
    override: unknown,
    resolve: (value: AllowedGeneratorReturnShape, overrideValue: unknown) => AllowedObjectShapeValues
): AllowedObjectShapeValues {
    if (Array.isArray(override)) {
        return override.map(function (item, index) {
            const templateItem = template[index];

            if (templateItem !== undefined) {
                return resolve(templateItem, item);
            }

            return assertAllowedObjectShapeValue(item);
        });
    }

    return template.map(function (item) {
        return resolve(item, undefined);
    });
}

function asMaterializedValue(value: MaterializedValue): MaterializedValue {
    return value;
}

function withMaterializedOverride(
    override: NormalizedOverride,
    materialize: (overrideValue: unknown) => AllowedObjectShapeValues
): MaterializedValue {
    if (override.applied && isRemoveProperty(override.value)) {
        return asMaterializedValue(override.value);
    }

    const resolvedOverride = override.applied ? override.value : undefined;

    return asMaterializedValue(materialize(resolvedOverride));
}

function materializeFactoryWithOverride(
    value: ObjectoryFactory<Record<string, AllowedObjectShapeValues>>,
    override: NormalizedOverride
): MaterializedValue {
    return withMaterializedOverride(override, function (resolved) {
        return buildFactoryValue(value, resolved);
    });
}

function materializeArrayFactoryWithOverride(
    value: ArrayFactoryValue<Record<string, AllowedObjectShapeValues>>,
    override: NormalizedOverride
): MaterializedValue {
    return withMaterializedOverride(override, function (resolved) {
        return materializeArrayFactoryValue(value, resolved);
    });
}

function materializeTemplateWithOverride(
    value: readonly AllowedGeneratorReturnShape[],
    override: NormalizedOverride,
    resolve: (value: AllowedGeneratorReturnShape, overrideValue: unknown) => AllowedObjectShapeValues
): MaterializedValue {
    return withMaterializedOverride(override, function (resolved) {
        return materializeTemplateArray(value, resolved, resolve);
    });
}

function materializeLeafValue(
    value: AllowedGeneratorReturnShape,
    override: NormalizedOverride
): MaterializedValue {
    if (override.applied) {
        if (isRemoveProperty(override.value)) {
            return asMaterializedValue(override.value);
        }

        return asMaterializedValue(assertAllowedObjectShapeValue(override.value));
    }

    return asMaterializedValue(assertAllowedObjectShapeValue(value));
}

function materializeValue(
    value: AllowedGeneratorReturnShape,
    override: unknown
): MaterializedValue {
    const normalizedOverride = normalizeOverride(override);

    if (isFactory(value)) {
        return materializeFactoryWithOverride(value, normalizedOverride);
    }

    if (isArrayFactoryValue(value)) {
        return materializeArrayFactoryWithOverride(value, normalizedOverride);
    }

    if (Array.isArray(value)) {
        return materializeTemplateWithOverride(value, normalizedOverride, materializeValue);
    }

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
            ? createOverrideWrapper(prepareOverrideValue(overrides[key]))
            : noOverrideSymbol;
        const materialized = materializeValue(value, overrideValue);

        if (!isRemoveProperty(materialized)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
            entries.push([ key, materialized as GeneratedObjectToShapeHelper<GeneratedObject[typeof key]> ]);
        }
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
        // eslint-disable-next-line unicorn/no-unsafe-property-key -- unique symbol keys are safe; the rule false-positives on symbol types
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

                // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- ok in this case
                return {
                    ...baseGenerated,
                    ...extensionGenerated
                } as ShapeToGeneratorReturnValue<ExtendedObjectShape>;
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

            if (pathSegments.length === 0) {
                return baseObject;
            }

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

            if (pathSegments.length === 0) {
                return baseObject;
            }

            return addValueAtPath(baseObject, pathSegments, additionalValue);
        }
    };

    return factory;
}

export function createFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    return instantiateFactory(generatorFunction, {});
}
