const Promise = require('bluebird')
const {compose, run} = require('./compose_run')
const error = require('./error')
const middleware = require('./middleware')

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
 * Given an array of Fage method blocks, return a shallow object keyed by
 * block 'path' names, and bound to `fage.run(<block>)` - enabling invoking
 * the block by calling its object key with `(input, meta)`
 *
 * `(input, meta)` parameters where input is user-supplied payload and `meta` is
 * a keyed object of system provided information:
 *
 * `{path: 'signals.create'}` => `{'signals.create': Function}`
 *
 * @param {Object[]} blocks Array of method block definitions (end points)
 *
 * @return {Object} Runnable SDK
 */

module.exports = blocks => blocks.reduce((sdk, m) => {
  // Force requirement to define both `path` and `fns`
  if (!m.path || !m.fns) throw new Error('Must declare `path` and `fns`')

  // Scopes.register(m.path, m.scopes)
  sdk[m.path] = run.bind(null, m)

  // Re-attach metadata
  sdk[m.path].scopes = m.scopes
  sdk[m.path].model = m.model
  sdk[m.path].path = m.path
  sdk[m.path].meta = m.meta || {}

  return sdk
}, {})

// Main export is `generate()`

// Attach middleware to the main export
module.exports.mw = middleware

// Helpers attached as properties on the main export
module.exports.compose = compose
module.exports.run = run
module.exports.error = error
