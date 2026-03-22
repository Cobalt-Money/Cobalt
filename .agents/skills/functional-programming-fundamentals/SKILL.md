---
name: Functional Programming Fundamentals
description: Core FP concepts including pure functions, currying, composition, and pointfree style - the foundation for mastering functional TypeScript
version: 1.0.0
author: Claude
tags:
  - functional-programming
  - typescript
  - javascript
  - pure-functions
  - currying
  - composition
  - pointfree
  - fp-fundamentals
---

# Functional Programming Fundamentals

This skill covers the foundational concepts of functional programming. Master these before diving into fp-ts types like Option, Either, and Task. These concepts apply universally across functional programming languages and libraries.

## Why Functional Programming?

Functional programming provides:

- **Predictability**: Pure functions always produce the same output for the same input
- **Testability**: No mocking of global state or dependencies
- **Composability**: Small functions combine into complex behavior
- **Maintainability**: Isolated pieces are easier to understand and change
- **Parallelization**: Pure functions can safely run concurrently

---

## 1. Pure Functions and Referential Transparency

### What is a Pure Function?

A pure function has two properties:

1. **Same input, same output**: Given the same arguments, it always returns the same result
2. **No side effects**: It doesn't modify external state, perform I/O, or cause observable changes

### Why It Matters

Pure functions are:

- **Cacheable**: Results can be memoized since they're deterministic
- **Portable**: No hidden dependencies on external state
- **Testable**: No setup/teardown of global state needed
- **Parallelizable**: Safe to run concurrently without race conditions
- **Reasoned about locally**: You can understand them without knowing the entire system

### Examples

```typescript
// PURE: Same input always gives same output
const add = (x: number, y: number): number => x + y;

const greet = (name: string): string => `Hello, ${name}!`;

const head = <T>(arr: readonly T[]): T | undefined => arr[0];

// IMPURE: Depends on external state
let counter = 0;
const incrementCounter = (): number => {
  counter += 1; // Mutates external state
  return counter;
};

// IMPURE: Different output for same input
const randomNumber = (): number => Math.random();

// IMPURE: Performs I/O
const logMessage = (msg: string): void => {
  console.log(msg); // Side effect: writes to console
};

// IMPURE: Depends on mutable external state
const config = { apiUrl: "https://api.example.com" };
const getApiUrl = (): string => config.apiUrl; // Could return different values
```

### Referential Transparency

An expression is referentially transparent if it can be replaced with its value without changing program behavior.

```typescript
// Referentially transparent
const double = (x: number): number => x * 2;
const result = double(5) + double(5);
// Can be replaced with: 10 + 10 = 20

// NOT referentially transparent
let count = 0;
const incrementAndGet = (): number => {
  count += 1;
  return count;
};
const result2 = incrementAndGet() + incrementAndGet();
// Cannot replace with values: first call returns 1, second returns 2
// Result is 3, not 1 + 1 = 2
```

### Making Impure Functions Pure

```typescript
// IMPURE: Modifies input
const addItem = (arr: string[], item: string): void => {
  arr.push(item); // Mutates the original array
};

// PURE: Returns new array
const addItem = (arr: readonly string[], item: string): readonly string[] => [
  ...arr,
  item,
];

// IMPURE: Depends on Date
const getAge = (birthYear: number): number =>
  new Date().getFullYear() - birthYear;

// PURE: Accept date as parameter (dependency injection)
const getAge = (birthYear: number, currentYear: number): number =>
  currentYear - birthYear;

// IMPURE: Reads from database
const getUser = async (id: string): Promise<User> => await database.find(id);

// Functional approach: Return a description of the effect
// (This is the concept behind Task and IO in fp-ts)
const getUser =
  (id: string): Task<User> =>
  () =>
    database.find(id);
```

### Common Mistakes

```typescript
// MISTAKE 1: Mutating arguments
const sortArray = (arr: number[]): number[] => {
  return arr.sort((a, b) => a - b); // sort() mutates the original!
};

// FIX: Create a copy first
const sortArray = (arr: readonly number[]): number[] =>
  [...arr].sort((a, b) => a - b);

// MISTAKE 2: Using Date, Math.random, or other non-deterministic APIs
const generateId = (): string => `id-${Date.now()}-${Math.random()}`;

// FIX: Accept dependencies as parameters
const generateId = (timestamp: number, random: number): string =>
  `id-${timestamp}-${random}`;

// MISTAKE 3: Hidden dependencies via closure
const multiplier = 2;
const double = (x: number): number => x * multiplier; // Captures external variable

// FIX: Make dependencies explicit
const multiply =
  (factor: number) =>
  (x: number): number =>
    x * factor;
const double = multiply(2);
```

---

## 2. Currying and Partial Application

### What is Currying?

Currying transforms a function that takes multiple arguments into a sequence of functions that each take a single argument.

```typescript
// Uncurried: takes all arguments at once
const add = (x: number, y: number, z: number): number => x + y + z;
add(1, 2, 3); // 6

// Curried: takes one argument at a time
const addCurried =
  (x: number) =>
  (y: number) =>
  (z: number): number =>
    x + y + z;
addCurried(1)(2)(3); // 6
```

### Why It Matters

Currying enables:

- **Partial application**: Create specialized functions by supplying some arguments
- **Composition**: Single-argument functions compose cleanly
- **Reusability**: Create families of related functions from one definition
- **Deferred computation**: Supply arguments as they become available

### Currying in Practice

```typescript
// Curried function definition
const multiply =
  (x: number) =>
  (y: number): number =>
    x * y;

// Create specialized functions through partial application
const double = multiply(2);
const triple = multiply(3);

double(5); // 10
triple(5); // 15

// Curried comparison helpers
const greaterThan =
  (threshold: number) =>
  (value: number): boolean =>
    value > threshold;

const isAdult = greaterThan(17);
const isExpensive = greaterThan(100);

isAdult(25); // true
isExpensive(50); // false
```

### Currying for Array Methods

```typescript
// Curried filter predicate
const filterBy =
  <T>(predicate: (item: T) => boolean) =>
  (items: readonly T[]): T[] =>
    items.filter(predicate);

// Create reusable filters
const keepPositive = filterBy((n: number) => n > 0);
const keepEven = filterBy((n: number) => n % 2 === 0);

keepPositive([-1, 2, -3, 4]); // [2, 4]
keepEven([1, 2, 3, 4, 5, 6]); // [2, 4, 6]

// Curried map transformer
const mapWith =
  <A, B>(fn: (a: A) => B) =>
  (items: readonly A[]): B[] =>
    items.map(fn);

const doubleAll = mapWith((n: number) => n * 2);
const stringify = mapWith(String);

doubleAll([1, 2, 3]); // [2, 4, 6]
stringify([1, 2, 3]); // ['1', '2', '3']
```

### Partial Application vs Currying

```typescript
// Partial application: fixing some arguments of a function
const greet = (greeting: string, name: string): string =>
  `${greeting}, ${name}!`;

// Using bind for partial application (uncurried)
const sayHello = greet.bind(null, "Hello");
sayHello("Alice"); // "Hello, Alice!"

// Curried version is naturally partially applicable
const greetCurried =
  (greeting: string) =>
  (name: string): string =>
    `${greeting}, ${name}!`;

const sayHello = greetCurried("Hello");
const sayGoodbye = greetCurried("Goodbye");

sayHello("Alice"); // "Hello, Alice!"
sayGoodbye("Bob"); // "Goodbye, Bob!"
```

### Argument Order Matters

```typescript
// BAD: Data first prevents easy partial application
const map = <A, B>(arr: A[], fn: (a: A) => B): B[] => arr.map(fn);

// Must use anonymous function to specialize
const doubleAll = (arr: number[]) => map(arr, (n) => n * 2);

// GOOD: Data last enables clean partial application
const map =
  <A, B>(fn: (a: A) => B) =>
  (arr: readonly A[]): B[] =>
    arr.map(fn);

// Specialize by supplying the function
const doubleAll = map((n: number) => n * 2);
const stringify = map(String);

// This is why fp-ts uses data-last curried functions
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";

pipe(
  [1, 2, 3],
  A.map((n) => n * 2), // A.map takes fn first, returns function expecting array
  A.filter((n) => n > 2) // Same pattern
);
```

### Common Mistakes

```typescript
// MISTAKE 1: Inconsistent argument order
const process = (config: Config) => (data: Data) => (options: Options) => ...
const handle = (data: Data) => (config: Config) => ...  // Inconsistent!

// FIX: Establish convention - typically: config -> options -> data
const process = (config: Config) => (options: Options) => (data: Data) => ...
const handle = (config: Config) => (data: Data) => ...

// MISTAKE 2: Over-currying simple functions
const add = (a: number) => (b: number) => (c: number) => (d: number) =>
  a + b + c + d

add(1)(2)(3)(4)  // Tedious to call

// FIX: Curry only to the level needed for your use case
const add = (a: number, b: number, c: number, d: number) => a + b + c + d
// Or group related parameters
const addPairs = (a: number, b: number) => (c: number, d: number) =>
  a + b + c + d

// MISTAKE 3: Forgetting to curry when using with pipe
const formatPrice = (currency: string, amount: number): string =>
  `${currency}${amount.toFixed(2)}`

pipe(
  100,
  formatPrice('$', ???)  // Can't use in pipe - needs both args!
)

// FIX: Curry with data last
const formatPrice = (currency: string) => (amount: number): string =>
  `${currency}${amount.toFixed(2)}`

pipe(
  100,
  formatPrice('$')  // Works!
)  // "$100.00"
```

---

## 3. Function Composition

### What is Function Composition?

Function composition combines two or more functions to create a new function. The output of one function becomes the input of the next.

```typescript
// Mathematical composition: (f . g)(x) = f(g(x))
const compose =
  <A, B, C>(f: (b: B) => C, g: (a: A) => B) =>
  (x: A): C =>
    f(g(x));

const addOne = (x: number): number => x + 1;
const double = (x: number): number => x * 2;

const addOneThenDouble = compose(double, addOne);
addOneThenDouble(5); // double(addOne(5)) = double(6) = 12
```

### Why It Matters

Composition enables:

- **Building complex behavior from simple pieces**: Small, focused functions combine into powerful transformations
- **Reusability**: Composed functions can themselves be composed further
- **Readability**: Each step has a clear, single purpose
- **Testing**: Test small pieces in isolation, composition is mathematically guaranteed

### Pipe vs Flow (Left-to-Right Composition)

Traditional mathematical composition reads right-to-left, which can be confusing. `pipe` and `flow` provide left-to-right composition.

```typescript
import { pipe, flow } from "fp-ts/function";

const addOne = (x: number): number => x + 1;
const double = (x: number): number => x * 2;
const toString = (x: number): string => `Value: ${x}`;

// pipe: Execute immediately with a value
const result = pipe(
  5,
  addOne, // 6
  double, // 12
  toString // "Value: 12"
);

// flow: Create a reusable function
const transform = flow(addOne, double, toString);

transform(5); // "Value: 12"
transform(10); // "Value: 22"
```

### Composition with Multiple Types

```typescript
// Functions don't need matching types, just compatible connections
const parseNumber = (s: string): number => parseInt(s, 10);
const isEven = (n: number): boolean => n % 2 === 0;
const toYesNo = (b: boolean): string => (b ? "Yes" : "No");

const isInputEven = flow(
  parseNumber, // string -> number
  isEven, // number -> boolean
  toYesNo // boolean -> string
);

isInputEven("4"); // "Yes"
isInputEven("7"); // "No"
```

### Building Pipelines

```typescript
import { pipe, flow } from "fp-ts/function";

interface User {
  name: string;
  email: string;
  age: number;
}

// Small, focused functions
const getName = (user: User): string => user.name;
const toUpperCase = (s: string): string => s.toUpperCase();
const addGreeting = (name: string): string => `Hello, ${name}!`;
const addExcitement = (s: string): string => `${s}!!!`;

// Compose into a pipeline
const greetUser = flow(getName, toUpperCase, addGreeting, addExcitement);

greetUser({ name: "alice", email: "alice@example.com", age: 30 });
// "Hello, ALICE!!!!"

// Or use pipe for one-off transformations
const greeting = pipe(
  { name: "bob", email: "bob@example.com", age: 25 },
  getName,
  toUpperCase,
  addGreeting
);
// "Hello, BOB!"
```

### Associativity of Composition

Composition is associative: `(f . g) . h = f . (g . h)`

```typescript
const f = (x: number): number => x + 1;
const g = (x: number): number => x * 2;
const h = (x: number): number => x - 3;

// These are equivalent:
const way1 = flow(flow(h, g), f); // (f . g) . h
const way2 = flow(h, flow(g, f)); // f . (g . h)
const way3 = flow(h, g, f); // Direct composition

way1(10); // 15
way2(10); // 15
way3(10); // 15
```

### Common Mistakes

```typescript
// MISTAKE 1: Composing functions with incompatible types
const toString = (n: number): string => String(n);
const double = (n: number): number => n * 2;

const bad = flow(toString, double); // Type error! double expects number, gets string

// MISTAKE 2: Trying to compose multi-argument functions
const add = (a: number, b: number): number => a + b;
const double = (n: number): number => n * 2;

const bad = flow(add, double); // Won't work - add takes 2 args

// FIX: Curry first
const add =
  (a: number) =>
  (b: number): number =>
    a + b;
const addFiveThenDouble = flow(add(5), double);
addFiveThenDouble(3); // 16

// MISTAKE 3: Long unreadable pipelines
const result = pipe(
  data,
  fn1,
  fn2,
  fn3,
  fn4,
  fn5,
  fn6,
  fn7,
  fn8,
  fn9,
  fn10 // What does this do?
);

// FIX: Group related transformations and name them
const parseInput = flow(fn1, fn2, fn3);
const validateData = flow(fn4, fn5);
const formatOutput = flow(fn6, fn7, fn8, fn9, fn10);

const process = flow(parseInput, validateData, formatOutput);
```

---

## 4. Pointfree Style

### What is Pointfree Style?

Pointfree (or tacit) programming defines functions without explicitly mentioning their arguments. The "points" are the arguments.

```typescript
// Pointed: explicitly names the argument
const double = (x: number): number => x * 2;

// Pointfree: no explicit argument
const double = multiply(2); // Assuming multiply is curried
```

### Why It Matters

Pointfree style:

- **Reduces noise**: Focuses on transformations, not data shuffling
- **Encourages composition**: Works naturally with flow/pipe
- **Reveals patterns**: Makes the structure of computation visible
- **Prevents mistakes**: No variable names to misspell or shadow

### Pointfree in Practice

```typescript
import { pipe, flow } from "fp-ts/function";
import * as A from "fp-ts/Array";

// Pointed style
const getActiveUserNames = (users: User[]): string[] =>
  users.filter((user) => user.isActive).map((user) => user.name);

// Pointfree style
const isActive = (user: User): boolean => user.isActive;
const getName = (user: User): string => user.name;

const getActiveUserNames = flow(A.filter(isActive), A.map(getName));

// Both work the same:
getActiveUserNames(users);
```

### Building Pointfree Functions

```typescript
// Utility functions enable pointfree style
const prop =
  <T, K extends keyof T>(key: K) =>
  (obj: T): T[K] =>
    obj[key];
const equals =
  <T>(target: T) =>
  (value: T): boolean =>
    value === target;
const gt =
  (threshold: number) =>
  (value: number): boolean =>
    value > threshold;

interface Product {
  name: string;
  price: number;
  category: string;
}

// Pointed
const getExpensiveElectronics = (products: Product[]): Product[] =>
  products.filter((p) => p.category === "electronics" && p.price > 100);

// Pointfree with helpers
const isElectronics = flow(
  prop<Product, "category">("category"),
  equals("electronics")
);
const isExpensive = flow(prop<Product, "price">("price"), gt(100));
const both =
  <T>(f: (t: T) => boolean, g: (t: T) => boolean) =>
  (t: T): boolean =>
    f(t) && g(t);

const getExpensiveElectronics = A.filter(both(isElectronics, isExpensive));
```

### When Pointfree Helps

```typescript
// GOOD: Simple transformations
const doubleAll = A.map((n: number) => n * 2); // Semi-pointfree
const keepPositive = A.filter((n: number) => n > 0);

// BETTER: With named predicates
const double = (n: number): number => n * 2;
const isPositive = (n: number): boolean => n > 0;

const doubleAll = A.map(double); // Fully pointfree
const keepPositive = A.filter(isPositive);

// Compose them
const processNumbers = flow(keepPositive, doubleAll);
```

### When to Avoid Pointfree

```typescript
// AVOID: When it obscures meaning
const mystery = flow(
  A.map(flow(prop("x"), add(1))),
  A.filter(flow(prop("y"), gt(5))),
  A.reduce(
    0,
    flow(([acc, item]) => acc + item.z)
  )
);

// PREFER: Clear variable names when logic is complex
const incrementX = (item: Item): Item => ({ ...item, x: item.x + 1 });
const hasLargeY = (item: Item): boolean => item.y > 5;
const sumZ = (items: Item[]): number =>
  items.reduce((acc, item) => acc + item.z, 0);

const process = flow(A.map(incrementX), A.filter(hasLargeY), sumZ);

// AVOID: Pointfree gymnastics
const weird = flip(compose(flip(map), filter))(isEven)(double);

// PREFER: Readable code
const doubleEvens = flow(A.filter(isEven), A.map(double));
```

### Common Mistakes

```typescript
// MISTAKE 1: Forcing pointfree when it's unclear
const process = flow(A.map(flow(juxt([prop("a"), prop("b")]), apply(add))));

// FIX: Use pointed style when clearer
const process = A.map(({ a, b }) => a + b);

// MISTAKE 2: Missing type annotations in pointfree
const double = A.map((n) => n * 2); // n is 'unknown' without context

// FIX: Add type annotation
const double = A.map((n: number) => n * 2);

// MISTAKE 3: Mixing pointed and pointfree awkwardly
const process = (arr: number[]) =>
  flow(
    A.filter((n) => n > 0),
    A.map((n) => n * 2)
  )(arr);

// FIX: Choose one style
// Pointfree:
const process = flow(
  A.filter((n: number) => n > 0),
  A.map((n) => n * 2)
);

// Or pointed:
const process = (arr: number[]): number[] =>
  pipe(
    arr,
    A.filter((n) => n > 0),
    A.map((n) => n * 2)
  );
```

---

## 5. First-Class Functions

### What are First-Class Functions?

In JavaScript/TypeScript, functions are first-class citizens. They can be:

- Assigned to variables
- Passed as arguments
- Returned from other functions
- Stored in data structures

### Why It Matters

First-class functions enable:

- **Higher-order functions**: Functions that take or return functions
- **Callbacks**: Passing behavior as data
- **Closures**: Functions that capture their environment
- **Functional composition**: Building programs from function combinations

### Avoiding Wrapper Functions

A common anti-pattern is wrapping functions unnecessarily.

```typescript
// BAD: Unnecessary wrapper function
const numbers = [1, 2, 3, 4, 5];

// Don't do this:
numbers.map((x) => double(x));
numbers.filter((x) => isPositive(x));
numbers.forEach((x) => console.log(x));

// GOOD: Pass the function directly
numbers.map(double);
numbers.filter(isPositive);
numbers.forEach(console.log);

// The wrapper adds nothing but noise
```

### When Wrappers ARE Needed

```typescript
// NEEDED: When you need to modify arguments
const users = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
];

// getName expects a User, but we want just the index
users.map((user, index) => `${index}: ${user.name}`); // Wrapper needed

// NEEDED: When you need to ignore arguments
const fetchAll = (urls: string[]) => urls.map((url) => fetch(url)); // fetch has many optional params

// If we did urls.map(fetch), TypeScript might complain about
// the (value, index, array) signature of map's callback

// NEEDED: When changing arity
const add = (a: number, b: number): number =>
  a + b[(1, 2, 3)].map((n) => add(n, 10)); // Must wrap since map passes 3 args

// BETTER: Curry the function
const add =
  (b: number) =>
  (a: number): number =>
    a + b[(1, 2, 3)].map(add(10)); // [11, 12, 13]
```

### Higher-Order Functions

```typescript
// Function that returns a function
const multiply =
  (x: number) =>
  (y: number): number =>
    x * y;
const double = multiply(2);
const triple = multiply(3);

// Function that takes a function
const applyTwice =
  <T>(fn: (t: T) => T) =>
  (value: T): T =>
    fn(fn(value));

const addOne = (n: number): number => n + 1;
const addTwo = applyTwice(addOne);
addTwo(5); // 7

// Function that does both
const compose =
  <A, B, C>(f: (b: B) => C) =>
  (g: (a: A) => B) =>
  (x: A): C =>
    f(g(x));

const increment = (n: number): number => n + 1;
const toString = (n: number): string => String(n);

const incrementThenStringify = compose(toString)(increment);
incrementThenStringify(5); // "6"
```

### Method References

```typescript
// Be careful with method references and 'this'

// PROBLEM: Losing 'this' context
const obj = {
  value: 42,
  getValue() {
    return this.value;
  },
};

const getValue = obj.getValue;
getValue(); // undefined or error - 'this' is lost

// SOLUTION 1: Bind the method
const getValue = obj.getValue.bind(obj);
getValue(); // 42

// SOLUTION 2: Arrow function wrapper
const getValue = () => obj.getValue();
getValue(); // 42

// SOLUTION 3: Use static functions (FP approach)
const getValue = (obj: { value: number }): number => obj.value;
getValue({ value: 42 }); // 42
```

### Common Mistakes

```typescript
// MISTAKE 1: Unnecessary wrappers
const names = users.map((user) => getName(user));
// FIX:
const names = users.map(getName);

// MISTAKE 2: Wrapping to match types incorrectly
const numbers = ["1", "2", "3"].map((s) => parseInt(s)); // Seems fine...
// Actually problematic: parseInt takes (string, radix)
// map passes (value, index, array)
// parseInt('2', 1) is NaN!

// FIX: Explicit wrapper when semantics differ
const numbers = ["1", "2", "3"].map((s) => parseInt(s, 10));
// Or use Number:
const numbers = ["1", "2", "3"].map(Number);

// MISTAKE 3: Not leveraging first-class functions
const process = (items: Item[], transform: (item: Item) => Item) => {
  const result = [];
  for (const item of items) {
    result.push(transform(item));
  }
  return result;
};
// FIX: Just use map
const process = (items: Item[], transform: (item: Item) => Item) =>
  items.map(transform);

// Or even simpler - don't wrap map at all:
items.map(transform);

// MISTAKE 4: Immediately invoking returned functions
const createAdder = (x: number) => (y: number) => x + y;

// Wrong - this calls the inner function immediately with undefined
const add5 = createAdder(5)(); // NaN

// Right - store the function for later use
const add5 = createAdder(5);
add5(3); // 8
```

---

## Practical Exercises

### Exercise 1: Pure Functions

Identify what makes these functions impure and rewrite them as pure functions.

```typescript
// 1a. Makes HTTP call
const fetchUser = async (id: string) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};

// 1b. Uses current time
const isExpired = (expiryDate: Date) => {
  return expiryDate < new Date();
};

// 1c. Mutates input
const addToCart = (cart: CartItem[], item: CartItem) => {
  cart.push(item);
  return cart;
};

// 1d. Depends on global config
const config = { taxRate: 0.08 };
const calculateTotal = (subtotal: number) => {
  return subtotal * (1 + config.taxRate);
};
```

<details>
<summary>Solutions</summary>

```typescript
// 1a. Return a description of the effect (Task pattern)
type FetchUser = (id: string) => () => Promise<User>;
const fetchUser: FetchUser = (id) => () =>
  fetch(`/api/users/${id}`).then((r) => r.json());

// 1b. Accept current time as parameter
const isExpired = (expiryDate: Date, now: Date): boolean => expiryDate < now;

// 1c. Return new array instead of mutating
const addToCart = (cart: readonly CartItem[], item: CartItem): CartItem[] => [
  ...cart,
  item,
];

// 1d. Accept config as parameter
const calculateTotal =
  (taxRate: number) =>
  (subtotal: number): number =>
    subtotal * (1 + taxRate);

// Or group them
interface TaxConfig {
  taxRate: number;
}
const calculateTotal = (config: TaxConfig, subtotal: number): number =>
  subtotal * (1 + config.taxRate);
```

</details>

### Exercise 2: Currying and Partial Application

Convert these functions to curried form and create specialized versions.

```typescript
// 2a. Convert to curried form
const formatDate = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
  date: Date
): string => date.toLocaleDateString(locale, options);

// Create: formatUSDate, formatShortDate

// 2b. Convert to curried form
const clamp = (min: number, max: number, value: number): number =>
  Math.max(min, Math.min(max, value));

// Create: clampPercentage (0-100), clampByte (0-255)

// 2c. Convert to curried form with good argument order
const hasProperty = (obj: object, key: string): boolean => key in obj;

// Should work with: users.filter(hasProperty(???))
```

<details>
<summary>Solutions</summary>

```typescript
// 2a.
const formatDate =
  (locale: string) =>
  (options: Intl.DateTimeFormatOptions) =>
  (date: Date): string =>
    date.toLocaleDateString(locale, options);

const formatUSDate = formatDate("en-US");
const formatShortDate = formatUSDate({ month: "short", day: "numeric" });

formatShortDate(new Date()); // "Jan 29"

// 2b.
const clamp =
  (min: number) =>
  (max: number) =>
  (value: number): number =>
    Math.max(min, Math.min(max, value));

const clampPercentage = clamp(0)(100);
const clampByte = clamp(0)(255);

clampPercentage(150); // 100
clampByte(-10); // 0

// 2c. Reorder arguments: key first (config), object last (data)
const hasProperty =
  (key: string) =>
  (obj: object): boolean =>
    key in obj;

const hasEmail = hasProperty("email");
const hasId = hasProperty("id");

users.filter(hasEmail); // Users with email property
```

</details>

### Exercise 3: Function Composition

Build these pipelines using flow and pipe.

```typescript
import { pipe, flow } from "fp-ts/function";
import * as A from "fp-ts/Array";

interface Product {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// 3a. Create a pipeline that:
// - Filters to products in stock
// - Filters to products under $50
// - Maps to product names
// - Sorts alphabetically

// 3b. Create a reusable pipeline that:
// - Takes a string
// - Trims whitespace
// - Converts to lowercase
// - Replaces spaces with hyphens
// - Prefixes with "slug-"

// 3c. Create a number processing pipeline that:
// - Filters out negative numbers
// - Doubles each number
// - Sums all numbers
// - Returns "Total: X"
```

<details>
<summary>Solutions</summary>

```typescript
// 3a.
const getAffordableInStockNames = (products: Product[]): string[] =>
  pipe(
    products,
    A.filter((p) => p.inStock),
    A.filter((p) => p.price < 50),
    A.map((p) => p.name),
    A.sort((a, b) => a.localeCompare(b))
  );

// Or as a reusable function:
const getAffordableInStockNames = flow(
  A.filter((p: Product) => p.inStock),
  A.filter((p) => p.price < 50),
  A.map((p) => p.name),
  A.sort<string>((a, b) => a.localeCompare(b))
);

// 3b.
const slugify = flow(
  (s: string) => s.trim(),
  (s) => s.toLowerCase(),
  (s) => s.replace(/\s+/g, "-"),
  (s) => `slug-${s}`
);

slugify("  Hello World  "); // "slug-hello-world"

// 3c.
const isPositive = (n: number): boolean => n >= 0;
const double = (n: number): number => n * 2;
const sum = (numbers: number[]): number =>
  numbers.reduce((acc, n) => acc + n, 0);
const formatTotal = (n: number): string => `Total: ${n}`;

const processNumbers = flow(
  A.filter(isPositive),
  A.map(double),
  sum,
  formatTotal
);

processNumbers([-1, 2, 3, -4, 5]); // "Total: 20"
```

</details>

### Exercise 4: Pointfree Style

Refactor these functions to pointfree style where appropriate.

```typescript
// 4a. Refactor to pointfree
const getAdultNames = (users: User[]): string[] =>
  users.filter((user) => user.age >= 18).map((user) => user.name);

// 4b. Refactor to pointfree
const sumPrices = (products: Product[]): number =>
  products.reduce((total, product) => total + product.price, 0);

// 4c. Decide: Should this be pointfree or not? Why?
const formatUserForDisplay = (user: User): string =>
  `${user.name} (${user.email}) - ${user.isActive ? "Active" : "Inactive"}`;
```

<details>
<summary>Solutions</summary>

```typescript
// 4a. Good candidate for pointfree
const isAdult = (user: User): boolean => user.age >= 18;
const getName = (user: User): string => user.name;

const getAdultNames = flow(A.filter(isAdult), A.map(getName));

// 4b. Partially pointfree - the reducer is clearer pointed
const prop =
  <T, K extends keyof T>(key: K) =>
  (obj: T): T[K] =>
    obj[key];
const sum = (numbers: number[]): number => numbers.reduce((a, b) => a + b, 0);

const sumPrices = flow(A.map(prop<Product, "price">("price")), sum);

// Or keep it simple:
const getPrice = (p: Product): number => p.price;
const sumPrices = flow(A.map(getPrice), sum);

// 4c. Keep pointed - the string template is clearer with explicit access
const formatUserForDisplay = (user: User): string =>
  `${user.name} (${user.email}) - ${user.isActive ? "Active" : "Inactive"}`;

// Pointfree version would be overly complex:
const formatUserForDisplay = flow(
  (user) => [user.name, user.email, user.isActive] as const,
  ([name, email, isActive]) =>
    `${name} (${email}) - ${isActive ? "Active" : "Inactive"}`
);
// This is worse - no benefit, harder to read
```

</details>

### Exercise 5: First-Class Functions

Fix these unnecessary wrappers and improve the code.

```typescript
// 5a. Remove unnecessary wrappers
const results = items
  .map((item) => processItem(item))
  .filter((result) => isValid(result))
  .forEach((result) => logResult(result));

// 5b. Fix the parseInt issue
const numbers = ["1", "2", "3", "10", "11"].map(parseInt);
// Current result: [1, NaN, NaN, 3, 4] - Why? Fix it.

// 5c. Create a safe version of this
const handlers = {
  onClick: (e: Event) => handleClick(e),
  onSubmit: (e: Event) => handleSubmit(e),
  onHover: (e: Event) => handleHover(e),
};
// Too repetitive - can we do better?
```

<details>
<summary>Solutions</summary>

```typescript
// 5a. Pass functions directly
const results = items.map(processItem).filter(isValid).forEach(logResult);

// 5b. parseInt receives (value, index, array) from map
// parseInt('2', 1) interprets '2' as base-1 (invalid) = NaN
// parseInt('3', 2) interprets '3' as base-2 (invalid) = NaN
// parseInt('10', 3) interprets '10' as base-3 = 3
// parseInt('11', 4) interprets '11' as base-4 = 5

// Fix: Use wrapper with explicit radix
const numbers = ["1", "2", "3", "10", "11"].map((s) => parseInt(s, 10));
// Or use Number (doesn't have radix parameter)
const numbers = ["1", "2", "3", "10", "11"].map(Number);
// Result: [1, 2, 3, 10, 11]

// 5c. If handlers match the expected signature, just use them directly
const handlers = {
  onClick: handleClick,
  onSubmit: handleSubmit,
  onHover: handleHover,
};

// Or if you need to create them dynamically:
const createHandlers = <T extends Record<string, (e: Event) => void>>(
  handlerMap: T
): T => handlerMap;

const handlers = createHandlers({
  onClick: handleClick,
  onSubmit: handleSubmit,
  onHover: handleHover,
});
```

</details>

---

## Summary

| Concept               | Key Idea                                  | Benefit                           |
| --------------------- | ----------------------------------------- | --------------------------------- |
| Pure Functions        | Same input = same output, no side effects | Predictable, testable, cacheable  |
| Currying              | Transform multi-arg to single-arg chain   | Partial application, composition  |
| Composition           | Combine small functions into larger ones  | Reusability, modularity           |
| Pointfree             | Define functions without naming arguments | Less noise, reveals structure     |
| First-Class Functions | Functions as values                       | Higher-order functions, callbacks |

## Next Steps

With these fundamentals mastered, you're ready for:

1. **fp-ts Option and Either**: Functional error handling
2. **fp-ts Pipe and Flow**: Advanced composition patterns
3. **fp-ts Task and TaskEither**: Async functional programming
4. **Monads and Functors**: The algebraic structures behind fp-ts

Remember: FP is about building complex behavior from simple, composable pieces. Start small, practice composition, and gradually adopt more advanced patterns as they prove useful in your code.
