import { isRecord } from './record.ts';

type PathSegment = number | string;

export function normalizePath(path: string): readonly PathSegment[] {
    return path.split('.').map((segment) => {
        const segmentAsNumber = Number.parseInt(segment, 10);
        if (!Number.isNaN(segmentAsNumber)) {
            return segmentAsNumber;
        }
        return segment;
    });
}

function removeFromArray(target: readonly unknown[], pathSegments: readonly PathSegment[]): unknown[] {
    const [head, ...tail] = pathSegments;
    const index = typeof head === 'number' ? head : Number(head);

    if (!Number.isInteger(index) || index < 0 || index >= target.length) {
        return target.slice();
    }

    const copy = target.slice();

    if (tail.length === 0) {
        copy.splice(index, 1);
        return copy;
    }

    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- ok for recursive function call
    copy[index] = removePropertyAtPath(copy[index], tail);
    return copy;
}

function toKey(segment: PathSegment): string {
    return typeof segment === 'number' ? segment.toString() : segment;
}

function shallowCloneObject(target: Record<string, unknown>): Record<string, unknown> {
    return { ...target };
}

function removeDirectKey(target: Record<string, unknown>, key: string): Record<string, unknown> {
    const { [key]: _removed, ...rest } = target;
    return rest;
}

function updateNestedKey(
    target: Record<string, unknown>,
    key: string,
    tail: readonly PathSegment[]
): Record<string, unknown> {
    const current = target[key];
    // eslint-disable-next-line @typescript-eslint/no-use-before-define -- ok for recursive call
    const updated = removePropertyAtPath(current, tail);

    if (updated === current) {
        return shallowCloneObject(target);
    }

    return {
        ...target,
        [key]: updated
    };
}

function removeFromObject(
    target: Record<string, unknown>,
    pathSegments: readonly PathSegment[]
): Record<string, unknown> {
    const [head, ...tail] = pathSegments;

    if (head === undefined) {
        return shallowCloneObject(target);
    }

    const key = toKey(head);

    if (!Object.hasOwn(target, key)) {
        return shallowCloneObject(target);
    }

    if (tail.length === 0) {
        return removeDirectKey(target, key);
    }

    return updateNestedKey(target, key, tail);
}

export function removePropertyAtPath(target: unknown, pathSegments: readonly PathSegment[]): unknown {
    if (pathSegments.length === 0) {
        return target;
    }

    if (Array.isArray(target)) {
        return removeFromArray(target, pathSegments);
    }

    if (isRecord(target)) {
        return removeFromObject(target, pathSegments);
    }

    return target;
}
