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

Every object in the generator must come from a factory: `createFactory()` for a nested object, `asArray()` or a plain
array of factories for an array of objects. Anything else is rejected when building, so a type assertion that skips a
nested factory fails loudly instead of silently dropping defaults on partial overrides.

### `createUnionFactory(variants)`

Create a factory for a union of object shapes from one factory per variant. The first entry is the variant it builds by
default.

```ts
const httpRequestFactory = createUnionFactory([ getRequestFactory, postRequestFactory ]);
```

`createFactory` rejects a union of object shapes and points here, because a factory built from a single generator has no
other variant to build, so a switch could only merge and leave the previous variant's keys behind. See
[Discriminated unions](#discriminated-unions).

### `factory.build(overrides?)`

Build a single object, optionally overriding selected properties at any depth.

```ts
const adult = personFactory.build({ age: 21 });
```

Overrides are plain values, never factories: use `anotherFactory.build()` or `anotherFactory.buildList()` when the
override values should come from another factory.

An override has to be a value the property's declared type allows, and it has to match the kind of value the generator
put there: a nested factory takes an object of overrides, an array property takes an array of them. Anything else is a
compile error, and a type assertion that gets around it fails loudly at build time rather than being dropped.

Pass `{ freeze: true }` as a second argument to deep-freeze the result, so a test that mutates a fixture fails at the
mutation instead of leaking state into a later assertion:

```ts
const frozenAdult = personFactory.build({ age: 21 }, { freeze: true });
```

### `factory.buildList({ length })`

Build an array of identical instances by repeatedly calling `build`.

```ts
const passengers = personFactory.buildList({ length: 3 });
```

When the length is a literal, the result is a tuple of exactly that length, so destructuring gives you defined elements
rather than `Person | undefined`:

```ts
const [ driver, guide ] = personFactory.buildList({ length: 2 });
```

A length that is only known at runtime, or one above 64, gives `readonly Person[]` instead. `buildList` also accepts
`freeze`, which freezes the list and every element in it.

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

For a property typed as a fixed-length tuple, the length has to agree with the tuple:

```ts
type Wheels = { readonly wheels: readonly [Wheel, Wheel]; };

createFactory<Wheels>(() => ({ wheels: wheelFactory.asArray({ length: 2 }) })); // accepted
createFactory<Wheels>(() => ({ wheels: wheelFactory.asArray({ length: 3 }) })); // rejected
```

The mismatch is reported as `Type '3' is not assignable to type '2'`. A length that is only known at runtime cannot be
checked, so it is rejected for a tuple property and accepted for an unbounded array property.

### `factory.withOverrides(overrides)`

Create a new factory that always applies the given overrides before any ad-hoc overrides.

```ts
const namedFactory = personFactory.withOverrides({ name: 'Chris' });
const namedPerson = namedFactory.build();
```

### `factory.extend(extensionGenerator)`

Derive a factory for a **different type** that adds fields the base type does not have.

```ts
type Employee = Person & {
    employeeId: string;
};

const employeeFactory = personFactory.extend<Employee>(() => ({
    employeeId: 'E-001'
}));

const employee = employeeFactory.build();
```

`extend` needs the new type spelled out, because it is the whole point of the call.

### `withOverrides` or `extend`?

Reach for `extend` only when the type changes. Everything else is `withOverrides`.

|                                           | `withOverrides` | `extend`                   |
| ----------------------------------------- | --------------- | -------------------------- |
| Changes                                   | values          | the type, by adding fields |
| Result type                               | the same shape  | the extended shape         |
| Needs a type argument                     | no              | yes                        |
| Can add a property the type does not have | no              | yes                        |
| Later layer wins                          | yes             | yes                        |

An extension may also give a base property a different default, but a value change is what `withOverrides` is for, so
prefer it. See [Composing factories](#composing-factories).

### Paths in the `buildInvalid*` methods

A `path` walks the **built** object, with a dot between segments and a number for an array index:

```ts
monitorFactory.buildInvalidWithout('request.url');
monitorFactory.buildInvalidWithChanged('request.retries', 'many');
monitorFactory.buildInvalidWithAdditional('request.timeout', 5);
feedFactory.buildInvalidWithChanged('articles.0.title', 42);
```

A path that does not resolve throws, rather than returning the object unchanged, since a typo would otherwise leave the
assertion testing nothing. The error names the whole path, not the part that failed:

```text
Cannot resolve path "request.uurl"
```

`buildInvalidWithout` and `buildInvalidWithChanged` need the whole path to resolve. `buildInvalidWithAdditional` needs only
the parent to resolve, since its job is to add something new, so it accepts a leaf that does not exist yet at any depth and
rejects one that already does. For an array path it inserts at the index, which may equal the length but not exceed it.

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
overriding a map-like nested factory with different keys yields the union of both. That is why a base factory should carry
the minimal shape that satisfies its type: then nothing ever needs removing. See
[Composing factories](#composing-factories). A union-typed value is the exception, because a union factory builds the
variant it switches to rather than merging onto the previous one. See
[Discriminated unions](#discriminated-unions).

**An override has to be a value the declared type allows.** `undefined` and `null` are accepted only where the property's
type spells them out, so `build({ name: undefined })` on a required `string` is a compile error rather than a way to build
a value the type forbids. Use the `buildInvalid*` family when a test wants exactly that.

Where the type does allow it, an explicit `undefined` sets the property to `undefined` and keeps the key, whatever kind of
value the generator put there. Leaving the property out of the overrides is what asks for the default. Inside an override
_array_, `undefined` at an index keeps that element's default instead, which is what makes
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

`extend` is for a **new type** that adds fields the base type does not have. Everything else is `withOverrides`.

A merge can add keys but never remove them, so give the base factory the **minimal shape that satisfies its type**: no
properties that are not required, and the smallest variant as a nested default. Then no test ever needs to remove
anything, and `withOverrides` is always enough.

```ts
type Product = {
    name: string;
    description: string;
    discountedPrice?: number;
};

const productFactory = createFactory<Product>(() => ({
    name: 'Widget',
    description: ''
}));
```

The generator leaves `discountedPrice` out, because nothing requires it. A test that cares about it asks for it, and one
that does not never sees the key:

```ts
const describedProductFactory = productFactory.withOverrides({ description: 'A very good widget' });
const discountedProductFactory = productFactory.withOverrides({ discountedPrice: 9 });

productFactory.build(); // { name: 'Widget', description: '' }
discountedProductFactory.build(); // { name: 'Widget', description: '', discountedPrice: 9 }
```

`extend` is for the case where the type itself changes:

```ts
type Employee = Product & {
    employeeId: string;
};

const employeeFactory = productFactory.extend<Employee>(() => ({
    employeeId: 'E-001'
}));
```

The minimal rule applies to nested factories too. Give the nested factory the empty shape and add to it, rather than
giving it a full one and trying to take away:

```ts
type Translations = Readonly<Record<string, string>>;
type Listing = { title: Translations; };

const untranslatedTitleFactory = createFactory<Translations>(() => ({}));
const listingFactory = createFactory<Listing>(() => ({ title: untranslatedTitleFactory }));

listingFactory.build(); // { title: {} }
listingFactory.withOverrides({ title: { 'de-DE': 'Titel' } }).build(); // { title: { 'de-DE': 'Titel' } }
```

Had `titleFactory` defaulted to `{ 'de-DE': 'Titel' }`, no override could get back to `{}`, because a merge cannot remove
the key. That is the shape of every problem the minimal rule avoids.

### Discriminated unions

For a union of object shapes, write one factory per variant and combine them with `createUnionFactory`. The first entry is
the variant it builds by default.

```ts
type CommonRequest = { url: string; retries: number; };
type GetRequest = CommonRequest & { method: 'GET'; };
type PostRequest = CommonRequest & { method: 'POST'; body: string; };
type HttpRequest = GetRequest | PostRequest;

const getRequestFactory = createFactory<GetRequest>(() => ({
    method: 'GET',
    url: 'https://example.com',
    retries: 3
}));

const postRequestFactory = createFactory<PostRequest>(() => ({
    method: 'POST',
    url: 'https://example.com',
    retries: 3,
    body: '{}'
}));

const httpRequestFactory = createUnionFactory([ getRequestFactory, postRequestFactory ]);
```

A property every variant has is overridable as usual. Naming the discriminator switches variant, and the target variant is
built from its own factory, so nothing of the previous one is left behind:

```ts
httpRequestFactory.build();
// { method: 'GET', url: 'https://example.com', retries: 3 }

httpRequestFactory.build({ retries: 0 });
// { method: 'GET', url: 'https://example.com', retries: 0 }

httpRequestFactory.build({ method: 'POST' });
// { method: 'POST', url: 'https://example.com', retries: 3, body: '{}' }

httpRequestFactory.build({ method: 'POST', body: '{"a":1}' });
// { method: 'POST', url: 'https://example.com', retries: 3, body: '{"a":1}' }
```

You only have to name the fields you care about. The rest come from the variant you switched to, not from the one you
switched away from.

An override that does not say which variant it means is rejected, because nothing can decide it:

```ts
httpRequestFactory.build({ body: '{}' }); // rejected, which variant?
httpRequestFactory.build({ method: 'GET', body: '{}' }); // rejected, a GET has no body
httpRequestFactory.build({ method: 'PATCH' }); // rejected, no such variant
```

To share the fields common to every variant, build a factory for the common part and derive each variant with `extend`:

```ts
const commonRequestFactory = createFactory<CommonRequest>(() => ({
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

A union factory works as a nested value and inside `asArray`, and the same rules apply:

```ts
type Monitor = { name: string; request: HttpRequest; };

const monitorFactory = createFactory<Monitor>(() => ({
    name: 'monitor',
    request: httpRequestFactory
}));

monitorFactory.build({ request: { method: 'POST' } });
// { name: 'monitor', request: { method: 'POST', url: 'https://example.com', retries: 3, body: '{}' } }
```

A single-variant factory is also valid there when a fixture wants that variant pinned. It cannot switch, because only a
union factory knows the other variants.

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

**`not assignable to parameter of type '() => "objectory: this shape is a union of object types, use createUnionFactory() instead"'`**

`createFactory` was given a union of object shapes. Write one factory per variant and combine them with
[`createUnionFactory`](#createunionfactoryvariants).

**`Type '3' is not assignable to type '2'` on an `ArrayFactoryValue`**

`asArray` was given a length that does not match a fixed-length tuple property. The two numbers are the length you asked
for and the length the tuple has.

**`Invalid override at "…": a nested factory takes an object of overrides, received …`**

An override did not match the kind of value the generator put there. A nested factory takes an object, an array property
takes an array. The path names the property, counting from the object you called `build` on.

**`Invalid override for a union factory: no registered variant matches it`**

An override for a union factory named keys, or a discriminator value, that no registered variant has. Either name the
discriminator of a variant that is registered, or add the missing variant to `createUnionFactory`.

## Prior art

Objectory is heavily inspired by the excellent [`cooky-cutter`](https://github.com/skovy/cooky-cutter) and [`fishery`](https://github.com/thoughtbot/fishery) libraries — thank you for paving the way for ergonomic test data builders.
