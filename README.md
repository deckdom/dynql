<h1 align="center">DynQL</h1>

<span align="center">

[![Build Status](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Factions-badge.atrox.dev%2Fdeckdom%2Fdynql%2Fbadge%3Fref%3Dmaster&style=for-the-badge)](https://github.com/deckdom/dynql/actions)
[![npm Version](https://img.shields.io/npm/v/dynql.svg?style=for-the-badge)](https://www.npmjs.com/package/dynql)
[![npm bundle size (minified)](https://img.shields.io/bundlephobia/min/dynql.svg?style=for-the-badge)](https://www.npmjs.com/package/dynql)
[![Maintainability](https://img.shields.io/codeclimate/maintainability-percentage/deckdom/dynql.svg?style=for-the-badge)](https://codeclimate.com/github/deckdom/dynql)
[![Test Coverage](https://img.shields.io/codeclimate/coverage/deckdom/dynql.svg?style=for-the-badge)](https://codeclimate.com/github/deckdom/dynql)
[![npm License](https://img.shields.io/npm/l/dynql.svg?style=for-the-badge)](https://spdx.org/licenses/MIT.html)

</span>

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

store.registerFragment("simple", 
`fragment simple on Something {
  field1
  field2
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
[ "fragment simple on Something {
  field1
  field2
}" ]
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