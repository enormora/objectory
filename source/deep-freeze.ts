function isFreezableObject(value: unknown): value is Record<PropertyKey, unknown> {
    return typeof value === 'object' && value !== null;
}

function toChildren(value: Readonly<Record<PropertyKey, unknown>>): readonly unknown[] {
    if (Array.isArray(value)) {
        return value as readonly unknown[];
    }

    return Object.values(value);
}

export function deepFreeze<Value>(value: Value): Value {
    if (!isFreezableObject(value)) {
        return value;
    }

    for (const child of toChildren(value)) {
        deepFreeze(child);
    }

    return Object.freeze(value);
}
