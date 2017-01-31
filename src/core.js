
const Promise = require('bluebird')

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

const error = require('./error')

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
      const errMsg = 'Fage middlware chain returned a function'
      const debug = {
        path: api.path,
        details: 'Middleware in `fns` chain must return a value not a ' +
          'function. Probably a nested middleware missing an invocation.'
      }
      throw error.create({
        status: 500,
        type: 'MiddlewareError',
        msg: errMsg,
        debug
      })
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

module.exports.compose = fns => (api, output = null) => {
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

module.exports.run = (api, data, meta = {}) => {
  if (!api.path || !api.fns) throw new Error('bad engine args (path or fns)')

  // Enforce immutability of the core `api` definition
  const kerchink = lock(Object.assign({}, api, {raw: data, meta: meta}))
  // Setup unlocked state on the context definition
  const context = Object.assign({state: {}}, kerchink)

  return step(api.fns, context)
}
