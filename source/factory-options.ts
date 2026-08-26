export type ArrayFactoryOptions = {
    readonly length?: number;
};

export type BuildOptions = {
    readonly freeze?: boolean;
};

export type BuildListOptions = ArrayFactoryOptions & BuildOptions;
