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

function updateArrayAtIndex(
    target: readonly unknown[],
    pathSegments: Path,
    onTerminal: ArrayTerminal,
    onRecurse: RecursiveStep
): readonly unknown[] {
    const [ head, ...tail ] = pathSegments;
    const index = typeof head === 'number' ? head : Number(head);

    if (!Number.isSafeInteger(index) || index < 0 || index >= target.length) {
        return target.slice();
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
        return shallowCloneObject(target);
    }

    const key = toKey(head);

    if (!Object.hasOwn(target, key)) {
        return shallowCloneObject(target);
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

    return target;
}

function createStructureForPath(pathSegments: Path, value: unknown): unknown {
    const [ head, ...tail ] = pathSegments;

    if (head === undefined) {
        return value;
    }

    if (typeof head === 'number') {
        const result = Array.from<unknown>({ length: head + 1 });
        result[head] = createStructureForPath(tail, value);
        return result;
    }

    return {
        [head]: createStructureForPath(tail, value)
    };
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

    return createStructureForPath(pathSegments, value);
}

function spliceInsertAtIndex(target: readonly unknown[], index: number, value: unknown): readonly unknown[] {
    if (index > target.length) {
        return target.slice();
    }

    return target.toSpliced(index, 0, value);
}

function addNewKeyOrThrow(
    target: Readonly<Record<string, unknown>>,
    key: string,
    value: unknown
): Record<string, unknown> {
    if (Object.hasOwn(target, key)) {
        throw new Error(`Cannot add property at path "${key}" because it already exists`);
    }

    return { ...target, [key]: value };
}

function recurseIntoArrayElement(
    target: readonly unknown[],
    index: number,
    tail: Path,
    onRecurse: RecursiveStep
): unknown[] {
    if (index >= target.length) {
        return target.slice();
    }

    const copy = target.slice();
    copy[index] = onRecurse(copy[index], tail);
    return copy;
}

function addValueAtArrayPath(
    target: readonly unknown[],
    pathSegments: Path,
    value: unknown,
    onRecurse: RecursiveStep
): readonly unknown[] {
    const [ head, ...tail ] = pathSegments;
    const index = typeof head === 'number' ? head : Number(head);

    if (!Number.isSafeInteger(index) || index < 0) {
        return target.slice();
    }

    if (tail.length === 0) {
        return spliceInsertAtIndex(target, index, value);
    }

    return recurseIntoArrayElement(target, index, tail, onRecurse);
}

function addValueAtObjectPath(
    target: Readonly<Record<string, unknown>>,
    pathSegments: Path,
    value: unknown,
    onRecurse: RecursiveStep
): Record<string, unknown> {
    const [ head, ...tail ] = pathSegments;

    if (head === undefined) {
        return shallowCloneObject(target);
    }

    const key = toKey(head);

    if (tail.length === 0) {
        return addNewKeyOrThrow(target, key, value);
    }

    if (!Object.hasOwn(target, key)) {
        return shallowCloneObject(target);
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

    return target;
}
