
const qs = require('qs')
const router = require('koa-router')()

const error = require('../../error')
const events = require('../../events')
const format = require('./format')
const {getMethodPath} = require('../common')

/**
  Return a Querystring object from a context request

  @param {Context} ctx The Koa context object
  @returns {Object|null} A query string object (or null)
*/

function getQueryFromReq (ctx) {
  let data = ctx.request.body || {}

  let query = null
  // Parse out any `_meta` channel info provided by clients and clear
  if (data._meta) {
    query = data._meta.query
    // MUST remove _meta so validation checks on raw `data` don't parse it
    delete data._meta
  }
  // Parse from query string if present
  if (ctx.request.querystring) {
    query = qs.parse(ctx.request.querystring)
  }

  return query
}

/**
  Obtains the traget resource id from the request url /resource/:id or the
  data payload. If both are present, checks that they match.

  @param {Context} ctx The Koa context object

  @throws {Error} If url and data id both present but not matching
  @returns {String} The id of the resource to use
*/

function getResourceId (ctx) {
  const urlId = ctx.params.id
  const dataId = (ctx.request.body || {}).id

  // The two ids (if both present) should match
  if (dataId && dataId !== urlId) {
    const message = 'URL resource identifier must match payload id'
    return ctx.throw(error.badrequest({
      type: 'MismatchedIdentifiers',
      msg: message,
      debug: {urlId, dataId}
    }))
  }

  return urlId
}

/**
  Generic Route builder

  @note Uses 'global' `router` defined in this module. Side-effect-ey.

  @param {String} key The unique identifier for route. Expects `<res>.<action>`
  @param {Function} fn The sdk engine executable to run
*/

function makeRoute (key, fn) {
  // Attempt to pull the METHOD and `path` from the engine key/path conventions
  // eg. <resource>.update => POST /resource/:id
  let [method, path] = getMethodPath(key)

  // Override any method/path with custom REST routing defined on the function
  if (fn.meta.rest) {
    method = fn.meta.rest.method
    path = fn.meta.rest.path
  }

  // No method was derived, do not attempt to setup a route
  if (!method) {
    events.emit('log/TRACE', {
      channel: 'rest',
      msg: `Skip unknown route ${path}`
    })
    return
  }

  // Log the setup of the path
  events.emit('log/TRACE', {
    channel: 'rest',
    msg: `Add route ${method}, ${path}`
  })

  const m = method.toLowerCase()

  // The API endpoint, passing the data and meta channels to the SDK fn
  router[m](path, (ctx, next) => {
    let data = ctx.request.body || {}

    // Initialise an empty user state if none present (required by all routes)
    ctx.state || (ctx.state = {})
    if (!ctx.state.user) ctx.state.user = {}

    // Setup the engine meta channel data
    let meta = {
      query: getQueryFromReq(ctx),
      scopes: ctx.state.user.scopes || null,
      userId: ctx.state.user.userId || null,
      resourceId: getResourceId(ctx) || null
    }

    // Log the API call request
    events.emit('log/INFO', {
      channel: 'http',
      msg: `${method} ${path} ${(new Date()).toISOString()}`
    })

    const refInfo = {path: key, scopes: fn.scopes}

    return fn(data, meta)
      .then(results => {
        ctx.body = format(ctx, results, refInfo)
      })
      // Failures in fn chain THROW and are passed through here to err handler
      // FYI Note:
      // Bluebird (Promise lib) is dumb and doesn't see we're handling this
      // throw from the `ctx` error handler way up the middleware stack, so
      // requires overriding 'onPossiblyUnhandledRejection' in Bluebird
      .catch(err => ctx.throw(Object.assign(err, refInfo)))
  })
}

module.exports = sdk => {
  Object.keys(sdk).forEach(k => makeRoute(k, sdk[k]))
  return router
}
