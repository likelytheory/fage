# fage

> Declarative sequential async middleware runner

A reducer for running an array of middleware methods, passing each an app context object and the output of each call to the next middleware in the chain.

Middleware methods are called with `mw(context, output)`:

1. **context**: is an object `{input, meta}` where `input` is arbitrary user provided input, and `meta` is an application defined object, and;
2. **output** is the return result of the previous middleware

This approach allows composing apps as middleware and decouples the application _interface_ from its _implementation_.

---
- [**Overview**](#overview): the Fage basics
- [**Install**](#install): getting Fage into your project
- _How to use Fage: object structure for method blocks_ Coming soon
- **Middleware**
  - `context` parameter
- Database
- **Generics**
---

## Overview

#### Write a Fage method block

```js
import {nyanSay} from './mycode'

const myIsAuthedMiddleware = (ctx) => {
  if (!ctx.meta.loggedIn) throw new Error('Not Logged In')
}

// Example Fage method block:
export default {
  path: 'nyanExclaim',
  fns: [
    myIsAuthedMiddleware, // throws if ctx.meta.loggedIn not set
    (ctx) => ctx.input + '!@#!!',
    (ctx, output) => (nyanSay(output), output) // returns output
  ]
}
```

#### Package into an app
Fage can then package this app logic into a shallow object of runnable methods keyed by the `path` (or can run a raw object block explicitly using `fage.run(<block>, input, meta)`):

```js
import fage from 'fage'
import nyanExclaim from './exampleAbove'

export const app = fage([nyanExclaim])
// -> {nyanExclaim: Function}

await app.nyanExclaim('meow meow', {loggedIn: true})
// OR: await fage.run(nyanExclaim, 'meow meow', {loggedIn: true})
//                    ,---/V\     ________________
// ,*'^`*.,*'^`*.    ~|__(o.o) __/ meow meow!@#!! \
// .,*'^`*.,*'^`*.,*'  UU  UU  `------------------`
// -> "meow meow!@#!!"
```

Failing to provide a `loggedIn` value on the `meta` parameter will trigger an Auth error in our method block:
```js
await app.nyanExclaim('meow meow')
// -> Error: Not Logged In
```

#### Why this is cool
App logic can be composed as middleware. The packaged app is decoupled from any interface (making it very testable, and easy to reason about). This also allows you define arbitrary API maps for your interfaces, completely independently of your app logic. It gets even better with generative interfaces, but the principle is still powerful, even in manual mode:

```js
import app from './myFagePackagedApp'

// Also import hypothetical custom server interfaces
import {socketsrv, parseSoc} = './myInterfaces/socket'
import {httpsrv, parseReq} = './myInterfaces/httpsrv'

// Now wire up a socket API to your logic
socketsrv.on('user.login', parseSoc, data => app.usersLogin(data.body, data.meta))
socketsrv.on('say.nyansay', parseSoc, data => app.nyanExclaim(data.body, data.meta))
socketsrv.listen(3211)

// And/or an HTTP interface (...or any other interface!)
httpsrv.post('/users/login', parseReq, (req, res) => {
   res.json(app.usersLogin(req.state.body, req.state.meta))
})
httpsrv.post('/say/nyan', parseHttpReq, (req, res) => {
  res.json(app.nyanExclaim(req.state.body, req.state.meta))
})
httpsrv.on('error', (err, req, res, next))
```


## Install
Fage is a private repository for which you will require a Github token.

> TODO: Insert a howto for this

At which point you can install from Github as follows:

```bash
$ npm install likelytheory/fage
```


## Overview
A **fage** method sequentially runs each "middleware" function in an array, passing a `ctx` **context variable** as well as the **output results** of the previous function eg. `mw(ctx, prevOutput)`. This `fns` array is bundled as an object with a `path` unique identifier to create a Fage method:

```javascript
import {squareInputMiddleware} from './myAppLogic'

// An example Fage method:
const mySquaringMethod = {
  path: 'numberSquare',
  fns: [squareInputMiddleware]
}
```

**Fage** lets you call these methods with two parameters: 1) any `userData` you want to process, and 2) any application `metaData` you want to pass. It returns a _Promise_ that either throws an error or resolves to your final result.

```javascript
await fage.run(myMethod, 4)
// -> 16
```

The `path` is used to create a shallow hashmap object of your application methods, using the factory `fage(arrayOfAppMethods)`. This 'bundle' acts as a simple API, where the `path`s uniquely identify the endpoints, making it easy to write decoupled interfaces that call into this API. For example:

```javascript
import fage from 'fage'
import mySquaringMethod from './methods/squaring'
import speakMethods from './methods/speak'

const sdk = fage([mySquaringMethod, ...otherMethods])
// -> {numberSquare: Function, cowSay: Function, nyanSay: Function}

sdk.nyanSay('meow meow')
//                    ,---/V\     ___________
// ,*'^`*.,*'^`*.    ~|__(o.o) __/ meow meow \
// .,*'^`*.,*'^`*.,*'  UU  UU  `-------------`

export default sdk
```

The neat thing about this is now we have our `api` available, we can call it _from any interface_. Importantly, you can also pass application derived information as a second parameter:

```javascript
sdk.nyanSay('meow!', {
  userId: 'zim12',
  scopes: ['admin'],
  custom: 'red'
})
```

Middleware functions receive these arguments as fields on the context `ctx` variable which exposes:

- **path**: The unique identifier for the method being called
- **ref**:
- **data**: The user data passed as the first argument (eg. `'meow'`)
- **meta**:

**The context `ctx` variable**


Define application actions as objects comprising:

- **path**: Unique string identifier for each endpoint
- **model**: The data model used by path functions
- **scopes**: Array of required scopes (arbitrary strings used to check permissions)
- **fns**: Array of functions to sequentially run

Combining this approach with a format and validation engine can allow creation of remarkably concise and declarative applications.

## Middleware
Middleware are functions that accept two parameters, a `ctx` **context variable** as and the **output results** of the previous middleware. Middleware MUST return either a `Promise` or a `value`, but _not_ `undefined`.


Relies on writing an **interface** layer that:

1. Provides endpoint access (http/socket/cli etc)
2. Authorises requests (to pass permissions as "scopes" to the Context)
3. Connects endpoint to invoke Fage actions `path`:
  - The `context` to run (object with `path`, `model`, `fns` etc)
  - Any user supplied `data`, and
  - Application `meta` information, including



An example Fage action object, and being wired up for use:

```js
const fage = require('fage')

const example = {
  path: 'myexampleaction',
  fns: [
    // `ctx` is the action Context. See Docs for more info
    ctx => {
      return {
        untrusted: ctx.raw,
        internal: ctx.meta
      }
    },
    (ctx, out) => {
      console.log('...do more things')
      return out
    }
  ]
}

const actions = fage([example])
```

Actions expect two parameters:

- **userData**: raw data provided from user input (untrusted)
- **appData**: data provided from your application (trusted)

Invoking the example action above would be to call:

```js
actions.myexampleaction({isay: '123'}, {app: 'secret'})
// ...do more things
// {untrusted: {isay: '123'}, internal: {app: 'secret'}}
```



Example (Express HTTP) interface layer with definition:

```js
const fage = require('fage')
const express = require('express')
const authenticator = require('./myAuth')

const app = new express()
app.use(authenticator) // Presumably attaches `user` to `req.user`

// Fage action object example:
const getRandomPosts = {
  path: 'posts.get',
  fns: [fage.generics.get('posts')]
}

// Wire up your Fage actions
const actions = fage([getPosts])

// Create your endpoint logic
app.get('/posts', (req, res) => {
  actions['posts.get'](null, {limit: 10, scopes: req.user.scopes})
    .then(posts => res.send(posts))
})

app.listen(5000)
```



Where this gets interesting:

```js
// Examples of atomic application actions and functions implemented by you
const {checkPermissions, validateInputs, formatUserData, saveToDB, log} = require('./myAppLogic')

const createPost = {
  path: 'posts.create',
  fns: [
    ctx => checkPermissions(ctx.meta.scopes),
    ctx => validateInputs(ctx.raw),
    ctx => formatUserData(ctx.raw),
    (ctx, formatted) => saveToDB(formatted)
    (ctx, created) => { log('posted', created.id); return created }
  ]
}
```





## Middleware

These are functions that accept two parameters `(ctx, out)`, the **Context** and the **Output** result respectively, and return some data that will be fed into the next middleware as `out` or returned to the caller if the last in the chain.

`out` is `undefined` for the first middleware. Any user provided data is always available on `ctx.raw`.

The `ctx` parameter is the endpoint context, without the `fns` field, and including fields `raw` (user provided data) and `meta` (application provided data):

- ctx.**path** - The unique identifier String for the endpoint
- ctx.**model** - Data model object definition (usually a Skematic model)
- ctx.**scopes** - Array of arbitrary String scopes (permissions)
- ctx.**raw** - Optional user provided data
- ctx.**meta** - Application data object, which can include:
  - `userId` - The ID of the user making the call (or undefined if anon)
  - `scopes` - Array of user scopes



## Generics

The Generics are predefined sets of middleware that use Skematic `format()` and `validate()` methods to provide ready-to-use validated, formatted, permission checked handlers for `create`, `update`, `list` and `remove`.

## DB middleware bridge

> Note: It is not necessary to provide a DB bridge unless using Generics. However, it is still quite useful, and following the bridge-middleware conventions are recommended

Datastore access is provided by middleware bridges supporting `create`, `update`, `save`, `list`, `read` and `remove` methods. The signature follows:

```js
{<method>: (tableName, opts) => (ctx, out) => <getMyResults>(table, opts, ...)}
```

In other words a function is provided the table name and some database options, and then returns a standard middleware function returning the required results, either as a Promise or as the results directly.

## Development

Written using Node 6 compatible ES6, specfically to run _without_ Babel transpilation.
