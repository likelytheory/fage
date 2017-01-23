
const Promise = require('bluebird')

/*
  FAUX DATABASE
  This is ONLY useful for toy prototyping and testing in browser NOT PRODUCTION
  Slow, nasty. Probably hates puppies. <Insert political joke>. Okay, just stop.
*/

let store = {}

/**
  Complex MongoDB-style WHERE condition matching
  Signature: `{<booleanOperator>: [{<field>: {<operator>: <value}}]}`

  - booleanOperator: AND or OR
  - field: The key of the field to test
  - operator: The operation test e.g. eq, lt, in
  - value: The value to match

  @param {Object} record The data record to evaluate
  @param {Object} mc The 'match condition' (where) object to test

  @return {Boolean} match or not
*/

const match = (record, mc) => {
  if (!mc) return true

  const getKey = o => Object.keys(o)[0]

  // If the `where` condition is not formatted as a "MatchContainer" shape then
  // coerce the shape into an "AND" match container by default
  if (!mc.and && !mc.or) {
    // An 'object' means it is likely formatted as `{key: {op: value}}`, which
    // will work with `match()` - however this is FAR from foolproof. Basically
    // test the shit out of your calls.
    mc = typeof mc[getKey(mc)] === 'object'
      ? {and: [mc]}
      // If it's NOT an object, assume a scalar `{key: value}` in which case
      // reformat it as `{key: {eq: value}`.
      : {and: [{[getKey(mc)]: {eq: mc[getKey(mc)]}}]}
  }

  const check = (rec, mo) => {
    const key = getKey(mo)
    const op = getKey(mo[key])
    const val = mo[key][op]
    let hit = false

    switch (op) {
      case 'eq': if (rec[key] === val) hit = true; break
      case 'neq': if (rec[key] !== val) hit = true; break
      case 'in': if (val.indexOf(rec[key]) > -1) hit = true; break
      case 'nin': if (val.indexOf(rec[key]) < 0) hit = true; break
      case 'gt': if (rec[key] > val) hit = true; break
      case 'gte': if (rec[key] >= val) hit = true; break
      case 'lt': if (rec[key] < val) hit = true; break
      case 'lte': if (rec[key] <= val) hit = true; break
      case 'all':
        var _all = true
        let i = -1
        if (!rec[key]) _all = false
        while (++i < val.length) {
          if (rec[key].indexOf(val[i]) === -1) _all = false
        }
        if (_all) hit = true
        break
      case 'any':
        for (let i = 0; i < val.length; i++) {
          if (rec[key] && rec[key].indexOf(val[i]) > -1) {
            hit = true
            i = val.length
          }
        }
        break
      default:
        throw new Error('Unknown `where` operator: ' + op)
    }

    return hit
  }

  let boolop = getKey(mc)

  const _mc = (record, mos, boolop) => {
    let hits = []
    mos.forEach(mo => {
      const key = getKey(mo)
      if (mo[key] instanceof Array) hits.push(_mc(record, mo[key], key))
      else hits.push(check(record, mo))
    })

    return boolop === 'or'
      ? hits.indexOf(true) > -1 // OR check
      : hits.indexOf(false) < 0 // AND check
  }

  return _mc(record, mc[boolop], boolop)
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
  findOne (table, opts = {}) {
    if (!opts.where) return Promise.reject('Missing `opts.where` definition')

    return DB.findMany(table, opts)
      .then(results => results[0])
  },

  findMany (table, {where = {}, columns} = {}) {
    if (!store[table]) throw new Error('No such table in DB: ' + table)

    let results = Object.keys(store[table])
      // Flatten
      .map(k => store[table][k])
      // Match conditions
      .filter(record => match(record, where))
      // Projection on results
      .map(record => projection(record, columns))

    return Promise.resolve(results)
  },

  save (table, data, opts) {
    return Promise.resolve().then(() => {
      if (!store[table]) throw new Error('No such table in DB: ' + table)

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

  remove (table, opts) {
    if (!store[table]) return Promise.reject(new Error('No such table in DB: ' + table))
    const merr = 'DB.update must provide `where` field on opts param'
    if (!opts.where) return Promise.reject(new Error(merr))

    // Find the records to remove
    return DB.findMany(table, opts)
      .then(results => {
        if (!results.length) throw new Error('No record found')

        // Returns array of all updated records
        return results.map(rec => rec.id)
          .reduce((acc, key) => {
            const ref = store[table][key]
            if (!ref) throw new Error('Record vanished: ' + key)
            // Update the record
            delete store[table][key]
            acc.push(key)
            return acc
          }, [])
      })
  }
}

// Export main DB interface
module.exports = DB
module.exports.match = match

// Export accessors
if (typeof window !== 'undefined') window.STORE = store
module.exports.store = store
module.exports.setStore = ns => (store = ns)
