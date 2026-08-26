import type { AllowedObjectShapeValues, ObjectoryFactory } from './main.ts';

type AnyObjectoryFactory = ObjectoryFactory<Readonly<Record<string, AllowedObjectShapeValues>>>;

export type VariantList = readonly [AnyObjectoryFactory, ...AnyObjectoryFactory[]];

type ShapeBuiltBy<Variant> = Variant extends ObjectoryFactory<infer Shape> ? Shape : never;

export type CoveredShape<Variants extends VariantList> = ShapeBuiltBy<Variants[number]>;

type VariantDefaults = Readonly<Record<string, unknown>>;

const noVariantMatched =
    'Invalid override for a union factory: no registered variant matches it, name the discriminator ' +
    'or register the variant with createUnionFactory()';

function isComparableValue(value: unknown): boolean {
    return value === null || typeof value !== 'object';
}

function keysSharedByAll(allDefaults: readonly VariantDefaults[]): readonly string[] {
    const [ first, ...rest ] = allDefaults;

    return Object.keys(first ?? {}).filter(function (key) {
        return rest.every(function (defaults) {
            return Object.hasOwn(defaults, key);
        });
    });
}

function valuesDiffer(values: readonly unknown[]): boolean {
    const distinctValues = new Set(values);

    return distinctValues.size > 1;
}

function keysVariantsDisagreeOn(allDefaults: readonly VariantDefaults[]): readonly string[] {
    return keysSharedByAll(allDefaults).filter(function (key) {
        const values = allDefaults.map(function (defaults) {
            return defaults[key];
        });

        return values.every(isComparableValue) && valuesDiffer(values);
    });
}

function coversKeys(defaults: VariantDefaults, overrideKeys: readonly string[]): boolean {
    return overrideKeys.every(function (key) {
        return Object.hasOwn(defaults, key);
    });
}

function agreesOnKeys(defaults: VariantDefaults, override: VariantDefaults, keys: readonly string[]): boolean {
    return keys.every(function (key) {
        return defaults[key] === override[key];
    });
}

function pickIndex(
    coveringIndexes: readonly number[],
    agreeingIndexes: readonly number[],
    hasDecidingKeys: boolean
): number | undefined {
    const [ firstAgreeing ] = agreeingIndexes;

    if (hasDecidingKeys && firstAgreeing !== undefined) {
        return firstAgreeing;
    }

    if (coveringIndexes.includes(0)) {
        return 0;
    }

    return coveringIndexes[0];
}

function selectIndex(allDefaults: readonly VariantDefaults[], override: VariantDefaults): number {
    const overrideKeys = Object.keys(override);
    const decidingKeys = keysVariantsDisagreeOn(allDefaults).filter(function (key) {
        return Object.hasOwn(override, key);
    });
    const coveringIndexes = allDefaults
        .map(function (_defaults, index) {
            return index;
        })
        .filter(function (index) {
            return coversKeys(allDefaults[index] ?? {}, overrideKeys);
        });
    const agreeingIndexes = coveringIndexes.filter(function (index) {
        return agreesOnKeys(allDefaults[index] ?? {}, override, decidingKeys);
    });
    const chosen = pickIndex(coveringIndexes, agreeingIndexes, decidingKeys.length > 0);

    if (chosen === undefined) {
        throw new TypeError(noVariantMatched);
    }

    return chosen;
}

export function createVariantSelector<Variant>(
    variants: readonly Variant[],
    defaultsOf: (variant: Variant) => VariantDefaults
): (override: VariantDefaults) => Variant {
    let allDefaults: readonly VariantDefaults[] | null = null;

    function defaults(): readonly VariantDefaults[] {
        if (allDefaults === null) {
            allDefaults = variants.map(defaultsOf);
        }

        return allDefaults;
    }

    return function selectVariant(override) {
        const variant = variants[selectIndex(defaults(), override)];

        if (variant === undefined) {
            throw new TypeError(noVariantMatched);
        }

        return variant;
    };
}
