<h1 align="center">DynQL</h1>

<p align="center">
<a href="https://github.com/deckdom/dynql/actions"><img src="https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fdeckdom%2Fdynql%2Fbadge%3Fref%3Dmaster&style=for-the-badge" alt="Build Status"/></a>
<a href="https://www.npmjs.com/package/dynql"><img src="https://img.shields.io/npm/v/dynql.svg?style=for-the-badge" alt="npm Version"/></a>
<a href="https://www.npmjs.com/package/dynql"><img src="https://img.shields.io/bundlephobia/min/dynql.svg?style=for-the-badge" alt="npm bundle size (minified)"/></a>
<a href="https://codeclimate.com/github/deckdom/dynql"><img src="https://img.shields.io/codeclimate/maintainability-percentage/deckdom/dynql.svg?style=for-the-badge" alt="Maintainability"/></a>
<a href="https://codeclimate.com/github/deckdom/dynql"><img src="https://img.shields.io/codeclimate/coverage/deckdom/dynql.svg?style=for-the-badge" alt="Test Coverage"/></a>
<a href="https://spdx.org/licenses/MIT.html"><img src="https://img.shields.io/npm/l/dynql.svg?style=for-the-badge" alt="npm License"/></a>
</p>

A simple library to dynamically resolve GraphQL Fragments

## Installation

```sh
npm i dynql
# Or Yarn
yarn add dynql
```

## Usage

Simply create a new store instance, save fragments into it and resolve them from your query:

```ts
import { FragmentStore } from 'dynql';

const store = new FragmentStore();

// Manually register your fragment
store.registerFragment("simple", `fragment simple on Something {
  field1
  field2
  ...some_other
  field3 {
    ...yet_another
  }
}`);

// Automatically registers all fragments
store.autoRegisterFragment(`
fragment some_other on CoolElement {
  value1
  value2
  nested {
    ...yet_another
  }
}

fragment yet_another on AdvancedValue {
  hell_world
}
`);

// Resolve the required fragments for the query
const resolvedFragments = store.resolve(`
query {
  someResolver {
      anElement {
          ...simple
      }
  }   
}`);

// resolvedFragments
[`fragment simple on Something {
  field1
  field2
}`, `fragment some_other on CoolElement {
  value1
  value2
  nested {
    ...yet_another
  }
}`, `fragment yet_another on AdvancedValue {
  hell_world
}`]
```

### Nested Example

In this example, it shows how fragments can reference other fragments which are in the store which also get resolved dynamically.

```ts
store.registerFragment("objectA",
`fragment objectA on Something {
  field1
  field2
  ...objectB
}`);

store.registerFragment("objectB",
`fragment objectB on SomethingElse {
  field3
  field4
}`);

store.registerFragment("objectC",
`fragment objectC on Unused {
  unusedField
  unusedFragment   
}`);

store.resolve(`
query {
  someResolver {
      anElement {
          ...simple
      }
  }   
}`);

// Returns
[
    "fragment objectA on Something {
      field1
      field2
      ...objectB
    }",
    "fragment objectB on SomethingElse {
      field3
      field4
    }"
]
```