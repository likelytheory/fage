
// Enable API error debug responses if passed header: 'X-API-Debug': key
const API_HDR = 'X-API-Debug'
const API_DEBUG = process.env.REST_API_DEBUG || 'api.debug-f4g3!r3sT'

module.exports = (ctx, next) => {
  let useDebug = false

  // Setup the ctx.state object if it doesn't exist
  ctx.state || (ctx.state = {})

  // User is a root level (dev/admin) or has provided debug key
  if (ctx.state.user && ctx.state.user.isRoot) useDebug = true
  if (ctx.get(API_HDR) === API_DEBUG) useDebug = true

  if (useDebug) ctx.state.apiDebug = true

  return next()
}

module.exports.API_HDR = API_HDR
module.exports.API_DEBUG = API_DEBUG
