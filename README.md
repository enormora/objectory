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

## Prior art

Objectory is heavily inspired by the excellent [`cooky-cutter`](https://github.com/skovy/cooky-cutter) and [`fishery`](https://github.com/thoughtbot/fishery) libraries — thank you for paving the way for ergonomic test data builders.
