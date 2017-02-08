
/*
  API path not found middleware handler
  Using `originalUrl` shows the _entire_ path that was called
*/

const notFoundHandler = ctx => {
  ctx.throw(404, `NotFound: ${ctx.method} ${ctx.originalUrl}`)
}

module.exports = notFoundHandler
