
const basicAuth = require('basic-auth')

/*
  Middleware factory that parses an HTTP Basic-Auth submission and places
  the results (if any) on the ctx.request.body as the {name, pass} field names

  @param {Object} keys The keymap to apply to ctx.request.body
  @param {String} keys.name - The username mapped field
  @param {String} keys.pass = The password mapped field

  @returns {Function} Middleware BasicAuth parsing function
*/

const httpBasicParserMiddleware = ({
  name = 'username',
  pass = 'password'
} = {}) => (ctx, next) => {
  // OAuth2 HTTP Basic support
  const cred = basicAuth(ctx.request)

  if (cred) {
    ctx.request.body[name] = cred.name
    ctx.request.body[pass] = cred.pass
  }

  return next()
}

module.exports = httpBasicParserMiddleware
