
const {compose} = require('./index')
const err = require('./error')
const mw = require('./methods')

/*
  Generics helpers
*/

// Set a `where` query on the `db` object. MUTATES db.
function setWhereOnDbQuery (def, db) {
  if (!def.meta.resourceId) {
    throw err(500, 'GenericsError', 'No resourceId field set on meta')
  }
  const cond = {id: def.meta.resourceId}
  db.where = Object.assign({}, db.where, cond)
}

/**
  Generic create resource
*/

const create = DB => (table, {
  mergeFromMeta = null,
  db = {},
  formatOpts = {},
  requireAuth = true
} = {}) => compose([
  // Ensure the user is logged in (userId is present on `meta`)
  requireAuth ? mw.verifyAuthed : null,
  // Ensure scopes meet minimum requirements on `api.scopes`
  mw.verifyScopes,
  // Validate no bogus keys were passed as data (blacklist)
  mw.preventBogusPayloadKeys,
  // Merges meta information into the user provided data
  // Very useful for applying user ids based on out of channel auth data
  mw.mergeFromMeta(mergeFromMeta),
  // Format 'unlock' and 'once' to permit server setting protected fields
  mw.format.out(Object.assign({once: true, unlock: true}, formatOpts)),
  // Ensure final payload is valid
  mw.validate.out(),
  // Save to datastore
  DB.create(table, db),

  mw.debug({msg: `${table}.create [complete]`})
])

/**
  Generic Update resource
*/

const update = DB => (table, {
  db = {},
  onResourceId = false,
  requireAuth = true
} = {}) => compose([
  // Does user need to be logged in
  requireAuth ? mw.verifyAuthed : null,
  mw.verifyScopes,

  mw.preventBogusPayloadKeys,

  // Set a `where` query on the `db` object if resource Id passed. MUTATES db.
  def => (onResourceId) && setWhereOnDbQuery(def, db),

  // Prepare the payload
  mw.format.raw({defaults: false}),
  mw.validate.out(),

  DB.update(table, db)

])

/**
  Generic List/Find resource
*/

const list = DB => (table, {
  db = {},
  userKey = 'id',
  onResourceId = false
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  mw.verifyScopes,

  // Set a `where` query on the `db` object if resource Id passed. MUTATES db.
  def => onResourceId && setWhereOnDbQuery(def, db),

  DB.list(table, db),
  mw.selectOnScopes({userKey: userKey})
])

/**
  Generic single resource record fetch
*/

const read = DB => (table, {
  db = {},
  userKey = 'id',
  onResourceId = false
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  mw.verifyScopes,

  // Set a `where` query on the `db` object if resource Id passed. MUTATES db.
  def => onResourceId && setWhereOnDbQuery(def, db),

  DB.read(table, db),
  mw.verifyFound,
  mw.selectOnScopes({userKey: userKey})
])

/**
  Generic Remove resource
*/

const remove = DB => (table, {
  db = {}
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  mw.verifyScopes,
  mw.debug({msg: 'Remove is not implemented'}),
  () => { throw new Error('Not implemented') }
])

/*
  The Generics export is initialised with an engine compatible `DB`
  The DB is a set of named functions (create, update, list, etc.) that return
  engine middleware `mw(api, output)` for use in definition blocks

  @param {Object} DB An engine compatible set of named middleware fns

  @returns {Object} A set of generic CRUD fn middlewares
*/

const generics = DB => {
  if (!DB) throw new Error('Must provide generics with DB object map')

  return {
    create: create(DB),
    update: update(DB),
    list: list(DB),
    read: read(DB),
    remove: remove(DB)
  }
}

module.exports = generics
