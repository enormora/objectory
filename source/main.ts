type ObjectoryFactory<ObjectShape> = {
    readonly build: (overrides?: Partial<ObjectShape>) => ObjectShape;
};

type GeneratorFunction<ObjectShape> = () => ObjectShape;

export function createFactory<ObjectShape extends Record<string, unknown>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    return {
        build(overrides) {
            const generatedObject = generatorFunction();

            return { ...generatedObject, ...overrides };
        }
    };
}
