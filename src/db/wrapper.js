
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
  Reference Fage.DB wrapper implementation

  - create
  - update
  - save
  - read (one)
  - list (many)
  - remove
*/

const wrapper = {
  create: (table, opts, data) => DB.save(table, data, opts),

  update: (table, opts = {}, data) => DB.update(table, data, prep(opts)),

  save: (table, opts, data) => DB.save(table, data, opts),

  read: (table, opts, data) => {
    return DB.findOne(table, Object.assign({}, prep(opts), data))
  },

  list: (table, opts, data) => {
    return DB.findMany(table, Object.assign({}, prep(opts), data))
  },

  remove: (table, opts, data) => DB.remove(table, prep(opts), data)
}

// Export the middleware
module.exports = wrapper
// And expose the prep method for testing
module.exports._prep = prep
