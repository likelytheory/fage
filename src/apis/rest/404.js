
/*
  API path not found middleware handler
*/

const notFoundHandler = ctx => {
  ctx.throw(404, 'NotFound: ' + ctx.path)
}

module.exports = notFoundHandler
