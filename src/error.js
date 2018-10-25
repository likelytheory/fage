/**
 * Standardised rich error generator
 *
 * @param {Number} status The HTTP status code associated with the error
 * @param {String} type A unique type for this error eg. Validation, NotLoggedIn
 * @param {String} [message] The Error message (default: `type` param)
 * @param {String} [code] An app specific custom error code
 * @param {Mixed} [debug] Debug information for DEVELOPERS
 * @param {Object} [errors] Extra errors object
 *
 * @returns {Object} with {message, status, type, debug} fields
 */

function buildError (opts) {
  if (typeof opts === 'string') {
    opts = { message: opts }
  }

  const { status, type, message, code, debug, errors } = opts

  if (!status) {
    throw new Error('MUST provide error builder `status` and `type` props')
  }

  const err = new Error()
  err.message = message || type
  err.type = type
  err.status = status

  if (code) err.code = code
  if (debug) err.debug = debug
  if (errors) err.errors = errors // "Doctor", "Doctor", "Doctor" :D So derp.

  return err
}

function prebuild (status, type) {
  const eo = { status, type }

  return function errorPartial (opts = {}) {
    if (typeof opts === 'string') {
      opts = { message: opts }
    }

    const pass = Object.assign({}, opts, eo)

    // Allow user specified type to override default
    if (opts.type) pass.type = opts.type

    return buildError(pass)
  }
}

/*
  Available error generators
*/

module.exports.create = buildError
module.exports.badrequest = prebuild(400, 'Bad Request')
module.exports.unauthorized = prebuild(401, 'Unauthorized')
module.exports.forbidden = prebuild(403, 'Forbidden')
module.exports.notfound = prebuild(404, 'Not Found')
module.exports.conflict = prebuild(409, 'Conflict')
module.exports.ratelimit = prebuild(429, 'Too Many Requests')
module.exports.fatal = prebuild(500, 'Internal Server Error')
module.exports.unavailable = prebuild(503, 'Service Unavailable')
