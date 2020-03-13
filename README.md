# DynQL

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