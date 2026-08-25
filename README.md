# Objectory

Objectory is a library for building nested object factories with strong typing. Use it to keep your test data builders consistent while still letting each test reshape the parts it cares about.

## Installation

```bash
npm install -D @enormora/objectory
```

## Quick start

```ts
import { createFactory } from '@enormora/objectory';

type Person = {
    name: string;
    age: number;
};

const personFactory = createFactory<Person>(() => {
    return {
        name: 'Jane Doe',
        age: 32
    };
});

const jane = personFactory.build();
const olderJane = personFactory.build({ age: 45 });
const crew = personFactory.buildList({ length: 3 });
```

Objectory handles deeply nested factories, arrays, and targeted overrides so you can focus on the behaviours under test instead of wiring up objects.

## API

### `createFactory(generator)`

Create a factory from a generator function. The generator returns the canonical shape for the objects you want to build.

```ts
const personFactory = createFactory<Person>(() => {
    return {
        name: 'Jane Doe',
        age: 32
    };
});
```

### `factory.build(overrides?)`

Build a single object, optionally overriding selected properties at any depth.

```ts
const adult = personFactory.build({ age: 21 });
```

### `factory.buildList({ length })`

Build an array of identical instances by repeatedly calling `build`.

```ts
const passengers = personFactory.buildList({ length: 3 });
```

`buildList` returns built objects, not factories, so its result cannot be used as an array property inside a generator. Use
`asArray` or a plain array of factories there.

### `factory.asArray({ length })`

Expose the factory as an array factory so it can be embedded in other factories.

```ts
type Bus = {
    passengers: readonly Person[];
};

const busFactory = createFactory<Bus>(() => ({
    passengers: personFactory.asArray({ length: 2 })
}));

const bus = busFactory.build();
```

Every element comes from the same factory, so every element is identical. When the elements should differ, use a plain array
of factories instead. Its length is the number of elements:

```ts
const busFactory = createFactory<Bus>(() => ({
    passengers: [
        personFactory.withOverrides({ name: 'Jane' }),
        personFactory.withOverrides({ name: 'Chris' })
    ]
}));
```

Array elements must be factories. A plain array of already built objects is rejected, for the same reason a nested object
must be a factory rather than a plain literal.

### `factory.withOverrides(overrides)`

Create a new factory that always applies the given overrides before any ad-hoc overrides.

```ts
const namedFactory = personFactory.withOverrides({ name: 'Chris' });
const namedPerson = namedFactory.build();
```

### `factory.extend(extensionGenerator)`

Derive a new factory by merging the base shape with additional fields from an extension generator.

```ts
type Employee = Person & {
    employeeId: string;
};

const employeeFactory = personFactory.extend<Employee>(() => ({
    employeeId: 'E-001'
}));

const employee = employeeFactory.build();
```

All three `buildInvalid*` methods throw when `path` does not resolve against the built object, rather than returning it
unchanged. A typo would otherwise leave the assertion testing nothing.

### `factory.buildInvalidWithout(path)`

Build an object with the property at `path` removed, useful for negative tests.

```ts
const missingName = personFactory.buildInvalidWithout('name');
```

### `factory.buildInvalidWithChanged(path, value)`

Build an object with the property at `path` replaced by `value`, even if it breaks the schema.

```ts
const invalidAge = personFactory.buildInvalidWithChanged('age', 'unknown');
```

### `factory.buildInvalidWithAdditional(path, value)`

Build an object with an additional property added at `path`, useful for testing schemas that reject unknown fields. Throws if a property already exists at the given object path; for array paths, the value is splice-inserted at the given index.

```ts
const withExtra = personFactory.buildInvalidWithAdditional('nickname', 'Jay');
```

## Override semantics

What an override does depends on the kind of value the generator put in that property.

| Generator value             | Plain override                                 | Override array length |
| --------------------------- | ---------------------------------------------- | --------------------- |
| Primitive, `Date`, function | replaces it                                    | not applicable        |
| Nested factory              | merges into the factory's defaults             | not applicable        |
| `asArray({ length })`       | merges into each element's defaults, per index | wins                  |
| Plain array of factories    | merges into each element's defaults, per index | wins                  |
| Plain array of values       | replaces per index                             | wins                  |

Two consequences are worth knowing before you rely on them.

**A merge can add keys, but it can never remove them.** Overriding a nested factory with `{}` changes nothing, and
overriding a map-like nested factory with different keys yields the union of both. When you need different nested data
rather than a few different fields, compose a different factory instead of overriding. See
[Composing factories](#composing-factories).

**An explicit `undefined` always sets the property to `undefined`**, whatever kind of value the generator put there, and
keeps the key. Leaving the property out of the overrides is what asks for the default:

```ts
const busFactory = createFactory<Bus>(() => ({
    passengers: personFactory.asArray({ length: 2 })
}));

busFactory.build({ passengers: undefined }); // { passengers: undefined }
busFactory.build({}); // two passengers, from the defaults
```

Overrides accept `undefined` for every property, including properties whose type does not include it, so this is also a
way to build a value the declared type does not allow. That is useful for a test that wants exactly that, but nothing
checks it for you.

Inside an override _array_, `undefined` at an index keeps that element's default instead, which is what makes
`[ undefined, { name: 'Jane' } ]` a way to override only the second element.

An override array's length always wins, so an explicit `[]` empties the property:

```ts
busFactory.build({ passengers: [] }); // no passengers
busFactory.build({ passengers: [ { age: 20 } ] }); // exactly one passenger
```

Earlier versions took the longer of the two lengths, so an explicit `[]` was a no-op and a test meaning to assert
something about an empty list quietly asserted it about a two-element list. If you relied on a short override array being
padded out with defaults, list the elements you want explicitly.

## Recipes

Compositional patterns built from the methods above.

### Nested factories

```ts
type Passenger = {
    name: string;
    age: number;
};

const passengerFactory = createFactory<Passenger>(() => {
    return {
        name: 'Jane Doe',
        age: 32
    };
});

type Trip = {
    driver: Passenger;
    passengers: readonly Passenger[];
};

const tripFactory = createFactory<Trip>(() => {
    return {
        driver: passengerFactory,
        passengers: passengerFactory.asArray({ length: 2 })
    };
});

const trip = tripFactory.build({
    driver: { name: 'Alex' },
    passengers: [ { age: 40 } ]
});
```

### Composing factories

Prefer a factory that carries the minimum needed to satisfy its type, then build the fuller cases on top of it with
`extend`. Overrides then only have to express what a single test cares about.

```ts
type Product = {
    name: string;
    description: string;
};

const productFactory = createFactory<Product>(() => ({
    name: 'Widget',
    description: ''
}));

const describedProductFactory = productFactory.extend<Product>(() => ({
    description: 'A very good widget'
}));
```

This is also the answer whenever a merge cannot express what you need, because a merge never removes keys. `extend` can
replace a nested factory outright, which an override cannot:

```ts
type Translations = Readonly<Record<string, string>>;
type Listing = { title: Translations; };

const titleFactory = createFactory<Translations>(() => ({ 'de-DE': 'Titel' }));
const untranslatedTitleFactory = createFactory<Translations>(() => ({}));

const listingFactory = createFactory<Listing>(() => ({ title: titleFactory }));

// merging cannot get rid of the 'de-DE' key
listingFactory.build({ title: {} }); // { title: { 'de-DE': 'Titel' } }

// composing a different factory can
const untranslatedListingFactory = listingFactory.extend<Listing>(() => ({
    title: untranslatedTitleFactory
}));
untranslatedListingFactory.build(); // { title: {} }
```

### Discriminated unions

For a union of object types distinguished by a discriminator, there are two complementary shapes. Which one you reach for depends on whether a given test wants a fixed variant or any member of the union.

Build a factory fixed to one variant by typing it to that variant. The discriminator is an ordinary field with a literal default:

```ts
type GetRequest = { method: 'GET'; url: string; retries: number; };
type PostRequest = { method: 'POST'; url: string; retries: number; body: string; };
type HttpRequest = GetRequest | PostRequest;

const getRequestFactory = createFactory<GetRequest>(() => ({
    method: 'GET',
    url: 'https://example.com',
    retries: 3
}));
```

Build a factory for the whole union by typing it to the union. The generator returns any one variant, and `build()` returns the union type. Overrides can reshape the built variant but cannot switch it to another one:

```ts
const httpRequestFactory = createFactory<HttpRequest>(() => ({
    method: 'GET',
    url: 'https://example.com',
    retries: 3
}));
```

To share the fields common to every variant, build a factory for the common part and derive each variant with `extend`, adding that variant's discriminator and extra fields. The variants reuse the common defaults, and nested shared factories stay overridable at any depth:

```ts
type CommonFields = { url: string; retries: number; };
type GetRequest = CommonFields & { method: 'GET'; };
type PostRequest = CommonFields & { method: 'POST'; body: string; };

const commonRequestFactory = createFactory<CommonFields>(() => ({
    url: 'https://example.com',
    retries: 3
}));

const getRequestFactory = commonRequestFactory.extend<GetRequest>(() => ({ method: 'GET' }));
const postRequestFactory = commonRequestFactory.extend<PostRequest>(() => ({
    method: 'POST',
    body: '{}'
}));
```

#### A union-typed property

When the union sits in a _property_ rather than at the root, the nested factory has to pick one variant as its default.
Overriding that property merges, and a merge never removes keys, so switching to another variant leaves the fields of the
first one behind:

```ts
type NoData =
    | { notifyNoData: false; }
    | { notifyNoData: true; timeframeMinutes: number; };

type Monitor = { name: string; noData: NoData; };

const notifyingFactory = createFactory<Extract<NoData, { notifyNoData: true; }>>(() => ({
    notifyNoData: true,
    timeframeMinutes: 5
}));

const monitorFactory = createFactory<Monitor>(() => ({
    name: 'monitor',
    noData: notifyingFactory
}));

monitorFactory.build({ noData: { notifyNoData: false } });
// { name: 'monitor', noData: { notifyNoData: false, timeframeMinutes: 5 } }
//                            ^ timeframeMinutes survived, and this is not a NoData
```

Compose a factory per variant instead of overriding across variants:

```ts
const silentFactory = createFactory<Extract<NoData, { notifyNoData: false; }>>(() => ({
    notifyNoData: false
}));

const silentMonitorFactory = monitorFactory.extend<Monitor>(() => ({ noData: silentFactory }));

silentMonitorFactory.build();
// { name: 'monitor', noData: { notifyNoData: false } }
```

Overriding _within_ the variant the factory already builds is fine, because no keys need removing:

```ts
monitorFactory.build({ noData: { timeframeMinutes: 30 } });
// { name: 'monitor', noData: { notifyNoData: true, timeframeMinutes: 30 } }
```

## Troubleshooting

**`is missing the following properties from type 'ObjectoryFactory<...>': build, asArray, withOverrides, extend`**

A generator returned a plain object where a nested factory belongs. Every nested object is a factory, so wrap it:

```ts
createFactory<Car>(() => ({ driver: { name: 'Jane', age: 32 } })); // rejected
createFactory<Car>(() => ({ driver: personFactory })); // accepted
```

The same message with `Type 'Person' is missing ...` inside a `readonly ObjectoryFactory<...>[]` means an array property
was given already built objects rather than factories. `buildList` produces built objects, so use `asArray` or a plain
array of factories.

## Prior art

Objectory is heavily inspired by the excellent [`cooky-cutter`](https://github.com/skovy/cooky-cutter) and [`fishery`](https://github.com/thoughtbot/fishery) libraries — thank you for paving the way for ergonomic test data builders.
