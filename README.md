# Fage

> Declarative sequential async middleware runner

Fage is an ultra-lightweight wrapper and function runner that enables **composing apps as middleware** and **decouples the application _interface_ from its _implementation_.**

```js
const myFageLogin = {
  path: 'userLogin',
  fns: [checkAuth, rateLimit, ctx => customLoginLogic(ctx.input)]
}

// Wire up Fage app
const app = Fage([myFageLogin, ...])

// Call it from your interface
express.post('/login', myMiddleware, (req, res) => app.userLogin(req.body, req.state.CustomAppData))
```

Using Fage (jump to the [example](#example)):

- **Create logic blocks**:  
Define objects with a unique `path` name and an array of "[middleware](#middleware)" functions `fns`. These objects are your "[method blocks](#method-blocks)".

- **Package into functions**:  
These method blocks are bundled by `Fage(arrayOfMethodBlocks)` into a flat object of _runnable functions_, keyed by each method blocks's `path` value. Each function is a reducer that runs the middleware `fns`, passing each fn: a) the `ctx` [context object](#ctx-context-object) and b) the `output` of each call to the next function in the chain, returning a Promise that resolves as the final middleware output.

- **Run functions**:  
Once bundled, functions are called with two params: a) untrusted data from user `input`, and b) trusted app/environment data `meta`. These become available on the [`ctx` context](#ctx-context-object) passed to Fage [method block](#method-blocks) fns.

Fage functions can be invoked by independent _interfaces_ that map their interface calls, inputs and application data to named Fage functions. This decouples the interface from the underlying app logic, which itself can be composed as middleware. Your app becomes a collection of lightweight objects that can be plugged into any interface (including HTTP, sockets, RPC, CLI etc).

> Fage (fayj) - a phage is used to carry code for execution. It's also a **f**-unction c-**age**.


---

Getting Started:
- [**Install**](#install): getting Fage into your project
- [**Overview**](#overview): the Fage basics

Usage:
- [**Using Fage Methods**](#using-fage-methods)
- [**Method Blocks**](#method-blocks)
- [**Middleware**](#middleware)
- [**`ctx` context object**](#ctx-context-object)

API:
- [**API**](#api)

---


## Install
Fage is a private repository for which you will require a Github token.

> TODO: Insert a howto for this

At which point you can install from Github as follows:

```bash
$ npm install likelytheory/fage
```


## Overview

#### Write a Fage method block

```js
const {nyanSay} = require('./mycode')

// Example middleware function
const myIsAuthedMiddleware = (ctx) => {
  if (!ctx.meta.loggedIn) throw new Error('Not Logged In')
}

// Example Fage method block:
modules.export = {
  path: 'nyanExclaim',
  fns: [
    myIsAuthedMiddleware, // throws if ctx.meta.loggedIn not set
    (ctx) => ctx.input + '!@#!!',
    (ctx, output) => (nyanSay(output), output) // returns output
  ]
}
```

#### Package into functions
Fage bundles this app logic into a flat object of _runnable functions_ keyed by the `path`:

```js
const Fage = require('fage')
const nyanExclaim = require('./exampleAbove')

const app = Fage([nyanExclaim])
// -> {nyanExclaim: Function}
```

#### Run functions
Functions can then be run by passing `fn(input, meta)`, where `input` is the untrusted, raw user-input and `meta` is an object comprising any system defined information (such as authentication details, environment data, etc).

```js
await app.nyanExclaim('meow meow', {loggedIn: true})
// OR: await Fage.run(nyanExclaim, 'meow meow', {loggedIn: true})
//                    ,---/V\     ________________
// ,*'^`*.,*'^`*.    ~|__(o.o) __/ meow meow!@#!! \
// .,*'^`*.,*'^`*.,*'  UU  UU  `------------------`
// -> "meow meow!@#!!"
```

In the example above, failing to provide a `loggedIn` value on the `meta` parameter will trigger an Auth error in our method block:

```js
await app.nyanExclaim('meow meow')
// -> Error: Not Logged In
```

#### Why this is cool
App logic can be composed as middleware. The bundled app is decoupled from any interface (making it very testable, and easy to reason about). This also allows you define arbitrary API maps for your interfaces, completely independently of your app logic. It gets even better when you use these maps to create generated interfaces (but the principle is still powerful even if you are manually wiring).



## Using Fage methods

Once you have setup a Fage Application Object:

```js
const app = Fage(methodBlocks)
```

Invoke named `path` functions with `app.<path>(input, meta)` params, which returns a `Promise` that resolves as the output result or rejects as any thrown Error.

Fage Application Objects expose Fage methods that expect to be called with two "channel" parameters (_both optional_):

```js
app.method(input, meta)
// -> Promise
```

**Fage is intended to be invoked by a separate and independent _interface_** (read more about interfaces here).

These interfaces should accept user input of some kind (`input`), attach extra system or app derived data (`meta`), and map their calls to an appropriate Fage method.

It's the interface's job to _separate the data channels for Fage_:

- `input` is any input data provided by the end user.
- `meta` is any data that your _interface_ sets (ie. trusted data)

**For example**: an HTTP interface might listen for a `POST /hello` - when called (with say `"world"`) it may first do auth token validation and set a few environment system values eg. `{userId: null, turbo: false}` - the `meta` channel is the mechanism for passing this application environment data to Fage. The interface would then call:

```js
await app.hello("world", {userId: null, turbo: false})
// -> "hello world!"
```

The _interface_ would then utilise the output of the Fage method (`"hello world!`") however it wanted.


## Method Blocks

A Fage **Method Block** is a simple object, mainly comprising a `path` to uniquely identify the block and an array of `fns` that are the middleware functions.

- `path`: **String**: Uniquely identifies the method block
- `fns`: **Array[Functions]**: An array of Fage Middleware
- `ref`: **Object** _(Optional)_: Custom block data for use by middleware
- `onError`: **Function(ctx, err)** _(Optional)_: Hook to observe errors thrown by middleware

**Notes for `onError`**
In general, errors should be handled by your **interface layer** and not by Fage itself (which should simply generate errors to be handled).

However, the _optional_ `onError` hook is a function that is invoked if the method block throws an Error, and can be used to 'observe' (but not obstruct or 'catch') middlware failure states. The onError function receives two parameters: the `ctx` context object and the thrown `Error` object, eg. `(ctx, err)`.

Note that `onError` functions are run synchronously, any return values are _discarded_ and any exceptions in the hook are silently suppressed, so only the original error is propagated.

**Example Method Block**
For example (providing a bunch of code and middleware imported from elsewhere):

```js
const example = {
  path: 'superHacker',    // -> app.superHacker(input, meta)
  ref: {
    model: inputModels.targetAndIntent, // Some custom model
    nonsense: 'oh yes!', // Some farcical key
    scopes: ['admin']    // Specify admin scopes
  },
  onError: (ctx, err) => errorLogHandler(err),
  fns: [
    mw.ensure.isAuthed,   // Checks ctx.meta.user
    mw.ensure.hasScopes,  // Checks ctx.ref.scopes
    mw.skematic.validate, // Checks ctx.input on ctx.ref.model
    (ctx) => console.log(ctx.ref.nonsense), // "oh yes!"
    (ctx) => hackThePlanet(ctx.input) // row, row, row ur boat
  ]
}
```


## Middleware

Fage middleware are functions that accept two parameters `mw(ctx, output)`, and optionally return an output. These middleware are what Fage chains together, passing the output of each previous function into the next.

Middleware functions can be either **synchronous** by immediately returning a value, or can be async by returning a **Promise**.

Fage waits on the output of each middleware before invoking the next in the chain.

**Errors should throw** and should handled at the _interface_ level - Fage methods should throw a descriptive Error object and leave the interface to determine how to handle this.

```js
const checkMw = (ctx) => {
  if (ctx.input === 'harold') throw new Error('No harolds!')
}
const sleepMw = (ctx) => sleepFor('30m').then(() => 'morning')
const logMw = (ctx, out) => console.log(`${out} ${ctx.input}!`)

const blk = {path: 'sleepy', fns: [checkMw, sleepMw, logMw]}
const app = Fage([blk])

await app.sleepy('harold')
// -> Error: No harolds!

await app.sleepy('jenny')
// (...after 30 mins...)
// "morning jenny!" (console.log output)
// -> undefined
```

> **Important note**: The example above _final_ return value was `undefined` - this is because the last middleware (`logMw`) returned a `console.log`, the return value of which is `undefined`.
>
> **Pay close attention to what you're returning.**

Middleware have full access to the `ctx` context object, detailed below.


## `ctx` context object
The context `ctx` object is passed as the first parameter to every [middleware](#middleware).

The two data channels are available on `ctx` as:

- `input`: **Any** - The "user supplied" _input data_ channel
- `meta`: **Object** - The application/interface set _meta data_ channel

In addtion, underlying _method block_ values are also provided:

- `path`: **String** - The unique `path` value for the underlying method block
- `ref`: **Object** - Any `ref` data set in the underlying [method block](#method-blocks)

The context object is _immutable_ except for its `state` parameter, which middleware may choose to use to store stateful info if returning its output is insufficient.

- `state`: **Any** - A mutable field to store data


## API

The primary API for Fage is the single factory call `Fage()`.

### Fage(methodBlocksArray)

Packages the methodBlocks in `methodBlocksArray` into a shallow object of runnable functions keyed by each [method block's](#method-blocks) `path` value.

```js
const Fage = require('fage')

const mw = (ctx) => `hello ${ctx.input}!`
const greeterBlock = {path: 'hello', fns: [mw]}
const app = Fage([greeterBlock])
// -> {hello: Function}

await app.hello('world')
// -> "hello world!"
```

Parameters:

- `methodBlocksArray`: **Array** - An array of Fage [method blocks](#method-blocks)

Returns:
- **Fage Application Object**: Flat object of runnable functions keyed by each method block's `path` value.

---

**Helper API methods**
There are also a handful of helper methods that may be of use during development of Fage apps:


### Fage.run(methodBlock[, input, meta])

Runs a specific [method block](#method-blocks) object.

> Note: This is essentially what the factory `Fage()` method uses to bind a method block to run as a Function.

```js
// Using the example from `Fage()` above
Fage.run(greeterBlock, 'earth')
// -> "hello earth!"
```

Parameters:
- `methodBlock`: **MethodBlock Object** - a Fage method block object
- `input`: **Any** - _(Optional)_ - any userland input data
- `meta`: **Object** - _(Optional)_ - application defined meta data

Returns:
- **Any**: The final output of the method block's `fns`



---




## Interfaces

Fage simply bundles flat objects of runnable [method blocks](#method-blocks), which themselves are thin wrappers keyed by their `path` values and containing [middleware](#middleware) `fns`. Fage methods receive parameters `(input, meta)`, but Fage itself does not know (or care) where these come from or how they are defined.

That is the job of an interface.

An **interface** layer should:

1. Provide endpoint access (http/socket/cli etc)
2. (Optionally) Authorise requests (attaching results to `meta`)
3. (Optionally) Attach other system/app/user data to `meta`
4. Map the endpoint to a method `path`: `app.<path>(input, meta)`
5. Handle errors thrown by Fage
6. Return the `output` from Fage
  - The `context` to run (object with `path`, `model`, `fns` etc)
  - Any user supplied `data`, and
  - Application `meta` information, including

Interfaces will typically have some knowledge of the shape of `meta` data that the underlying Fage app requires (or vice versa). For example, if your interface does an authentication check and retrieves user information, it will attach these to `meta` based on some key convention.

eg. If your Fage app looks for user login data on `ctx.meta.user`, then your interface should be putting its userData under `user`:

```js
interface.endpoint(<path>, () => {
  return await app.<path>(input, {user: userData})
})
```

### Example

Here we setup a basic Fage app, and then create a basic Express HTTP interface.

Starting with the Fage app methods:

```js
const Fage = require('fage')
const {chkPermissions, validateInputs, formatData, dbSave, dbGet, log} = require('./myCode')

// Fage method block
const createPost = {
  path: 'postsCreate',
  fns: [
    ctx => chkPermissions(ctx.meta.scopes),
    ctx => validateInputs(ctx.input),
    ctx => formatData(ctx.input),
    (ctx, formatted) => dbSave(formatted)
    (ctx, created) => { log('posted', created.id); return created }
  ]
}

const getRandomPosts = {
  path: 'postsGet',
  fns: [ctx => dbGet('posts')]
}

// Bundle your Fage
const app = Fage([getPosts, createPost])
module.exports = app
```

And then writing up a very basic HTTP interface:

```js
const express = require('express')
const {authenticator} = require('./myAuthCode')
const app = require('./fageBundle')

const server = new express()
server.use(authenticator) // Assume attaches `user` to `req.user`

// Create your endpoint logic
server.get('/posts', (req, res) => {
  app.postsGet(null, {limit: 10, scopes: req.user.scopes})
    .then(posts => res.send(posts))
})

server.post('/posts', (req, res) => {
  app.postsCreate(req.body, {user: req.user})
    .then(created => res.send(created))
})

server.listen(5000)
```


## Development

**Native to Node 6+**
Written using Node 6+ compatible ES6, specfically to run natively (i.e. _without_ needing transpilation). Note that if you are using `async/await` notation in your app design, you will need to be running Node 7.6+.
