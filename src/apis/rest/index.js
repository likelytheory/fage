
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const cors = require('kcors')
const mount = require('koa-mount')

// Internal tool imports
const events = require('../../events')
const debugResponses = require('./debug')
const errorHandler = require('./error')
const notFoundHandler = require('./404')

/**
  Response time middleware
*/

const timer = (ctx, next) => {
  const start = Date.now()
  return next()
    .then(() => {
      const ms = Date.now() - start
      if (ctx.state.apiDebug) ctx.set('X-Response-Time', ms)
    })
}

/**
  Build API creates the HTTP router app based on the provided sdk engine

  @param {Object} sdk The path-keyed sdk engine output
  @param {Object} opts Options to initialise this rest api

  - `middleware` Custom userland Middleware array
  - `path` The prepend path string for the API eg. `/api/v3`
  - `parserOpts` Optional bodyparser config overrides

  @returns {Object} A Koa app ready for `mount()`
*/

function buildAPI (sdk, {
  middleware,
  path,
  // @see https://github.com/koajs/bodyparser/#options
  parserOpts = {
    enableTypes: ['json'],
    jsonLimit: '64kb'
  },
  skipNotFound = false
} = {}) {
  if (!path) throw new Error('[api.rest] Must specify `path` to mount API')

  events.emit('log/INFO', {
    msg: '[api.rest] New App Mounting on: ' + path
  })

  // Setup new Koa app
  const app = new Koa()

  // Error handler must be first to catch any throws on `next()`
  app.use(errorHandler)

  app.use(timer)

  // Use default CORS options
  // @see https://github.com/koajs/cors
  app.use(cors())

  // Request Body contents are parsed to `ctx.request.body` which the `loader()`
  // generated routes pass directly to app engine calls as `api.raw`
  // This HAS to go above the `middleware` prop, because otherwise it would
  // always overwrite any userland attempts to set `ctx.request.body`
  // @see https://github.com/koajs/bodyparser
  app.use(bodyParser(parserOpts))

  // Custom middleware (note can OVERRIDE `ctx.request.body`)
  if (middleware) middleware.forEach(mw => app.use(mw))

  // Apply debug info to responses if 'root' user or debug header on X-API-Debug
  app.use(debugResponses)

  // The router is automatically built by the API definition loader
  const router = require('./route')(sdk)

  // API router
  app.use(mount(path, router.routes()))

  // 404 Not Found handler
  if (!skipNotFound) app.use(mount(path, notFoundHandler))

  return app
}

module.exports = buildAPI
