
/**
  Formats the results payload to a given shape

  @param {Mixed} results The data to return to the end user
*/

function formatPayload (ctx, results, {path = null, scopes = null}) {
  // Most `results` will be Objects or Arrays and as such will be encoded
  // as JSON responses in the expected payload format below. HOWEVER:
  // OAuth requests to token will generate a String result. This should be
  // handled as a special case, below:
  if (typeof results === 'string') {
    // Encode string `results` as JSON if request Content-Type expects JSON
    const isJSONReq = /application\/json/.test(ctx.get('Content-Type'))
    if (isJSONReq) results = JSON.stringify(results)
    else {
      // The client has NOT requested JSON and the server results are
      // a plain string, so send response type as text/plain
      // In practice this should be rare (eg. OAuth2 tokens)
      ctx.set('Content-Type', 'text/plain; charset=utf-8')
    }

    // Return the RAW results (encoded as JSON if requested as such)
    return results
  }

  let payload = {}
  payload.data = results

  // Add Debug if set on ctx.status
  if (ctx.state && ctx.state.apiDebug) {
    payload.debug = {
      path,
      scopes,
      state: ctx.state
    }
  }

  return payload
}

module.exports = formatPayload
