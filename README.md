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

## Nested factories

```ts
const passengerFactory = createFactory(() => {
    return {
        name: 'Jane Doe',
        age: 32
    };
});

const tripFactory = createFactory(() => {
    return {
        driver: passengerFactory,
        passengers: passengerFactory.asArray({ length: 2 })
    };
});

const trip = tripFactory.build({
    driver: { name: 'Alex' },
    passengers: [{ age: 40 }]
});
```

## API

### `createFactory(generator)`

Create a factory from a generator function. The generator returns the canonical shape for the objects you want to build.

```ts
const personFactory = createFactory(() => {
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
const busFactory = createFactory(() => ({
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
const employeeFactory = personFactory.extend(() => ({
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

## Prior art

Objectory is heavily inspired by the excellent [`cooky-cutter`](https://github.com/skovy/cooky-cutter) and [`fishery`](https://github.com/thoughtbot/fishery) libraries — thank you for paving the way for ergonomic test data builders.
