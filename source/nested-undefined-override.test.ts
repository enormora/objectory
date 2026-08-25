import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory, type ObjectoryFactory } from './main.ts';

type LocalizedText = Readonly<Record<string, string | undefined>>;

type Named = {
    readonly name: LocalizedText;
};

type Payload = {
    readonly payload: Named;
};

type Envelope = {
    readonly envelope: Payload;
};

type Address = {
    readonly street: string;
    readonly city: string | undefined;
};

type User = {
    readonly address: Address;
};

type Account = {
    readonly user: User;
};

type Person = {
    readonly name: string;
    readonly age: number;
};

function collectOwnSymbolKeys(value: unknown): readonly symbol[] {
    if (Array.isArray(value)) {
        return value.flatMap(collectOwnSymbolKeys);
    }

    if (typeof value === 'object' && value !== null) {
        return [
            ...Object.getOwnPropertySymbols(value),
            ...Object.values(value).flatMap(collectOwnSymbolKeys)
        ];
    }

    return [];
}

function createNameFactory(): ObjectoryFactory<LocalizedText> {
    return createFactory<LocalizedText>(function () {
        return { 'de-DE': 'Product' };
    });
}

function createNamedFactory(): ObjectoryFactory<Named> {
    return createFactory<Named>(function () {
        return { name: createNameFactory() };
    });
}

function createPayloadFactory(): ObjectoryFactory<Payload> {
    return createFactory<Payload>(function () {
        return { payload: createNamedFactory() };
    });
}

function createEnvelopeFactory(): ObjectoryFactory<Envelope> {
    return createFactory<Envelope>(function () {
        return { envelope: createPayloadFactory() };
    });
}

test('build() keeps a record key with an undefined value at depth one', function () {
    const actual = createNameFactory().build({ 'de-DE': undefined });

    assert.deepStrictEqual(actual, { 'de-DE': undefined });
});

test('build() keeps a record key with an undefined value at depth two', function () {
    const actual = createNamedFactory().build({ name: { 'de-DE': undefined } });

    assert.deepStrictEqual(actual, { name: { 'de-DE': undefined } });
});

test('build() keeps a record key with an undefined value at depth three', function () {
    const actual = createPayloadFactory().build({ payload: { name: { 'de-DE': undefined } } });

    assert.deepStrictEqual(actual, { payload: { name: { 'de-DE': undefined } } });
});

test('build() keeps a record key with an undefined value at depth four', function () {
    const actual = createEnvelopeFactory().build({
        envelope: { payload: { name: { 'de-DE': undefined } } }
    });

    assert.deepStrictEqual(actual, { envelope: { payload: { name: { 'de-DE': undefined } } } });
});

test('build() keeps a fixed shape property with an undefined value at depth three', function () {
    const factory = createFactory<Account>(function () {
        return {
            user: createFactory<User>(function () {
                return {
                    address: createFactory<Address>(function () {
                        return { street: 'Main St 1', city: 'Berlin' };
                    })
                };
            })
        };
    });

    const actual = factory.build({ user: { address: { city: undefined } } });

    assert.deepStrictEqual(actual, { user: { address: { street: 'Main St 1', city: undefined } } });
});

test('build() never writes an internal marker object into the result', function () {
    const factory = createFactory<{ readonly tags: readonly string[]; }>(function () {
        return { tags: [ 'first', 'second' ] };
    });

    const actual = factory.build({ tags: [ undefined, 'replaced' ] });

    assert.deepStrictEqual(collectOwnSymbolKeys(actual), []);
});

test('build() keeps the default element when a template array override element is undefined', function () {
    const factory = createFactory<{ readonly tags: readonly string[]; }>(function () {
        return { tags: [ 'first', 'second' ] };
    });

    const actual = factory.build({ tags: [ undefined, 'replaced' ] });

    assert.deepStrictEqual(actual, { tags: [ 'first', 'replaced' ] });
});

test('build() keeps the default element when an array factory override element is undefined', function () {
    const personFactory = createFactory<Person>(function () {
        return { name: 'John Doe', age: 42 };
    });
    const factory = createFactory<{ readonly people: readonly Person[]; }>(function () {
        return { people: personFactory.asArray({ length: 2 }) };
    });

    const actual = factory.build({ people: [ undefined, { name: 'Jane Doe' } ] });

    assert.deepStrictEqual(actual, {
        people: [ { name: 'John Doe', age: 42 }, { name: 'Jane Doe', age: 42 } ]
    });
});

test('build() does not modify the given overrides', function () {
    const overrides = { payload: { name: { 'de-DE': undefined } } };

    createPayloadFactory().build(overrides);

    assert.deepStrictEqual(overrides, { payload: { name: { 'de-DE': undefined } } });
});

test('build() returns the same result when the same overrides are reused', function () {
    const overrides = { payload: { name: { 'de-DE': undefined } } };
    const factory = createPayloadFactory();

    const first = factory.build(overrides);
    const second = factory.build(overrides);

    assert.deepStrictEqual(second, first);
});

type OptionalAddress = {
    readonly address: Address | undefined;
};

type OptionalCrew = {
    readonly crew: readonly Person[] | undefined;
};

type OptionalTags = {
    readonly tags: readonly string[] | undefined;
};

test('build() sets a nested factory property to undefined when the override is undefined', function () {
    const factory = createFactory<OptionalAddress>(function () {
        return {
            address: createFactory<Address>(function () {
                return { street: 'Main St 1', city: 'Berlin' };
            })
        };
    });

    const actual = factory.build({ address: undefined });

    assert.deepStrictEqual(actual, { address: undefined });
});

test('build() sets an array factory property to undefined when the override is undefined', function () {
    const personFactory = createFactory<Person>(function () {
        return { name: 'John Doe', age: 42 };
    });
    const factory = createFactory<OptionalCrew>(function () {
        return { crew: personFactory.asArray({ length: 2 }) };
    });

    const actual = factory.build({ crew: undefined });

    assert.deepStrictEqual(actual, { crew: undefined });
});

test('build() sets a plain array property to undefined when the override is undefined', function () {
    const factory = createFactory<OptionalTags>(function () {
        return { tags: [ 'first', 'second' ] };
    });

    const actual = factory.build({ tags: undefined });

    assert.deepStrictEqual(actual, { tags: undefined });
});
