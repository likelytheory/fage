
const Promise = require('bluebird')
const error = require('../error')

let Scopes = module.exports

// Setup an error to catch *programmer error*
const NO_CONTEXT_OBJ = new Error('No context object present')

/**
 * Simple check that all required `reqScopes` are present in the `claims`.
 *
 * @param {[String]|String} reqScopes The required scopes
 * @param {[String]|String} claims The user provided claims
 *
 * @function
 * @private
 * @returns {Boolean} Check passes or fails
 */

const hasScopes = (reqScopes, claims) => {
  // If there are no requirements, always return true
  if (!reqScopes || !reqScopes.length) return true

  // No need to check if scopes are required but no claims are provided
  if (!claims || !claims.length) return false

  // Convert both to arrays
  if (!Array.isArray(reqScopes)) reqScopes = [reqScopes]
  if (!Array.isArray(claims)) claims = [claims]

  // Check that `claims` contains every element in `reqScopes`
  return reqScopes.reduce((ok, el) => {
    if (ok && claims.indexOf(el) === -1) ok = false
    return ok
  }, true)
}

/**
 * Verifies that the `claims` (or `ctx.meta.claims`) meet the `reqScopes`
 * or THROWS a 403 Forbidden error
 *
 * @param {[String]|String} reqScopes The scopes required to be met
 * @param {[String]|String} [claims] Optional claims to be checked
 *
 * @return {Promise|Function} Middleware fn if no claims provided
 */

Scopes.verify = (reqScopes, claims) => {
  const msg = 'Insufficient permissions to access this resource'

  const chk = clms => {
    return hasScopes(reqScopes, clms)
      ? Promise.resolve(true)
      : Promise.reject(error.forbidden(msg))
  }

  // Immediate Promise invocation if `claims` are provided
  if (typeof claims !== 'undefined') return chk(claims)
  // Otherwise return the middleware
  return ctx => {
    if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
    return chk(ctx.meta.claims)
  }
}

/**
 * Boolean check `claims` (or `ctx.meta.claims`) meet the `reqScopes`
 * and resolves as a Promise
 *
 * @param {[String]|String} reqScopes The scopes required to be met
 * @param {[String]|String} [claims] Optional claims to be checked
 *
 * @return {Promise|Function} Middleware fn if no claims provided
 */

Scopes.check = (reqScopes, claims) => {
  if (typeof claims !== 'undefined') {
    return Promise.resolve(hasScopes(reqScopes, claims))
  }

  return ctx => {
    if (!ctx || !ctx.meta) throw NO_CONTEXT_OBJ
    return Promise.resolve(hasScopes(reqScopes, ctx.meta.claims))
  }
}
