type Overrides<ObjectShape extends Record<string, AllowedGeneratorReturnShape>> = {
    [P in keyof ObjectShape]?: ObjectShape[P] extends ObjectoryFactory<infer U>
        ? U extends Record<string, AllowedObjectShapeValues>
            ? Overrides<ShapeToGeneratorReturnValue<U>>
            : ObjectShape[P]
        : ObjectShape[P];
};

type ObjectoryFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>> = {
    readonly build: (
        overrides?: Overrides<ShapeToGeneratorReturnValue<ObjectShape>>
    ) => GeneratedObjectToShape<ShapeToGeneratorReturnValue<ObjectShape>>;
};

type ShapeToGeneratorReturnValueHelper<T> =
    T extends Record<string, AllowedObjectShapeValues> ? ObjectoryFactory<T> : T;

type ShapeToGeneratorReturnValue<T extends Record<string, AllowedObjectShapeValues>> = {
    [P in keyof T]: ShapeToGeneratorReturnValueHelper<T[P]>;
};

type GeneratedObjectToShape<T extends Record<string, AllowedGeneratorReturnShape>> = {
    [P in keyof T]: T[P] extends ObjectoryFactory<infer U> ? U : T[P];
};

type GeneratorFunction<ObjectShape extends Record<string, AllowedObjectShapeValues>> =
    () => ShapeToGeneratorReturnValue<ObjectShape>;

type AllowedObjectShapeValues = number | string | { [key: string]: AllowedObjectShapeValues };
type AllowedGeneratorReturnShape = ObjectoryFactory<Record<string, AllowedObjectShapeValues>> | number | string;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFactory<T extends Record<string, AllowedObjectShapeValues>>(value: unknown): value is ObjectoryFactory<T> {
    return isRecord(value) && typeof value.build === 'function';
}

function applyOverrides<GeneratedObject extends Record<string, AllowedGeneratorReturnShape>>(
    generatedObject: GeneratedObject,
    overrides: Overrides<GeneratedObject>
): GeneratedObjectToShape<GeneratedObject> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- temporarily fine
    return Object.fromEntries(
        Object.entries(generatedObject).map((entry) => {
            const [key, value] = entry;

            if (isFactory(value)) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- temporarily fine
                return [key, value.build(overrides[key] as Parameters<typeof value.build>[0])];
            }

            return [key, overrides[key] ?? value];
        })
    ) as GeneratedObjectToShape<GeneratedObject>;
}

export function createFactory<ObjectShape extends Record<string, AllowedObjectShapeValues>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    return {
        build(overrides = {}) {
            const generatedObject = generatorFunction();

            return applyOverrides(generatedObject, overrides);
        }
    };
}
