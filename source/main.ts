type ObjectoryFactory<ObjectShape> = {
    readonly build: () => ObjectShape;
};

type GeneratorFunction<ObjectShape> = () => ObjectShape;

export function createFactory<ObjectShape extends Record<string, unknown>>(
    generatorFunction: GeneratorFunction<ObjectShape>
): ObjectoryFactory<ObjectShape> {
    return {
        build: generatorFunction
    };
}
