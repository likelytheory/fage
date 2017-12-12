
const Promise = require('bluebird')
const Skematic = require('skematic')
const error = require('../error')

let Data = module.exports

// Setup an error to catch *programmer error*
const NO_CONTEXT_OBJ = new Error('No context object present')

/**
  verifyKeysOk(model, [input])
  Checks user provided data has no unknown keys - useful as a quick check
  validation prior to mutating raw user input. Thin wrapper for
  `Skematic.validate(... {keyCheckOnly: true})`

  ```js
  // Assuming Fage method block:
  fns: [(ctx, result) => data.verifyKeysOk(myModel, result)]
  // passing model AND input returns result as a Promise
  // or:
  fns: [data.verifyKeysOk(myModel)]
  // passing ONLY model return middleware that uses `ctx.input` as input
  ```

  @param {Object} model The Skematic model to validate against
  @param {Object} [input] Optional input - returns result as Promise if provided

  @returns {Function} Promise yielding function rejects 400 BadRequest
*/

Data.verifyKeysOk = (model, input) => {
  // Provide a `chk()` caller for running Skematic key validation
  const chk = dx => {
    const ret = Skematic.validate(model, dx, {keyCheckOnly: true})
    return ret.valid
      ? Promise.resolve(dx)
      : Promise.reject(error.badrequest({
        message: 'Invalid keys in payload',
        debug: ret.errors
      }))
  }

  // Direct invocation with `input` field set return Promise result
  if (input) return Promise.resolve(chk(input))

  // Otherwise return middleware
  return ctx => {
    if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
    return Promise.resolve(chk(ctx.input))
  }
}

/*
  format(model, [input])
  Formats input (or ctx.input) against Skematic `model`

  @param {Object} model The Skematic model to format against
  @param {Object} [opts] Skematic format options
  @param {Object} [input] Optional input - returns result as Promise if provided

  @returns {Promise|Function}
*/

Data.format = (model, opts, input) => {
  const fmt = dx => Promise.resolve(Skematic.format(model, dx, opts))

  if (input) return fmt(input)

  return ctx => {
    if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
    return fmt(ctx.input)
  }
}

/*
  validate(model, [input])
  Validates input (or ctx.input) against Skematic `model`

  @param {Object} model The Skematic model to validate against
  @param {Object} [opts] Skematic validate options
  @param {Object} [input] Optional input - returns result as Promise if provided

  @returns {Promise|Function}
*/

Data.validate = (model, opts, input) => {
  const vld = dx => {
    const out = Skematic.validate(model, dx, opts)
    return out.valid
      ? Promise.resolve(dx)
      : Promise.reject(error.badrequest({
        message: 'Data validation failed',
        debug: out.errors
      }))
  }

  if (input) return vld(input)

  return ctx => {
    if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
    return vld(ctx.input)
  }
}

/**
  projectOnScopes(model, [useScopes, input])
  Skematic method to format field visibility based on the `model` and any
  provided scopes on `useScopes`. Resolve a Promise if `useScopes` and `input`
  are passed, otherwise returns a middelware fn that formats the data on
  `ctx.input` against scopes on `ctx.meta.claims`

  @param {Object} model The Skematic model to format against
  @param {Object} [useScopes] Optional scopes to use for matching
  @param {String} [input] Optional input data to project against

  @returns {Promise|Function}
*/

Data.project = (model, useScopes, input) => {
  function fmt (record, scps = []) {
    // Explicitly set the format options to ONLY 'show'
    // Turns off all other mutative Skematic componenents
    const options = {
      scopes: scps,
      generate: false,
      defaults: false,
      transform: false,
      unlock: true // Leaves locked fields on the data
    }

    return Skematic.format(model, record, options)
  }

  const run = (dx, sc) => {
    // No model means nothing to format, so simply return the raw data
    if (!model || !Object.keys(model).length) Promise.resolve(dx)

    return Array.isArray(dx)
      ? Promise.resolve(dx.map(rec => fmt(rec, sc)))
      : Promise.resolve(fmt(dx, sc))
  }

  // When input has been provided resolve the result
  if (input) return run(input, useScopes)

  // Otherwise return the middleware
  return ctx => {
    if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
    return run(ctx.input, ctx.meta.claims)
  }
}

/**
  mergeFromMeta(keymap)
  Merges `input` channel data with values from `meta` channel keys
  Enables saving meta (application derived) data down to user supplied data

  @param {Object} keymap Map `{toKey: 'fromMetaKey'}`

  @return {Function} Middleware that merges meta keys (if any) and continues
*/

Data.mergeFromMeta = (keymap = {}) => ctx => {
  // If no keymap is provided, no merge required, passthrough `ctx.input`
  if (!keymap || !Object.keys(keymap).length) return ctx.input

  let ret = Object.assign({}, ctx.input)
  for (let key in keymap) {
    // If the `meta` channel has a key of that value, OVERWRITE the result
    const metaVal = ctx.meta[keymap[key]]
    if (typeof metaVal !== 'undefined') ret[key] = metaVal
  }

  return Promise.resolve(ret)
}

/*
  setOwnerId(field)

  @param {String} field Field name to set owner id (default: ownerId)

  @returns {Object} The updated input data with owner ID field set
*/

Data.setOwnerId = field => (ctx, out) => {
  // `field` might be unset as a String, in which case default to "ownerId"
  const useField = field.length ? field : 'ownerId'

  if (ctx.input[useField]) return out

  ctx.state = ctx.state || {}
  ctx.state.ownerId = ctx.meta.userId
  return Object.assign({}, out, {ownerId: ctx.meta.userId})
}
