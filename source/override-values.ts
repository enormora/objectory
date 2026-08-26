import { isRecord } from './record.ts';

function describeOverrideValue(value: unknown): string {
    if (value === null) {
        return 'null';
    }

    if (Array.isArray(value)) {
        return 'an array';
    }

    if (value instanceof Date) {
        return 'a Date';
    }

    if (isRecord(value)) {
        return 'an object';
    }

    return `a ${typeof value}`;
}

function isOverrideRecord(value: unknown): value is Record<PropertyKey, unknown> {
    if (!isRecord(value)) {
        return false;
    }

    const prototype: unknown = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
}

export function assertOverrideMatchesNestedFactory(value: unknown, path: string): void {
    if (!isOverrideRecord(value)) {
        throw new TypeError(
            `Invalid override at "${path}": a nested factory takes an object of overrides, received ${
                describeOverrideValue(value)
            }`
        );
    }
}

export function assertOverrideMatchesArrayProperty(value: unknown, path: string): void {
    if (!Array.isArray(value)) {
        throw new TypeError(
            `Invalid override at "${path}": an array property takes an array of overrides, received ${
                describeOverrideValue(value)
            }`
        );
    }
}

export type ValuePath = {
    readonly withinFactory: string;
    readonly fromRoot: string;
};

export function joinPath(pathPrefix: string, segment: string): string {
    return pathPrefix === '' ? segment : `${pathPrefix}.${segment}`;
}

export function rootPath(pathPrefix: string, key: string): ValuePath {
    return { withinFactory: key, fromRoot: joinPath(pathPrefix, key) };
}

export function childPath(parent: ValuePath, segment: string): ValuePath {
    return {
        withinFactory: joinPath(parent.withinFactory, segment),
        fromRoot: joinPath(parent.fromRoot, segment)
    };
}
