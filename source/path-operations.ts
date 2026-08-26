import { isRecord } from './record.ts';

export type PathSegment = number | string;

type Path = readonly PathSegment[];

type PathCursor = {
    readonly remaining: Path;
    readonly full: Path;
};

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

function formatPath(pathSegments: Path): string {
    return pathSegments.map(toKey).join('.');
}

function startCursor(pathSegments: Path): PathCursor {
    return { remaining: pathSegments, full: pathSegments };
}

function advanceCursor(cursor: PathCursor, remaining: Path): PathCursor {
    return { remaining, full: cursor.full };
}

function unresolvablePathError(cursor: PathCursor): Error {
    return new Error(`Cannot resolve path "${formatPath(cursor.full)}"`);
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
    cursor: PathCursor,
    onTerminal: ArrayTerminal,
    onRecurse: RecursiveStep
): readonly unknown[] {
    const [ head, ...tail ] = cursor.remaining;
    const index = toArrayIndex(head);

    if (!Number.isSafeInteger(index) || index < 0 || index >= target.length) {
        throw unresolvablePathError(cursor);
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
    cursor: PathCursor,
    onTerminal: ObjectTerminal,
    onRecurse: RecursiveStep
): Record<string, unknown> {
    const [ head, ...tail ] = cursor.remaining;

    if (head === undefined) {
        throw unresolvablePathError(cursor);
    }

    const key = toKey(head);

    if (!Object.hasOwn(target, key)) {
        throw unresolvablePathError(cursor);
    }

    if (tail.length === 0) {
        return onTerminal(target, key);
    }

    return applyRecursiveObjectUpdate(target, key, tail, onRecurse);
}

function removeAtPath(target: unknown, cursor: PathCursor): unknown {
    if (cursor.remaining.length === 0) {
        return target;
    }

    const recurse: RecursiveStep = function (child, tail) {
        return removeAtPath(child, advanceCursor(cursor, tail));
    };

    if (Array.isArray(target)) {
        return updateArrayAtIndex(
            target,
            cursor,
            function (arrayTarget, index) {
                return arrayTarget.toSpliced(index, 1);
            },
            recurse
        );
    }

    if (isRecord(target)) {
        return updateObjectAtKey(target, cursor, removeDirectKey, recurse);
    }

    throw unresolvablePathError(cursor);
}

export function removePropertyAtPath(target: unknown, pathSegments: Path): unknown {
    return removeAtPath(target, startCursor(pathSegments));
}

function setAtPath(target: unknown, cursor: PathCursor, value: unknown): unknown {
    if (cursor.remaining.length === 0) {
        return value;
    }

    const recurse: RecursiveStep = function (child, tail) {
        return setAtPath(child, advanceCursor(cursor, tail), value);
    };

    if (Array.isArray(target)) {
        return updateArrayAtIndex(
            target,
            cursor,
            function (arrayTarget, index) {
                return arrayTarget.with(index, value);
            },
            recurse
        );
    }

    if (isRecord(target)) {
        return updateObjectAtKey(
            target,
            cursor,
            function (record, key) {
                return { ...record, [key]: value };
            },
            recurse
        );
    }

    throw unresolvablePathError(cursor);
}

export function setValueAtPath(target: unknown, pathSegments: Path, value: unknown): unknown {
    return setAtPath(target, startCursor(pathSegments), value);
}

function addNewKey(
    target: Readonly<Record<string, unknown>>,
    key: string,
    cursor: PathCursor,
    value: unknown
): Record<string, unknown> {
    if (Object.hasOwn(target, key)) {
        throw new Error(`Cannot add property at path "${formatPath(cursor.full)}" because it already exists`);
    }

    return { ...target, [key]: value };
}

function insertIntoArray(
    target: readonly unknown[],
    cursor: PathCursor,
    index: number,
    value: unknown
): readonly unknown[] {
    if (index > target.length) {
        throw unresolvablePathError(cursor);
    }

    return target.toSpliced(index, 0, value);
}

function addValueAtArrayPath(
    target: readonly unknown[],
    cursor: PathCursor,
    value: unknown,
    onRecurse: RecursiveStep
): readonly unknown[] {
    const [ head, ...tail ] = cursor.remaining;
    const index = toArrayIndex(head);

    if (!Number.isSafeInteger(index) || index < 0) {
        throw unresolvablePathError(cursor);
    }

    if (tail.length === 0) {
        return insertIntoArray(target, cursor, index, value);
    }

    if (index >= target.length) {
        throw unresolvablePathError(cursor);
    }

    return target.with(index, onRecurse(target[index], tail));
}

function addValueAtObjectPath(
    target: Readonly<Record<string, unknown>>,
    cursor: PathCursor,
    value: unknown,
    onRecurse: RecursiveStep
): Record<string, unknown> {
    const [ head, ...tail ] = cursor.remaining;

    if (head === undefined) {
        throw unresolvablePathError(cursor);
    }

    const key = toKey(head);

    if (tail.length === 0) {
        return addNewKey(target, key, cursor, value);
    }

    if (!Object.hasOwn(target, key)) {
        throw unresolvablePathError(cursor);
    }

    return applyRecursiveObjectUpdate(target, key, tail, onRecurse);
}

function addAtPath(target: unknown, cursor: PathCursor, value: unknown): unknown {
    if (cursor.remaining.length === 0) {
        return target;
    }

    const recurse: RecursiveStep = function (child, tail) {
        return addAtPath(child, advanceCursor(cursor, tail), value);
    };

    if (Array.isArray(target)) {
        return addValueAtArrayPath(target, cursor, value, recurse);
    }

    if (isRecord(target)) {
        return addValueAtObjectPath(target, cursor, value, recurse);
    }

    throw unresolvablePathError(cursor);
}

export function addValueAtPath(target: unknown, pathSegments: Path, value: unknown): unknown {
    return addAtPath(target, startCursor(pathSegments), value);
}
