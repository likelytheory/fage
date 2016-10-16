
/**
  Standardised rich Error generator

  @param {Number} status The HTTP status code associated with the error
  @param {String} type A unique type for this error eg. Validation, NotLoggedIn
  @param {String} [msg] The Error message (default: `type` param)
  @param {Mixed} [debug] Debug information attached to the error
  @param {Object} [errors] Extra errors object

  @returns {Error} with {status, type, debug} fields
*/

function buildError (status, type, msg, debug, errors) {
  let error = new Error(msg || type)
  error.type = type
  error.status = status
  error.debug = debug || null

  if (errors) error.errors = errors // "Doctor", "Doctor", "Doctor" :D So derp.

  return error
}

// Function overloader
// Enables calling err(engineErrObj) AND err(status, type, message, debug, errors)
function err (arg) {
  return typeof arg === 'object'
    ? buildError(arg.status, arg.type, arg.message, arg.debug, arg.errors)
    : buildError.apply(null, arguments)
}

/*
  Common Errors
*/

err.badrequest = err.bind(null, 400, 'BadRequest')
err.unauthorized = err.bind(null, 401, 'Unauthorized')
err.forbidden = err.bind(null, 403, 'Forbidden')
err.notfound = err.bind(null, 404, 'NotFound')
err.fatal = err.bind(null, 500, 'ServerError')

module.exports = err
