
/**
  Standardised rich Error generator

  @param {Number} status The HTTP status code associated with the error
  @param {String} type A unique type for this error eg. Validation, NotLoggedIn
  @param {String} [msg] The Error message (default: `type` param)
  @param {Mixed} [debug] Debug information attached to the error
  @param {Object} [errors] Extra errors object

  @returns {Error} with {status, type, debug} fields
*/

function buildError ({status, type, msg, code, debug, errors}) {
  if (!status) {
    throw new Error('MUST provide error builder `status` and `type` props')
  }

  let error = new Error(msg || type)
  error.type = type
  error.status = status

  if (code) error.code = code
  if (debug) error.debug = debug
  if (errors) error.errors = errors // "Doctor", "Doctor", "Doctor" :D So derp.

  return error
}

function preBuild (status, type) {
  let eo = {status, type}
  return function errorPartial (opts = {}) {
    let pass = Object.assign({}, opts, eo)
    // Allow user specified type to override default
    if (opts.type) pass.type = opts.type

    return buildError(pass)
  }
}

/*
  Available error generators
*/

module.exports.create = buildError
module.exports.badrequest = preBuild(400, 'BadRequest')
module.exports.unauthorized = preBuild(401, 'Unauthorized')
module.exports.forbidden = preBuild(403, 'Forbidden')
module.exports.notfound = preBuild(404, 'NotFound')
module.exports.conflict = preBuild(409, 'Conflict')
module.exports.fatal = preBuild(500, 'ServerError')
module.exports.unavailable = preBuild(503, 'Unavailable')
