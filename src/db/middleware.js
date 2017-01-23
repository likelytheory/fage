
const DB = require('./memorydb')

// Formats the `where` condition to support multi-key where objects
// {hi: 1, yo: 2} -> {and: [{hi: {eq: 1}}, {yo: {eq: 2}}]}
const prep = opts => {
  if (!opts.where) return opts

  const w = opts.where
  if (Object.keys(w).length > 1) {
    opts.where = {
      and: Object.keys(w).reduce((mos, key) => {
        return mos.concat({[key]: {eq: w[key]}})
      }, [])
    }
  }
  return opts
}

/**
  Reference DB middleware implementation
*/

const middleware = {
  create: (table, opts) => (api, out) => DB.save(table, out, opts),

  update: (table, opts = {}) => (api, out) => DB.update(table, out, prep(opts)),

  save: (table, opts) => (api, out) => DB.save(table, out, opts),

  read: (table, opts) => (api, out) => {
    return DB.findOne(table, Object.assign({}, prep(opts), out))
  },

  list: (table, opts) => (api, out) => {
    return DB.findMany(table, Object.assign({}, prep(opts), out))
  },

  remove: (table, opts) => (api, out) => DB.remove(table, prep(opts), out)
}

// Export the middleware
module.exports = middleware
// And expose the prep method for testing
module.exports._prep = prep
