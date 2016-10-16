
const {format, validate} = require('skematic')
const Scopes = require('./scopes')
const Log = require('./log')
const err = require('./error')

// The "golden key" scope. Provides access to ALL records.
// @see `selectOnScopes()` method below for use.
const SCOPE_ROOT = 'root'

/**
  Ensures a `userId` exists on the `meta` channel

  @param {Object} api Required `.meta.userId` to check
  @throws {Error} No userId present (probably not logged in)
*/

const verifyAuthed = api => {
  if (api.meta.userId) return true

  // Not logged in?? UNLEASH THE FUCKING DRAGONS!@!?!!@!@$!@#@!
  throw err(401, 'NotLoggedIn', 'Must provide a valid Bearer token')
}

/**
  Ensures caller scopes on `.meta.scopes` meet `api` block required scopes
  @private
*/

const _checkScopes = def => {
  Log.trace('Scope requirements:', def.scopes)
  if (!def.scopes || !def.scopes.length) return true
  return Scopes.check(def.scopes, def.meta.scopes || [])
}

/**
  Ensures caller scopes on `.meta.scopes` meet `api` block required scopes
  or THROWS a 403 Forbidden error

  @param {Object} api Required `.scopes` and user determined `.meta.scopes`

  @throws {Error} Scopes are invalid
  @return {true} Scopes are valid
*/

const verifyScopes = api => {
  // Trying to access things you shouldn't? A sphincter says what?
  if (!_checkScopes(api)) {
    const msg = 'Insufficient permissions to access this resource'
    throw err(403, 'Forbidden', msg)
  }

  return true
}

/**
  Ensures caller scopes on `.meta.scopes` meet `api` block required scopes
  @return {Boolean} Scopes are valid or not
*/

const hasValidScopes = _checkScopes

/**
  Verifies that the userId field matches the requested resource on `field`
*/

const verifyOwnershipOnField = field => (def, resource) => {
  if (resource[field] !== def.meta.userId) {
    throw err(403, 'Forbidden', 'Sorry, no permissions to do that on this res')
  }
  return resource
}

/**
  Ensures a result is present, either contents in an array OR an `id` on data
*/

const verifyFound = (def, result) => {
  let exists = true
  if (!result) exists = false
  if (Array.isArray(result) && !result.length) exists = false
  if (typeof result === 'object' && !result.id) exists = false

  if (!exists) throw err(404, 'NoResults')
  else return result
}

/**
  Select only those fields that match scope permissions (owner id as foreignKey)
  Pass-through if no scopes required
  Works on single record objects and Arrays of records

  @param {Object} opts Options for middleware
  @param {String} opts.foreignKey The data key to match against the userId

  @returns {Function} Middleware that operates on Object data or Array of objs
*/

const selectOnScopes = ({userKey: field = 'id'}) => (def, data) => {
  if (!def.model) throw err(500, 'Fatal', 'No model on path', {path: def.path})

  function select (record) {
    // Define a default for user scopes if none set
    const userScopes = def.meta.scopes || []
    // `root` is the golden key that gives access to ALL records regardless
    // of whether the user is the owner of the record.
    const isRoot = userScopes.indexOf(SCOPE_ROOT) > -1

    // Check if 'root' user OR is owner (userId matches record's user id field)
    const forThisRecord = isRoot || def.meta.userId === record[field]

    const useTheseScopes = validScopes && forThisRecord
      ? def.meta.scopes
      : null

    // Explicitly set the format options to ONLY 'show'
    const options = {
      show: useTheseScopes,
      generate: false,
      defaults: false,
      transform: false,
      unlock: true // Leaves locked fields on the data
    }

    return format(def.model, record, options)
  }

  const validScopes = hasValidScopes(def)
  return Array.isArray(data)
    ? data.map(rec => select(rec))
    : select(data)
}

/**
  Thin wrapper for `Skematic.validate(... {keyCheckOnly: true})`
  Checks user provided data has no unknown keys

  @param {Object} api API block definition with `.model` to validate against

  @throws {Error} Invalid keys detected
  @return {true} User data keys are valid
*/

const preventBogusPayloadKeys = api => {
  const keyCheck = validate(api.model, api.raw, {keyCheckOnly: true})
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

const debug = (opts = {msg: ''}) => (api, out) => {
  Log.trace(opts.msg, out)
  return out
}

/**
  Merges `raw` api data channel with keys from `meta` channel. Allows saving
  meta (application derived) data down to user supplied data

  @param {Object} [keymap] Map `{toKey: 'fromMetaKey'}`

  @return {Function} Middleware that merges meta keys (if any) and continues
*/

const mergeFromMeta = (keymap = {}) => (api, out) => {
  let ret = Object.assign({}, api.raw)
  for (let key in keymap) ret[key] = api.meta[keymap[key]]
  return ret
}

const fmt = {
  /**
    Thin wrapper for `Skematic.format`
    @param {Object} [opts] Optional options for `Skematic.format`
    @return {Function} Middleware that formats continued data, sync continue
  */

  out: opts => (api, out) => format(api.model, out, opts),

  /**
    Thin wrapper for `Skematic.format`
    @param {Object} [opts] Optional options for `Skematic.format`
    @return {Function} Middleware that formats `api.raw` data, sync continue
  */

  raw: opts => api => format(api.model, api.raw, opts)
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

function _vld (model, data, opts = {}) {
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

  out: opts => (api, out) => _vld(api.model, out, opts),

  /**
    Inherit docs from `_vld` (thin wrapper)
    @throws {Error} Validation failed
    @return {Function} Middleware to validate `api.raw` and continue output
  */

  raw: opts => api => _vld(api.model, api.raw, opts)
}

module.exports = {
  debug,
  format: fmt,
  hasValidScopes,
  mergeFromMeta,
  preventBogusPayloadKeys,
  selectOnScopes,
  validate: vld,
  verifyAuthed,
  verifyFound,
  verifyOwnershipOnField,
  verifyScopes
}
