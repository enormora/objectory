import { arrayFactorySymbol, factorySymbol } from './factory-symbols.ts';
import { isAllowedObjectShapeValue } from './object-shape-values.ts';
import { isRecord } from './record.ts';

export function isFactory(value: unknown): boolean {
    return isRecord(value) && value[factorySymbol] === true;
}

export function isArrayFactoryValue(value: unknown): boolean {
    if (!isRecord(value)) {
        return false;
    }

    if (value[arrayFactorySymbol] !== true) {
        return false;
    }

    return isFactory(value.factory) && typeof value.length === 'number';
}

function assertOverrideValueIsNotAFactory(value: unknown, path: string): void {
    if (isFactory(value) || isArrayFactoryValue(value)) {
        throw new TypeError(
            `Invalid override at "${path}": factories cannot be used as override values, use build() or buildList()`
        );
    }
}

export function assertOverrideContainsNoFactories(value: unknown, path: string): unknown {
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

export function isAllowedOverrideValue(value: unknown): boolean {
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
