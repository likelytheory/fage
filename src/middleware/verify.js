
const error = require('../error')

// Export `verify` middleware module
let verify = module.exports

// Setup an error to catch *programmer error*
const NO_CONTEXT_OBJ = new Error('No context object present')

/*
  hasMeta(field)
  Ensures that a specific `field` exists on the ctx.meta object and yields a
  403 Forbidden error if not

  @param {String} field The meta field to evaluate presence on
  @param {String} [errType=forbidden] Optional Fage error type

  @returns {Function} Promise yielding middleware that rejects 403 Forbidden
*/

verify.hasMeta = (field, errType = 'forbidden') => function (ctx, output) {
  if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
  // Ensure programmer only uses known Fage error types
  if (!error[errType]) throw new Error('No such error type: ' + errType)

  return typeof ctx.meta[field] === 'undefined'
    ? Promise.reject(error[errType]())
    : Promise.resolve(output)
}

/*
  isAuthedOn(field)
  Identical to `verify.hasMeta(field)` but returns 401 Unauthorized rather
  than the 403 Forbidden

  @param {String} field The meta field to evaluate presence on

  @returns {Function} Promise yielding middleware that rejects 401 Unauthorised
*/

verify.hasAuth = field => function (ctx, output) {
  if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
  return typeof ctx.meta[field] === 'undefined' || !ctx.meta[field]
    ? Promise.reject(error.unauthorized())
    : Promise.resolve(output)
}

/*
  resultExists()
  Ensures that a result exists on the `output` channel of middleware

  @returns {Function} Promise yielding middleware that rejects 404 Not Found
*/

verify.resultExists = () => function (ctx, output) {
  const notExists = typeof output === 'undefined' || output === null
  const empty = Array.isArray(output) && !output.length

  return notExists || empty
    ? Promise.reject(error.notfound())
    : Promise.resolve(output)
}

/*
  resultMatchMeta(resultField, metaField)
  Checks that a field on the result matches a field on the meta object
  This is useful for checking "ownership" fields

  @returns {Function} Promise yielding middleware that rejects 403 Forbidden
*/

verify.resultMatchMeta = (resultField, metaField) => function (ctx, output) {
  if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
  const hasMatch = output && output[resultField] === ctx.meta[metaField]
  return !hasMatch
    ? Promise.reject(error.forbidden())
    : Promise.resolve(output)
}
