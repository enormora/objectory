/* eslint-disable @stylistic/indent-binary-ops, @stylistic/operator-linebreak, @stylistic/indent -- conflicts with prettier */
const arrayFactorySymbol: unique symbol = Symbol('objectory.arrayFactory');
const noOverrideSymbol: unique symbol = Symbol('objectory.noOverride');
const overrideWrapperSymbol: unique symbol = Symbol('objectory.overrideWrapper');
const removePropertySymbol: unique symbol = Symbol('objectory.removeProperty');
const primitiveAllowedTypes = new Set(['string', 'number', 'boolean', 'bigint', 'symbol', 'function']);

type ArrayFactoryOptions = {
    readonly length?: number;
};

type ArrayFactoryValue<ObjectShape extends Record<string, AllowedObjectShapeValues>> = {
    readonly factory: ObjectoryFactory<ObjectShape>;
    readonly length: number;
    readonly [arrayFactorySymbol]: true;
};

type Overrides<ObjectShape extends Record<string, AllowedGeneratorReturnShape>> = {
    [P in keyof ObjectShape]?: OverridesHelper<ObjectShape[P]>;
};

type OverridesHelper<T> =
    | RemoveProperty
    | (T extends ObjectoryFactory<infer U>
          ? Overrides<ShapeToGeneratorReturnValue<U>>
          : T extends ArrayFactoryValue<infer U>
            ? readonly Overrides<ShapeToGeneratorReturnValue<U>>[]
            : T extends readonly (infer U)[]
              ? readonly OverridesHelper<U>[]
              : T)
    | null
    | undefined;

type ObjectoryFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>> = {
    readonly build: (overrides?: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>) => ObjectShape;
    readonly asArray: (options?: ArrayFactoryOptions) => ArrayFactoryValue<ObjectShape>;
    readonly withOverrides: (
        overrides: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>
    ) => ObjectoryFactory<ObjectShape>;
};

type ShapeToGeneratorReturnValueHelper<T> = T extends readonly (infer U)[]
    ? U extends Record<string, AllowedObjectShapeValues>
        ? ArrayFactoryReturnValue<U>
        : readonly ShapeToGeneratorReturnValueHelper<U>[]
    : T extends Record<string, AllowedObjectShapeValues>
      ? ObjectoryFactory<T>
      : T;

type ShapeToGeneratorReturnValue<T extends Record<string, AllowedObjectShapeValues>> = {
    [P in keyof T]: ShapeToGeneratorReturnValueHelper<T[P]>;
};

type GeneratedObjectToShape<T extends Record<string, AllowedGeneratorReturnShape>> = {
    [P in keyof T]: GeneratedObjectToShapeHelper<T[P]>;
};

type GeneratedObjectToShapeHelper<T> =
    T extends ObjectoryFactory<infer U>
        ? U
        : T extends ArrayFactoryValue<infer U>
          ? readonly GeneratedArrayItemShape<U>[]
          : T extends readonly (infer U)[]
            ? readonly GeneratedObjectToShapeHelper<U>[]
            : T;

type ArrayFactoryReturnValue<T> = T extends Record<string, AllowedObjectShapeValues> ? ArrayFactoryValue<T> : never;

type GeneratedArrayItemShape<ObjectShape extends Record<string, AllowedObjectShapeValues>> = GeneratedObjectToShape<
    ShapeToGeneratorReturnValue<ObjectShape>
>;

type OverrideWrapper = { readonly value: unknown; readonly [overrideWrapperSymbol]: true };

type NormalizedOverride = { readonly applied: false } | { readonly applied: true; readonly value: unknown };

type RemoveProperty = { readonly [removePropertySymbol]: true };

type GeneratorFunction<ObjectShape extends Record<string, AllowedObjectShapeValues>> =
    () => ShapeToGeneratorReturnValue<ObjectShape>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ok in this case
type AnyFunction = (...args: any[]) => unknown;

type BaseTypes = AnyFunction | Date | bigint | boolean | number | string | symbol | null | undefined;

type AllowedObjectShapeValues =
    | BaseTypes
    | readonly AllowedObjectShapeValues[]
    | { [key: string]: AllowedObjectShapeValues };
type AllowedGeneratorReturnShape =
    | ArrayFactoryValue<Record<string, AllowedObjectShapeValues>>
    | BaseTypes
    | ObjectoryFactory<Record<string, AllowedObjectShapeValues>>
    | readonly AllowedGeneratorReturnShape[];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFactory<T extends Record<string, AllowedObjectShapeValues>>(value: unknown): value is ObjectoryFactory<T> {
    return isRecord(value) && typeof value.build === 'function';
}

type ArrayFactoryMarker = { [arrayFactorySymbol]?: boolean };

function isArrayFactoryValue(value: unknown): value is ArrayFactoryValue<Record<string, AllowedObjectShapeValues>> {
    if (!isRecord(value)) {
        return false;
    }

    const marker = value as ArrayFactoryMarker;

    if (marker[arrayFactorySymbol] !== true) {
        return false;
    }

    const maybeFactory = (value as { factory?: unknown }).factory;
    const maybeLength = (value as { length?: unknown }).length;

    return isFactory(maybeFactory) && typeof maybeLength === 'number';
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
        [overrideWrapperSymbol]: true
    };
}

function isOverrideWrapper(value: unknown): value is OverrideWrapper {
    return isRecord(value) && (value as Partial<OverrideWrapper>)[overrideWrapperSymbol] === true;
}

function createRemovePropertySentinel(): RemoveProperty {
    return {
        [removePropertySymbol]: true
    };
}

// eslint-disable-next-line max-statements, complexity -- needs to be refactored
function prepareOverrideValue(value: unknown, nested = false): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => {
            return prepareOverrideValue(item, true);
        });
    }

    if (value instanceof Date) {
        return value;
    }

    if (isRecord(value)) {
        const prepared: Record<string, unknown> = {};

        for (const [nestedKey, nestedValue] of Object.entries(value)) {
            if (nestedValue === undefined) {
                prepared[nestedKey] = nested ? createRemovePropertySentinel() : undefined;
            } else {
                prepared[nestedKey] = prepareOverrideValue(nestedValue, true);
            }
        }

        return prepared;
    }

    if (nested && value === undefined) {
        return createRemovePropertySentinel();
    }

    return value;
}

function isRemoveProperty(value: unknown): value is RemoveProperty {
    return isRecord(value) && (value as Partial<RemoveProperty>)[removePropertySymbol] === true;
}

function isNoOverride(override: unknown): override is typeof noOverrideSymbol {
    return override === noOverrideSymbol;
}

function normalizeOverride(override: unknown): NormalizedOverride {
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

    return Array.from({ length: maxLength }, (_unused, index) => {
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
        return override.map((item, index) => {
            const templateItem = template[index];

            if (templateItem !== undefined) {
                return resolve(templateItem, item);
            }

            return assertAllowedObjectShapeValue(item);
        });
    }

    return template.map((item) => {
        return resolve(item, undefined);
    });
}

function materializeFactoryWithOverride(
    value: ObjectoryFactory<Record<string, AllowedObjectShapeValues>>,
    override: NormalizedOverride
): AllowedObjectShapeValues | RemoveProperty {
    if (override.applied && isRemoveProperty(override.value)) {
        return override.value;
    }

    const resolvedOverride = override.applied ? override.value : undefined;

    return buildFactoryValue(value, resolvedOverride);
}

function materializeArrayFactoryWithOverride(
    value: ArrayFactoryValue<Record<string, AllowedObjectShapeValues>>,
    override: NormalizedOverride
): AllowedObjectShapeValues | RemoveProperty {
    if (!override.applied) {
        return materializeArrayFactoryValue(value, undefined);
    }

    if (isRemoveProperty(override.value)) {
        return override.value;
    }

    if (override.value === undefined) {
        return materializeArrayFactoryValue(value, undefined);
    }

    return materializeArrayFactoryValue(value, override.value);
}

function materializeTemplateWithOverride(
    value: readonly AllowedGeneratorReturnShape[],
    override: NormalizedOverride,
    resolve: (value: AllowedGeneratorReturnShape, overrideValue: unknown) => AllowedObjectShapeValues
): AllowedObjectShapeValues | RemoveProperty {
    if (!override.applied) {
        return materializeTemplateArray(value, undefined, resolve);
    }

    if (isRemoveProperty(override.value)) {
        return override.value;
    }

    if (override.value === undefined) {
        return materializeTemplateArray(value, undefined, resolve);
    }

    return materializeTemplateArray(value, override.value, resolve);
}

function materializeLeafValue(
    value: AllowedGeneratorReturnShape,
    override: NormalizedOverride
): AllowedObjectShapeValues | RemoveProperty {
    if (override.applied) {
        if (isRemoveProperty(override.value)) {
            return override.value;
        }

        return assertAllowedObjectShapeValue(override.value);
    }

    return assertAllowedObjectShapeValue(value);
}

function materializeValue(
    value: AllowedGeneratorReturnShape,
    override: unknown
): AllowedObjectShapeValues | RemoveProperty {
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
            entries.push([key, materialized as GeneratedObjectToShapeHelper<GeneratedObject[typeof key]>]);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
    return Object.fromEntries(entries) as GeneratedObjectToShape<GeneratedObject>;
}

function mergeOverrides<GeneratedObject extends Record<string, AllowedGeneratorReturnShape>>(
    base: Overrides<GeneratedObject>,
    extension: Overrides<GeneratedObject>
): Overrides<GeneratedObject> {
    const merged: Overrides<GeneratedObject> = { ...base };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
    for (const [key, value] of Object.entries(extension) as [
        keyof Overrides<GeneratedObject>,
        OverridesHelper<GeneratedObject[keyof GeneratedObject]>
    ][]) {
        merged[key] = value;
    }

    return merged;
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
        }
    };

    return factory;
}

export function createFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    return instantiateFactory(generatorFunction, {} as Overrides<ShapeToGeneratorReturnValue<ObjectShape>>);
}
