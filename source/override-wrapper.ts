import { isRecord } from './record.ts';

const noOverrideSymbol: unique symbol = Symbol('objectory.noOverride');
const overrideWrapperSymbol: unique symbol = Symbol('objectory.overrideWrapper');

type OverrideWrapper = { readonly value: unknown; readonly [overrideWrapperSymbol]: true; };

export type NormalizedOverride = { readonly applied: false; } | { readonly applied: true; readonly value: unknown; };

export const noOverrideMarker: typeof noOverrideSymbol = noOverrideSymbol;

export function createOverrideWrapper(value: unknown): OverrideWrapper {
    return {
        value,
        [overrideWrapperSymbol]: true
    };
}

function isOverrideWrapper(value: unknown): value is OverrideWrapper {
    return isRecord(value) && value[overrideWrapperSymbol] === true;
}

export function normalizeOverride(override: unknown): NormalizedOverride {
    if (override === undefined || override === noOverrideSymbol) {
        return { applied: false };
    }

    if (isOverrideWrapper(override)) {
        return { applied: true, value: override.value };
    }

    return { applied: true, value: override };
}
