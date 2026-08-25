import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory, type ObjectoryFactory } from './main.ts';

type Person = {
    readonly name: string;
    readonly age: number;
};

type Bus = {
    readonly passengers: readonly Person[];
};

function createPersonFactory(): ObjectoryFactory<Person> {
    return createFactory<Person>(function () {
        return { name: 'John Doe', age: 42 };
    });
}

test('build() shrinks an array factory default to an empty override array', function () {
    const factory = createFactory<Bus>(function () {
        return { passengers: createPersonFactory().asArray({ length: 2 }) };
    });

    const actual = factory.build({ passengers: [] });

    assert.deepStrictEqual(actual, { passengers: [] });
});

test('build() shrinks an array factory default to a shorter override array', function () {
    const factory = createFactory<Bus>(function () {
        return { passengers: createPersonFactory().asArray({ length: 3 }) };
    });

    const actual = factory.build({ passengers: [ { name: 'Jane Doe' } ] });

    assert.deepStrictEqual(actual, { passengers: [ { name: 'Jane Doe', age: 42 } ] });
});

test('build() grows an array factory default with a longer override array', function () {
    const factory = createFactory<Bus>(function () {
        return { passengers: createPersonFactory().asArray({ length: 1 }) };
    });

    const actual = factory.build({ passengers: [ undefined, { name: 'Jane Doe' } ] });

    assert.deepStrictEqual(actual, {
        passengers: [ { name: 'John Doe', age: 42 }, { name: 'Jane Doe', age: 42 } ]
    });
});

type Localization = {
    readonly language: string;
    readonly localizedText: string;
};

type Product = {
    readonly id: string;
    readonly localizations: readonly Localization[];
};

function createLocalizationFactory(language: string, localizedText: string): ObjectoryFactory<Localization> {
    return createFactory<Localization>(function () {
        return { language, localizedText };
    });
}

function createProductFactory(): ObjectoryFactory<Product> {
    return createFactory<Product>(function () {
        return {
            id: 'product-1',
            localizations: [
                createLocalizationFactory('sv', 'localized-swedish-text'),
                createLocalizationFactory('de', 'localized-german-text'),
                createLocalizationFactory('nl', 'localized-dutch-text')
            ]
        };
    });
}

test('build() resolves a plain array of factories with differing defaults', function () {
    const actual = createProductFactory().build();

    assert.deepStrictEqual(actual, {
        id: 'product-1',
        localizations: [
            { language: 'sv', localizedText: 'localized-swedish-text' },
            { language: 'de', localizedText: 'localized-german-text' },
            { language: 'nl', localizedText: 'localized-dutch-text' }
        ]
    });
});

test('build() overrides a single element of a plain array of factories', function () {
    const actual = createProductFactory().build({
        localizations: [ undefined, { localizedText: 'replaced-german-text' } ]
    });

    assert.deepStrictEqual(actual, {
        id: 'product-1',
        localizations: [
            { language: 'sv', localizedText: 'localized-swedish-text' },
            { language: 'de', localizedText: 'replaced-german-text' }
        ]
    });
});

test('build() grows a plain array of factories with a longer override array', function () {
    const actual = createProductFactory().build({
        localizations: [ undefined, undefined, undefined, { language: 'fi', localizedText: 'localized-finnish-text' } ]
    });

    assert.deepStrictEqual(actual, {
        id: 'product-1',
        localizations: [
            { language: 'sv', localizedText: 'localized-swedish-text' },
            { language: 'de', localizedText: 'localized-german-text' },
            { language: 'nl', localizedText: 'localized-dutch-text' },
            { language: 'fi', localizedText: 'localized-finnish-text' }
        ]
    });
});
