
# fage

> Declarative sequential function runner

Create named arrays of Promise middleware that pass the output of their call to the next middleware in the chain.

Defines API endpoints as objects comprising:

- **path**: Unique string identifier for each endpoint
- **model**: The data model used by path functions
- **scopes**: Array of required scopes (arbitrary strings used to check permissions)
- **fns**: Array of functions to sequentially run

Combining this approach with a format and validation engine can allow creation of remarkably concise and declarative applications.

Relies on writing an interface layer that:

1. Provides endpoint access (http/socket/cli etc)
2. Authenticates requests (to pass scopes to definitions)
3. Matches endpoint to code `path` definition and passes:
  - The `definition` to run (object with `path`, `model`, `fns` etc)
  - Any user supplied `data`, and
  - Application `meta` data, including

Example (Express HTTP) interface layer with definition:

```js
const engine = require('engine')
const express = require('express')
const authenticator = require('./myAuth')

const app = new express()
app.use(authenticator) // Presumably attaches `user` to `req.user`

const getPosts = {
  path: 'posts.get',
  scopes: [],
  fns: [engine.generics.get('posts')]
}

const sdk = engine([getPosts])

app.get('/posts', (req, res) => {
  sdk['posts.get'](null, {limit: 100, scopes: req.user.scopes})
    .then(posts => res.send(posts))
})

app.listen(5000)
```

## Middleware

These are functions that accept two parameters `(api, out)` and return some data that will be fed into the next middleware as `out` or returned to the caller if the last in the chain.

`out` is `undefined` for the first middleware. Any user provided data is always available on `api.raw`.

The `api` parameter is the endpoint definition, without the `fns` field, and including fields `raw` (user provided data) and `meta` (application provided data):

- api.**path** - The unique identifier String for the endpoint
- api.**model** - Data model object definition (usually a Skematic model)
- api.**scopes** - Array of arbitrary String scopes (permissions)
- api.**raw** - Optional user provided data
- api.**meta** - Application data object, which can include:
  - `userId` - The ID of the user making the call (or undefined if anon)
  - `scopes` - Array of user scopes

## Generics

The Generics are predefined sets of middleware that use Skematic `format()` and `validate()` methods to provide ready-to-use validated, formatted, permission checked handlers for `create`, `update`, `list` and `remove`.

## DB middleware bridge

> Note: It is not necessary to provide a DB bridge unless using Generics. However, it is still quite useful, and following the bridge-middleware conventions are recommended

Datastore access is provided by middleware bridges supporting `create`, `update`, `save`, `list`, `read` and `remove` methods. The signature follows:

```js
{<method>: (tableName, opts) => (api, out) => <getMyResults>(table, opts, ...)}
```

In other words a function is provided the table name and some database options, and then returns a standard middleware function returning the required results, either as a Promise or as the results directly.

## Development

Written using Node 6 ES6, specfically to run _without_ Babel transpilation.
