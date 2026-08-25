import { isRecord } from './record.ts';

export type PathSegment = number | string;

type Path = readonly PathSegment[];

const integerSegmentPattern = /^\d+$/u;

function toPathSegment(segment: string): PathSegment {
    return integerSegmentPattern.test(segment) ? Number(segment) : segment;
}

export function normalizePath(path: string): Path {
    return path.split('.').map(toPathSegment);
}

function toKey(segment: PathSegment): string {
    return typeof segment === 'number' ? segment.toString() : segment;
}

function unresolvablePathError(pathSegments: Path): Error {
    const path = pathSegments.map(toKey).join('.');

    return new Error(`Cannot resolve path "${path}"`);
}

function shallowCloneObject(target: Readonly<Record<string, unknown>>): Record<string, unknown> {
    return { ...target };
}

function removeDirectKey(target: Readonly<Record<string, unknown>>, key: string): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(target).filter(function ([ entryKey ]) {
            return entryKey !== key;
        })
    );
}

type ArrayTerminal = (target: readonly unknown[], index: number) => readonly unknown[];
type ObjectTerminal = (target: Readonly<Record<string, unknown>>, key: string) => Record<string, unknown>;
type RecursiveStep = (child: unknown, tail: Path) => unknown;

function toArrayIndex(segment: PathSegment | undefined): number {
    return typeof segment === 'number' ? segment : Number(segment);
}

function updateArrayAtIndex(
    target: readonly unknown[],
    pathSegments: Path,
    onTerminal: ArrayTerminal,
    onRecurse: RecursiveStep
): readonly unknown[] {
    const [ head, ...tail ] = pathSegments;
    const index = toArrayIndex(head);

    if (!Number.isSafeInteger(index) || index < 0 || index >= target.length) {
        throw unresolvablePathError(pathSegments);
    }

    if (tail.length === 0) {
        return onTerminal(target, index);
    }

    return target.with(index, onRecurse(target[index], tail));
}

function applyRecursiveObjectUpdate(
    target: Readonly<Record<string, unknown>>,
    key: string,
    tail: Path,
    onRecurse: RecursiveStep
): Record<string, unknown> {
    const current = target[key];
    const updated = onRecurse(current, tail);

    if (updated === current) {
        return shallowCloneObject(target);
    }

    return {
        ...target,
        [key]: updated
    };
}

function updateObjectAtKey(
    target: Readonly<Record<string, unknown>>,
    pathSegments: Path,
    onTerminal: ObjectTerminal,
    onRecurse: RecursiveStep
): Record<string, unknown> {
    const [ head, ...tail ] = pathSegments;

    if (head === undefined) {
        throw unresolvablePathError(pathSegments);
    }

    const key = toKey(head);

    if (!Object.hasOwn(target, key)) {
        throw unresolvablePathError(pathSegments);
    }

    if (tail.length === 0) {
        return onTerminal(target, key);
    }

    return applyRecursiveObjectUpdate(target, key, tail, onRecurse);
}

export function removePropertyAtPath(target: unknown, pathSegments: Path): unknown {
    if (pathSegments.length === 0) {
        return target;
    }

    if (Array.isArray(target)) {
        return updateArrayAtIndex(
            target,
            pathSegments,
            function (arrayTarget, index) {
                return arrayTarget.toSpliced(index, 1);
            },
            removePropertyAtPath
        );
    }

    if (isRecord(target)) {
        return updateObjectAtKey(target, pathSegments, removeDirectKey, removePropertyAtPath);
    }

    throw unresolvablePathError(pathSegments);
}

export function setValueAtPath(target: unknown, pathSegments: Path, value: unknown): unknown {
    if (pathSegments.length === 0) {
        return value;
    }

    const recurse: RecursiveStep = function (child, tail) {
        return setValueAtPath(child, tail, value);
    };

    if (Array.isArray(target)) {
        return updateArrayAtIndex(
            target,
            pathSegments,
            function (arrayTarget, index) {
                return arrayTarget.with(index, value);
            },
            recurse
        );
    }

    if (isRecord(target)) {
        return updateObjectAtKey(
            target,
            pathSegments,
            function (record, key) {
                return { ...record, [key]: value };
            },
            recurse
        );
    }

    throw unresolvablePathError(pathSegments);
}

function addNewKey(
    target: Readonly<Record<string, unknown>>,
    key: string,
    value: unknown
): Record<string, unknown> {
    if (Object.hasOwn(target, key)) {
        throw new Error(`Cannot add property at path "${key}" because it already exists`);
    }

    return { ...target, [key]: value };
}

function insertIntoArray(
    target: readonly unknown[],
    pathSegments: Path,
    index: number,
    value: unknown
): readonly unknown[] {
    if (index > target.length) {
        throw unresolvablePathError(pathSegments);
    }

    return target.toSpliced(index, 0, value);
}

function addValueAtArrayPath(
    target: readonly unknown[],
    pathSegments: Path,
    value: unknown,
    onRecurse: RecursiveStep
): readonly unknown[] {
    const [ head, ...tail ] = pathSegments;
    const index = toArrayIndex(head);

    if (!Number.isSafeInteger(index) || index < 0) {
        throw unresolvablePathError(pathSegments);
    }

    if (tail.length === 0) {
        return insertIntoArray(target, pathSegments, index, value);
    }

    if (index >= target.length) {
        throw unresolvablePathError(pathSegments);
    }

    return target.with(index, onRecurse(target[index], tail));
}

function addValueAtObjectPath(
    target: Readonly<Record<string, unknown>>,
    pathSegments: Path,
    value: unknown,
    onRecurse: RecursiveStep
): Record<string, unknown> {
    const [ head, ...tail ] = pathSegments;

    if (head === undefined) {
        throw unresolvablePathError(pathSegments);
    }

    const key = toKey(head);

    if (tail.length === 0) {
        return addNewKey(target, key, value);
    }

    if (!Object.hasOwn(target, key)) {
        throw unresolvablePathError(pathSegments);
    }

    return applyRecursiveObjectUpdate(target, key, tail, onRecurse);
}

export function addValueAtPath(target: unknown, pathSegments: Path, value: unknown): unknown {
    if (pathSegments.length === 0) {
        return target;
    }

    const recurse: RecursiveStep = function (child, tail) {
        return addValueAtPath(child, tail, value);
    };

    if (Array.isArray(target)) {
        return addValueAtArrayPath(target, pathSegments, value, recurse);
    }

    if (isRecord(target)) {
        return addValueAtObjectPath(target, pathSegments, value, recurse);
    }

    throw unresolvablePathError(pathSegments);
}
