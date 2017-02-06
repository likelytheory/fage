
/*
  Collection of useful generic API methods
*/

/**
  Converts a `path` string to METHOD and Path array. Purely convention driven.
  The URL component includes an `:id` token where required.

  The following actions convert by convention `resource.action`:

  - create [POST, /resource]
  - update [POST, /resource/:id]
  - save   [PUT, /resource]
  - list   [GET, /resource]
  - read   [GET, /resource/:id]
  - remove [DELETE, /resource/:id]

  @example
  getMethodPath('signals.create')
  // -> ['POST', '/signals']

  @param {String} path Expected as 'RESOURCE<sep>ACTION'
  @param {String} [separator] Optional separator

  @return {Array} [method, url]
*/

const getMethodPath = (path, separator = '.') => {
  let [url, action] = path.split(separator)

  url = `/${url}`

  switch (action) {
    case 'create':
      return ['POST', url]

    case 'update':
      return ['POST', url + '/:id']

    case 'save':
      return ['PUT', url + '/:id']

    case 'list':
      return ['GET', url]

    case 'read':
      return ['GET', url + '/:id']

    case 'remove':
      return ['DELETE', url + '/:id']

    default:
      return [false, path]
  }
}

module.exports = {
  getMethodPath
}
