
const DB = require('./db')
const Scopes = require('./scopes')
const error = require('./error')
const events = require('./events')
const generics = require('./generics')
const mw = require('./methods')
const {run, compose} = require('./core')

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

module.exports.db = DB
module.exports.error = error
module.exports.events = events
module.exports.generics = generics
module.exports.mw = mw
module.exports.scopes = Scopes
