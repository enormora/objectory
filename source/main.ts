/* eslint-disable @stylistic/operator-linebreak, @stylistic/indent -- conflicts with prettier */
const arrayFactorySymbol: unique symbol = Symbol('objectory.arrayFactory');
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
    T extends ObjectoryFactory<infer U>
        ? Overrides<ShapeToGeneratorReturnValue<U>>
        : T extends ArrayFactoryValue<infer U>
          ? readonly Overrides<ShapeToGeneratorReturnValue<U>>[]
          : T extends readonly (infer U)[]
            ? readonly OverridesHelper<U>[]
            : T;

type ObjectoryFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>> = {
    readonly build: (overrides?: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>) => ObjectShape;
    readonly asArray: (options?: ArrayFactoryOptions) => ArrayFactoryValue<ObjectShape>;
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

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

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

function materializeValue(value: AllowedGeneratorReturnShape, override: unknown): AllowedObjectShapeValues {
    if (isFactory(value)) {
        return buildFactoryValue(value, override);
    }

    if (isArrayFactoryValue(value)) {
        return materializeArrayFactoryValue(value, override);
    }

    if (Array.isArray(value)) {
        return materializeTemplateArray(value, override, materializeValue);
    }

    if (override === undefined) {
        return assertAllowedObjectShapeValue(value);
    }

    return assertAllowedObjectShapeValue(override);
}

function applyOverrides<GeneratedObject extends Record<string, AllowedGeneratorReturnShape>>(
    generatedObject: GeneratedObject,
    overrides: Overrides<GeneratedObject>
): GeneratedObjectToShape<GeneratedObject> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion -- ok in this case
    const result = {} as Mutable<GeneratedObjectToShape<GeneratedObject>>;

    for (const key of Object.keys(generatedObject) as (keyof GeneratedObject)[]) {
        const value = generatedObject[key];
        const overrideValue = overrides[key];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
        result[key] = materializeValue(value, overrideValue) as GeneratedObjectToShapeHelper<
            GeneratedObject[typeof key]
        >;
    }

    return result as GeneratedObjectToShape<GeneratedObject>;
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

export function createFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    const factory: ObjectoryFactory<ObjectShape> = {
        build(overrides = {}) {
            const generatedObject = generatorFunction();

            // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ok in this case
            return applyOverrides(generatedObject, overrides) as ObjectShape;
        },
        asArray(options) {
            return createArrayFactory(factory, options);
        }
    };

    return factory;
}
