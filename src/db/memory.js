
const Promise = require('bluebird')

/*
  FAUX DATABASE
  This is ONLY useful for toy prototyping and testing in browser NOT PRODUCTION
  Slow, nasty. Probably hates puppies. <Insert political joke>. Okay, just stop.
*/

let store = {}

if (typeof window !== 'undefined') window.STORE = store

// Simple key:value match
const valueMatch = (data, where) => {
  if (!where) return true

  let matches = true
  Object.keys(where).forEach(k => {
    if (where[k] !== data[k]) matches = false
  })
  return matches
}

// Project only the set of keys on data
const projection = (data, keys) => {
  if (!keys) return data

  let o = {}
  keys.forEach(k => (o[k] = data[k]))
  return o
}

// Faux DB interface to Map store
const DB = {
  findOne (table, opts) {
    return DB.findMany(table, opts)
      .then(results => results[0])
  },

  findMany (table, {where, columns}) {
    let results = Object.keys(store[table])
      // Flatten
      .map(k => store[table][k])
      // Match conditions
      .filter(record => valueMatch(record, where))
      // Projection on results
      .map(record => projection(record, columns))

    return Promise.resolve(results)
  },

  save (table, data, opts) {
    return Promise.resolve().then(() => {
      store[table][data.id] = data
      return data
    })
  },

  update (table, data, opts) {
    const merr = 'DB.update must provide `where` field on opts param'
    if (!opts.where) return Promise.reject(new Error(merr))

    // Find the records to update
    return DB.findMany(table, opts)
      .then(results => {
        if (!results.length) throw new Error('No record found')

        // Returns array of all updated records
        return results.map(rec => rec.id)
          .reduce((acc, key) => {
            const ref = store[table][key]
            if (!ref) throw new Error('Record vanished: ' + key)
            // Update the record
            const toSave = Object.assign({}, ref, data)
            store[table][key] = toSave
            acc.push(toSave)
            return acc
          }, [])
      })
  },

  remove (table, id) {
    return (delete store[table][id]) ? Promise.resolve() : Promise.reject()
  },

  wrap: {
    create: (table, opts) => (api, out) => DB.save(table, out, opts),
    update: (table, opts = {}) => (api, out) => DB.update(table, out, opts),
    save: (table, opts) => (api, out) => DB.save(table, out, opts),
    read: (table, opts) => (api, out) => {
      return DB.findOne(table, Object.assign({}, opts, out))
    },
    readByUser: (table, field = 'userId', opts) => (api, out = {}) => {
      let options = Object.assign({}, opts, out)
      const where = Object.assign({[field]: api.meta.userId}, options.where)
      options.where = where

      return DB.findMany(table, options)
        .then(results => results[0])
    },
    list: (table, opts) => (api, out) => {
      return DB.findMany(table, Object.assign({}, opts, out))
    },
    listByUser: (table, field = 'userId', opts) => (api, out = {}) => {
      let options = Object.assign({}, opts, out)
      const where = Object.assign({[field]: api.meta.userId}, options.where)
      opts.where = where

      return DB.findMany(table, options)
    },
    remove: (table, opts) => (api, out) => DB.remove(table, out, opts)
  }
}

module.exports = DB
