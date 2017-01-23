
const Promise = require('bluebird')
const Scopes = require('./scopes')
const err = require('./error')

/*
  Bluebird is wonderful and infuriating. It tries to be clever and warn you
  when you don't _explictly_ handle a rejection. However it misses a lot of
  use-cases (eg. Koa middleware stack that's not using Bluebird), and you get
  nasty red 'Unhandled Rejection' warnings that are fiendishly hard to turn
  off. Instead, this next line sinks those warnings into a blackhole, and puts
  the onus on the developer to get it right. Thanks Bluebird.

  @see http://bluebirdjs.com/docs/api/promise.onpossiblyunhandledrejection.html
*/

Promise.onPossiblyUnhandledRejection(() => '>:|')

/**
  Ultra thin abstraction to run a chain of functions
  Runs `fns` as a Promise chain, passing the config `api` as the first param
  and the `out` output of the previous Promise as the second.
  `fns` can return synchronously or with a Promise. The chain waits while
  until the Promise returns
  As such:
   - ORDER matters! Be careful
   - The value of `out` CHANGES EVERY call (being the output of the previous)

  @param {Function[]} fns Array of functions to run (each passed `(api, out)`)
  @param {Object} api The API block definition to pass to `fns`
  @param {Mixed} [initial] Optional initial data to pass to first fn in list

  @return {Mixed} The output of the last function in `fns`
  @private
*/

const step = (fns, api, initial = null) => {
  return Promise.reduce(fns, (out, fn) => {
    // Sanity check that `out` isn't an uninvoked function
    // (Can happen when nesting middleware functions incorrectly)
    if (typeof out === 'function') {
      const errMsg = 'Invalid: Middlware chain returned a function'
      const debug = {
        path: api.path,
        details: 'Middleware in `fns` chain must return a value not a ' +
          'function. Probably a nested middleware missing an invocation.'
      }
      throw err(500, 'MiddlewareError', errMsg, debug)
    }

    return fn(api, out)
  }, initial)
    // Catch errors and apply any 'onError' handler if present
    .catch(error => {
      if (api.onError) api.onError(api, error)
      // Pass the error along
      throw error
    })
}

/**
  Applies Object.freeze to all the keys in the provided `obj`

  @param {Object} obj The object to freeze

  @return {Object} The locked (frozen) original object
  @private
*/

const lock = obj => {
  let o = {}
  for (let key in obj) o[key] = Object.freeze(obj[key])
  return Object.freeze(o)
}

/**
  Middleware function allowing the composition of several middlewares
  Returns a middleware that can be directly invoked by the API runner

  @example
  compose([Date.now])

  @param {Function[]} fns Array of functions to run (each passed `(api, out)`)

  @return {Function} Middleware function to use in an API block definition
*/

const compose = fns => (api, output = null) => {
  // Note: No need to lock the `api` here, as it is locked in the runner()
  // which is always called when executing the method path
  const called = Object.assign({}, api)
  delete called.fns

  // Filter out "Empty/null/undefined" fns in the array of `fns`
  return step(fns.filter(f => f), called, output)
}

/**
  "Runs" an API block definition

  @param {Object} api The API definition block
  @param {Mixed} data Channel for user supplied data
  @param {Object} meta Channel of application supplied data

  @return {Mixed} The output of the `api.fns`
*/

const run = (api, data, meta = {}) => {
  if (!api.path || !api.fns) throw new Error('bad engine args (path or fns)')

  // Enforce immutability of the core `api` definition
  const kerchink = lock(Object.assign({}, api, {raw: data, meta: meta}))
  // Setup unlocked state on the context definition
  const context = Object.assign({state: {}}, kerchink)

  return step(api.fns, context)
}

/**
  Given an array of API definitions, return a path keyed object that enables
  invoking the actions declared on that API. Invoking function expects
  `(data, meta)` parameters where data is user-supplied payload and `meta` is
  a keyed object of system provided information:
  `{path: 'signals.create'}` => `{'signals.create': _fn}`

  @param {Object[]} defs Array of API definitions (end points)

  @return {Object} Runnable SDK
*/

const generate = defs => defs.reduce((sdk, m) => {
  // Force requirement to define both `path` and `fns`
  if (!m.path || !m.fns) throw new Error('Must declare `path` and `fns`')

  Scopes.register(m.path, m.scopes)
  sdk[m.path] = run.bind(null, m)

  // Re-attach metadata
  sdk[m.path].scopes = m.scopes
  sdk[m.path].model = m.model
  sdk[m.path].path = m.path
  sdk[m.path].meta = m.meta || {}

  return sdk
}, {})

/*
  Main export is `generate()`
  Helpers attached as properties on the main export
*/

module.exports = generate
module.exports.compose = compose
module.exports.run = run
