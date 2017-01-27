
const {format, validate} = require('skematic')
const Scopes = require('./scopes')
const Log = require('./log')
const err = require('./error')
const {compose} = require('./core')

/**
  Ensures a `userId` exists on the `meta` channel

  @param {Object} api Required `.meta.userId` to check
  @throws {Error} No userId present (probably not logged in)
*/

const verifyAuthed = ctx => {
  if (ctx.meta.userId) return true

  // Not logged in?? UNLEASH THE FUCKING DRAGONS!@!?!!@!@$!@#@!
  throw err(401, 'NotLoggedIn', 'Must provide a valid userId on meta channel')
}

/**
  Ensures caller scopes on `.meta.scopes` meet `ctx` block required scopes
  @private
*/

const _checkScopes = ctx => {
  Log.trace('Scope requirements:', ctx.scopes)
  if (!ctx.scopes || !ctx.scopes.length) return true

  // No need to check if scopes are required but none are provided
  if (!ctx.meta.scopes) return false

  // Build up flat array of scope grants
  let grants = []
  if (Array.isArray(ctx.meta.scopes)) grants = ctx.meta.scopes
  else if (Object.keys(ctx.meta.scopes).length) {
    // Step over each resource grant and add it to the `grants` list
    Object.keys(ctx.meta.scopes)
      .forEach(resource => grants.concat(ctx.meta.scopes[resource]))
  }

  // No grants provided? Obviously fail.
  if (!grants.length) return false

  return Scopes.check(ctx.scopes, grants)
}

/**
  Ensures caller scopes on `.meta.scopes` meet `ctx` block required scopes
  or THROWS a 403 Forbidden error

  @param {Object} ctx Required `.scopes` and user determined `.meta.scopes`

  @throws {Error} Scopes are invalid
  @return {true} Scopes are valid
*/

const verifyScopes = ctx => {
  // Trying to access things you shouldn't? A sphincter says what?
  if (!_checkScopes(ctx)) {
    const msg = 'Insufficient permissions to access this resource'
    throw err(403, 'Forbidden', msg)
  }

  return true
}

/**
  Ensures caller scopes on `.meta.scopes` meet `ctx` block required scopes
  @return {Boolean} Scopes are valid or not
*/

const hasValidScopes = _checkScopes

/**
  Verifies that the userId field matches the requested resource on `field`
*/

const verifyOwnershipOnField = field => (ctx, resource) => {
  if (resource[field] !== ctx.meta.userId) {
    throw err(403, 'Forbidden', 'Sorry, no permissions to do that on this res')
  }
  return resource
}

/**
  Ensures a result is present, either contents in an array OR an `id` on data
*/

const verifyFound = (ctx, result) => {
  let exists = true
  if (!result) exists = false
  if (Array.isArray(result) && !result.length) exists = false
  if (typeof result === 'object' && !result.id) exists = false

  if (!exists) throw err(404, 'NoResults')
  else return result
}

/**
  Ensures a `resourceId` field is set on `ctx`

  @returns Input data channel passthrough
  @throws {Error}
*/

const verifyResourceIdSet = (ctx, out) => {
  if (!ctx.meta.resourceId) {
    throw err('400', 'NoResourceId', 'Expected to find a `resourceId`')
  }
  return out
}

/**
  Formats a record's visible fields (ie. those that are returned) based on the
  `ctx.model` provided on `ctx`, using the `ctx.state.activeScopes` for
  handling formatting. Requires that some method up the chain sets the
  'activeScopes' to use.

  @param {Object} opts Options for middleware
  @param {String} opts.userKey The data key/field to match against the userId

  @returns {Function} Middleware that operates on Object data or Array of objs
*/

const projectOnScopes = (ctx, data) => {
  if (!ctx.model) {
    Log.debug('[mw.projectOnScopes] No model provided, ignoring projection')
    return data
  }

  function project (record) {
    const state = ctx.state || {}
    const useTheseScopes = state.activeScopes || []

    // Explicitly set the format options to ONLY 'show'
    const options = {
      scopes: useTheseScopes,
      generate: false,
      defaults: false,
      transform: false,
      unlock: true // Leaves locked fields on the data
    }

    return format(ctx.model, record, options)
  }

  return Array.isArray(data)
    ? data.map(rec => project(rec))
    : project(data)
}

/**
  Thin wrapper for `Skematic.validate(... {keyCheckOnly: true})`
  Checks user provided data has no unknown keys - useful as a quick check
  validation prior to mutating raw user input.

  @param {Object} ctx API block definition with `.model` to validate against

  @throws {Error} Invalid keys detected
  @return {true} User data keys are valid
*/

const preventBogusPayloadKeys = ctx => {
  if (!ctx.model) return Log.warn('No `model` set on ' + ctx.path)

  const keyCheck = validate(ctx.model, ctx.raw, {keyCheckOnly: true})
  if (keyCheck.valid) return true

  // Error if the validation fails
  throw err(400, 'Validation', 'Invalid keys in payload: ' +
    Object.keys(keyCheck.errors).join(', ')
  )
}

/**
  Basic middleware console.log that returns/chains the passed `output`

  @param {Object} [opts] Optional `.msg` to log

  @return {Function} Middleware that logs message and continues data output
*/

const debug = (opts = {msg: ''}) => (ctx, out) => {
  Log.trace(opts.msg, out)
  return out
}

/**
  Merges data channel with keys from `meta` channel.
  Enables saving meta (application derived) data down to user supplied data

  @param {Object} [keymap] Map `{toKey: 'fromMetaKey'}`

  @return {Function} Middleware that merges meta keys (if any) and continues
*/

const mergeFromMeta = keymap => (ctx, out) => {
  // If no keymap is provided, no merge required, passthrough `raw`
  if (!keymap) return ctx.raw

  let ret = Object.assign({}, ctx.raw)
  for (let key in keymap) {
    // Overwrite input data with meta data, or use input for default
    ret[key] = ctx.meta[keymap[key]] || ctx.raw[key]
  }
  return ret
}

const fmt = {
  /**
    Thin wrapper for `Skematic.format`
    @param {Object} [opts] Optional options for `Skematic.format`
    @return {Function} Middleware that formats continued data, sync continue
  */

  out: opts => (ctx, out) => format(opts.model || ctx.model, out, opts),

  /**
    Thin wrapper for `Skematic.format`
    @param {Object} [opts] Optional options for `Skematic.format`
    @return {Function} Middleware that formats `ctx.raw` data, sync continue
  */

  raw: opts => ctx => format(opts.model || ctx.model, ctx.raw, opts)
}

/**
  Thin wrapper for `Skematic.validate` that checks provided `data` and
  throws an error if validation fails

  @param {Object} model The Skematic model to validate against
  @param {Object} data The data to validate
  @param {Object} [opts] Optional `opts` for `Skematic.validate`

  @throws {Error} Validation failed
  @return {Mixed} Continue provided `data` (passthru for middleware)
  @private
*/

function _vld (model, data = {}, opts = {}) {
  if (!model) {
    // This is an INTERNAL failure - it means the definition block is missing
    // a Skematic model but still calling validate in its `fns`
    Log.warn('No .model was provided on the API definition')
    throw err(500, 'Validation', 'Internal definitions missing Model data')
  }

  const vx = validate(model, data, opts)
  Log.trace('validator:', vx)

  if (vx.valid) return data

  // Fail on validation error - err(status, type, msg, debug, errors)
  throw err(400, 'Validation', 'Data validation failed', null, vx.errors)
}

const vld = {
  /**
    Inherit docs from `_vld` (thin wrapper)
    @throws {Error} Validation failed
    @return {Function} Middleware to validate and continue data output
  */

  out: (opts = {}) => (ctx, out) => _vld(opts.model || ctx.model, out, opts),

  /**
    Inherit docs from `_vld` (thin wrapper)
    @throws {Error} Validation failed
    @return {Function} Middleware to validate `ctx.raw` and continue output
  */

  raw: (opts = {}) => ctx => _vld(opts.model || ctx.model, ctx.raw, opts)
}

/**
  Compound input data preparation method that:

  - checks authorisation [optional]
  - checks scopes [optional]
  - ensures data validity
  - merges any required meta fields
  - formats the pre-processed data to model
  - validates the result
*/

const prepareData = ({
  checkAuth = false,
  checkScopes = false,
  mergeFromMeta: mfm = false,
  formatOpts = {},
  validateOpts = {},
  setOwnerId = false
} = {}) => compose([
  // Ensure the user is logged in (userId is present on `meta`)
  checkAuth ? verifyAuthed : null,

  // Ensure scopes meet minimum requirements on `ctx.scopes`
  checkScopes ? verifyScopes : null,

  // Validate no bogus keys were passed as data (blacklist)
  preventBogusPayloadKeys,

  // Merges meta information into the user provided data
  // Very useful for applying user ids based on out of channel auth data
  // (Passes results on `out` channel, even if no mergeFromMeta applied)
  mergeFromMeta(mfm),

  setOwnerId ? (ctx, out) => {
    if (ctx.raw.ownerId) return out

    ctx.state.ownerId = ctx.meta.userId
    return Object.assign({}, out, {ownerId: ctx.meta.userId})
  } : null,

  // Format the user data using formatOpts
  fmt.out(formatOpts),

  // Ensure final payload is valid
  vld.out(validateOpts)
])

// Export the middleware helpers
module.exports = {
  debug,
  format: fmt,
  hasValidScopes,
  mergeFromMeta,
  prepareData,
  preventBogusPayloadKeys,
  projectOnScopes,
  validate: vld,
  verifyAuthed,
  verifyFound,
  verifyOwnershipOnField,
  verifyResourceIdSet,
  verifyScopes
}
