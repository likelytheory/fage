
const events = require('../../events')

// #todo Setup error documentation
// Error documentation is best practice even if API is only used internally
// @see https://www.twilio.com/docs/api/errors

/*
  Middleware to handle thrown and Uncaught errors
*/

const errorHandler = (ctx, next) => {
  return next()
    .catch(err => {
      // Default to 500 general error if none set (assume uncaught exception)
      const status = err.status || 500

      const msg = err.status
        ? err.message
        : `Internal Server Error: ${err.message}`

      const domain = ctx.domain
      const data = {error: err}

      // Log the error at the appropriate log-level
      status >= 500
        ? events.emit('log/ERROR', {domain, channel: 'rest', data, msg})
        : events.emit('log/INFO', {domain, channel: 'rest', msg})

      let response = {
        status,
        message: msg
        // #todo more_info: DOC_PATH + err.code
      }

      // Some errors (eg. validation) are provided with an `errors` channel
      if (err.errors) response.details = err.errors

      // Attach a developer level response if in debug mode
      // Note: Debug mode is set by middleware for:
      // - root users
      // - API Debug key passed on X-API-Debug header
      if (ctx.state.apiDebug) {
        response.debug = {err, user: ctx.state.user}
        // Only attach a stack for server errors
        if (status >= 500) response.debug.stack = err.stack
      }

      ctx.status = status
      ctx.body = response
    })

    // Safety catch if some crazy state causes a throw above
    .catch(fatal => {
      events.emit('log/ERROR', {
        domain: ctx.domain,
        channel: 'rest',
        msg: 'Exception in Error handler',
        data: {error: fatal}
      })
      ctx.status = 500
      ctx.body = {status: 500, message: 'Internal Server Error'}
    })
}

module.exports = errorHandler
