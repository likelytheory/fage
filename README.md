# fage

> Declarative sequential function runner

Create named arrays of Promise middleware that pass the output of their call to the next middleware in the chain.

Define application actions as objects comprising:

- **path**: Unique string identifier for each endpoint
- **model**: The data model used by path functions
- **scopes**: Array of required scopes (arbitrary strings used to check permissions)
- **fns**: Array of functions to sequentially run

Combining this approach with a format and validation engine can allow creation of remarkably concise and declarative applications.

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
  path: 'post.create',
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

Written using Node 6 ES6, specfically to run _without_ Babel transpilation.
