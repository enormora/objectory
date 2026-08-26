import { isRecord } from './record.ts';

const primitiveAllowedTypes = new Set([ 'string', 'number', 'boolean', 'bigint', 'symbol', 'function' ]);

export function isPrimitiveAllowedObjectShapeValue(value: unknown): boolean {
    if (value === null || value === undefined) {
        return true;
    }

    if (value instanceof Date) {
        return true;
    }

    return primitiveAllowedTypes.has(typeof value);
}

export function isAllowedObjectShapeValue(value: unknown): boolean {
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

export function assertAllowedObjectShapeValue(value: unknown): unknown {
    if (!isAllowedObjectShapeValue(value)) {
        throw new TypeError('Invalid value provided for objectory factory');
    }

    return value;
}

export function assertObjectValueComesFromFactory(value: unknown, path: string): void {
    if (!isPrimitiveAllowedObjectShapeValue(value)) {
        throw new TypeError(
            `Invalid value at "${path}": use createFactory() for nested objects and asArray() for arrays of objects`
        );
    }
}
