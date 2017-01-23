
const memoryDB = require('./db')
const {compose} = require('./index')
const err = require('./error')
const mw = require('./methods')

/*
  Generics helpers
*/

// `db` is the query object sent to the DB, and contains all the options and
// data used to modify or read from the database. This fn enables setting a
// `where` condition on that `db` query object BASED ON a "resourceId" field on
// the `meta` channel of the definition block `def`
// MUTATES db.
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
  // Prep data for saving
  mw.prepareData({
    checkAuth: requireAuth,
    formatOpts: Object.assign({once: true, unlock: true}, formatOpts),
    mergeFromMeta
  }),
  // Save to datastore
  DB.create(table, db)
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
  mw.projectOnScopes
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
  mw.projectOnScopes
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

const generics = (DBmw = memoryDB) => {
  if (!DBmw) throw new Error('Must provide generics with DBmw object map')

  return {
    create: create(DBmw),
    update: update(DBmw),
    list: list(DBmw),
    read: read(DBmw),
    remove: remove(DBmw)
  }
}

module.exports = generics
