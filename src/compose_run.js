const Promise = require('bluebird')
const error = require('./error')

/**
 * Applies Object.freeze to all the keys in the provided `obj`
 *
 * @param {Object} obj The object to freeze
 *
 * @return {Object} The locked (frozen) original object
 * @private
 */

const lock = obj => {
  let o = {}
  for (let key in obj) o[key] = Object.freeze(obj[key])
  return Object.freeze(o)
}

/**
 * Ultra thin abstraction to run a chain of functions
 * Runs `fns` as a Promise chain, passing the config `ctx` as the first param
 * and the `out` output of the previous Promise as the second.
 * `fns` can return synchronously or with a Promise. The chain waits while
 * until the Promise returns
 * As such:
 *  - ORDER matters! Be careful
 *  - The value of `out` CHANGES EVERY call (being the output of the previous)
 *
 * @param {Function[]} fns Array of functions to run (each passed `(ctx, out)`)
 * @param {Object} ctx The Context definition to pass to `fns`
 * @param {Mixed} [initial] Optional initial data to pass to first fn in list
 *
 * @return {Mixed} The output of the last function in `fns`
 * @private
 */

const step = (fns, ctx, initial = null) => {
  return Promise.reduce(fns, (out, fn) => {
    // Sanity check that `out` isn't an uninvoked function
    // (Can happen when nesting middleware functions incorrectly)
    if (typeof out === 'function') {
      const errMsg = 'Fage middlware chain returned a function'
      const debug = {
        path: ctx.path,
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

    return fn(ctx, out)
  }, initial)
    // Catch errors and apply any 'onError' handler if present
    .catch(error => {
      // Ignore any thrown errors in the onError handler
      if (ctx.onError) try { ctx.onError(ctx, error) } catch (ignore) {}
      // Pass the original error along
      throw error
    })
}

/**
 * Middleware function allowing the composition of several middlewares
 * Returns a middleware that can be directly invoked by the API runner
 *
 * @example
 * compose([Date.now])
 *
 * @param {Function[]} fns Array of functions to run (each passed `(api, out)`)
 *
 * @return {Function} Middleware function to use in a context definition
 */

const compose = fns => (ctx, output = null) => {
  // Note: No need to lock the `ctx` here, as it is locked in the runner()
  // which is always called when executing the method path
  const called = Object.assign({}, ctx)
  delete called.fns

  // Filter out "Empty/null/undefined" fns in the array of `fns`
  return step(fns.filter(f => f), called, output)
}

/**
 * "Runs" an API block definition
 *
 * @param {Object} ctx The Context definition block
 * @param {Mixed} input Channel for user supplied input
 * @param {Object} meta Channel of application supplied data
 *
 * @return {Mixed} The output of the `ctx.fns`
*/

const run = (ctx, input, meta = {}) => {
  if (!ctx.path || !ctx.fns) throw new Error('bad engine args (path or fns)')

  // Enforce immutability of the core `ctx` definition
  const kerchink = lock(Object.assign({}, ctx, {input: input, meta: meta}))
  // Setup unlocked state on the context definition
  const context = Object.assign({state: {}}, kerchink)

  return step(ctx.fns, context)
}

module.exports.compose = compose
module.exports.run = run
