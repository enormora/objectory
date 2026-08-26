import { test } from 'node:test';
import assert from 'node:assert';
import { createFactory, type ObjectoryFactory } from './main.ts';

test('withOverrides() returns a factory with updated defaults', function () {
    const factory = createFactory<{ readonly foo: string; readonly count: number; }>(function () {
        return {
            foo: 'base',
            count: 1
        };
    });

    const customized = factory.withOverrides({ count: 5 });

    assert.deepStrictEqual(factory.build(), { foo: 'base', count: 1 });
    assert.deepStrictEqual(customized.build(), { foo: 'base', count: 5 });
});

test('withOverrides() merges nested factory overrides', function () {
    const factory = createFactory<{ readonly nested: { readonly value: string; }; }>(function () {
        return {
            nested: createFactory(function () {
                return { value: 'alpha' };
            })
        };
    });

    const customized = factory.withOverrides({ nested: { value: 'beta' } });

    assert.deepStrictEqual(factory.build(), { nested: { value: 'alpha' } });
    assert.deepStrictEqual(customized.build(), { nested: { value: 'beta' } });
});

test('withOverrides() can be chained and still accepts build overrides', function () {
    const factory = createFactory<{ readonly foo: string; readonly bar: string; }>(function () {
        return {
            foo: 'one',
            bar: 'two'
        };
    });

    const customized = factory.withOverrides({ foo: 'custom' }).withOverrides({ bar: 'default' });

    const actual = customized.build({ bar: 'override' });

    assert.deepStrictEqual(actual, { foo: 'custom', bar: 'override' });
});

type LayeredBase = { readonly label: string; readonly count: number; };
type LayeredExtended = LayeredBase & { readonly extra: string; };

function createLayeredBaseFactory(): ObjectoryFactory<LayeredBase> {
    return createFactory<LayeredBase>(function () {
        return { label: 'base', count: 1 };
    });
}

test('withOverrides() applied before extend() keeps its value', function () {
    const factory = createLayeredBaseFactory()
        .withOverrides({ label: 'overridden' })
        .extend<LayeredExtended>(function () {
            return { extra: 'x' };
        });

    assert.deepStrictEqual(factory.build(), { label: 'overridden', count: 1, extra: 'x' });
});

test('withOverrides() applied after extend() keeps its value', function () {
    const factory = createLayeredBaseFactory()
        .extend<LayeredExtended>(function () {
            return { extra: 'x' };
        })
        .withOverrides({ label: 'overridden' });

    assert.deepStrictEqual(factory.build(), { label: 'overridden', count: 1, extra: 'x' });
});

test('an override wins over an extension that sets the same property, whatever the order', function () {
    const overridesFirst = createLayeredBaseFactory()
        .withOverrides({ label: 'from overrides' })
        .extend<LayeredExtended>(function () {
            return { extra: 'x', label: 'from extension' };
        });
    const extensionFirst = createLayeredBaseFactory()
        .extend<LayeredExtended>(function () {
            return { extra: 'x', label: 'from extension' };
        })
        .withOverrides({ label: 'from overrides' });

    assert.strictEqual(overridesFirst.build().label, 'from overrides');
    assert.strictEqual(extensionFirst.build().label, 'from overrides');
});

test('the later of two withOverrides() layers wins', function () {
    const factory = createLayeredBaseFactory()
        .withOverrides({ label: 'first' })
        .withOverrides({ label: 'second' });

    assert.strictEqual(factory.build().label, 'second');
});
