
// Create basic InvalidToken error object (401 status)
let InvalidTokenError = new Error('InvalidToken')
InvalidTokenError.status = 401

/*
  SDK engine wrapper middleware builder for JSON Webtoken authentication
  Requires providing `verify` and `decode` functions and returns middleware

  The middleware Sets up a `user` field on the context `state` and populates
  this if a valid token is present on the request headers

  @throws {Error} On invalid tokens
*/

const jwtMiddleware = ({verify, decode}) => {
  const erm = 'Invalid Auth middleware setup. Requires {verify, decode}'
  if (!verify || !decode) throw new Error(erm)

  return (ctx, next) => {
    // Initialise a ctx.state if none exists
    ctx.state || (ctx.state = {})

    // Setup a blank user object
    ctx.state.user = {}

    // Bail out if no Authorization header present (leave user blank)
    if (!ctx.get('Authorization')) return next()

    // Obtain the raw token from the Auth header
    const token = ctx.get('Authorization').replace('Bearer ', '')

    // ALWAYS VERIFY SIGNATURE - throw on invalid token
    // Note: attempting to make calls with an invalid token is ALWAYS a 401
    return verify(token)
      .catch(() => ctx.throw(InvalidTokenError))
      // Only AFTER verification should we decode the token
      .then(() => decode(token)
        // Catch inside block to ONLY catch decode errors
        // If placed up one level, it would also catch verify errors
        .catch(e => {
          let er = new Error('JWT:DecodeError')
          er.debug = {
            message: e.message,
            error: e,
            stack: e.stack,
            details: 'Server error decoding the JWT'
          }
          return ctx.throw(er)
        })
      )
      .then(decoded => {
        // Apply decoded token info to context state
        // (relies on OOB info regarding token shape)
        // Note: Used by `../loader` routes to pass as `meta` to engine fn
        ctx.state.user = {
          userId: decoded.id,
          scopes: decoded.scopes
        }

        return next()
      })
  }
}

module.exports = jwtMiddleware
