
const memoryDBwrapper = require('./db')
const {compose} = require('./core')
const error = require('./error')
const mw = require('./methods')

/*
  Generics helpers
*/

// `qry` is the query object sent to the DB, and contains all the options and
// data used to modify or read from the database. This fn enables setting a
// `where` condition on that `qry` query object BASED ON a "resourceId" field
// on the `meta` channel of the definition block `ctx`
// MUTATES qry!
function setWhereOnDbQuery (ctx, qry) {
  if (!ctx.meta.resourceId) {
    throw error.create({
      status: 500,
      type: 'GenericsError',
      msg: 'No resourceId field set on meta'
    })
  }
  const cond = {id: ctx.meta.resourceId}
  qry.where = Object.assign({}, qry.where, cond)
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
  (ctx, toSave) => DB.create(table, db, toSave)
])

/**
  Generic Update resource
*/

const update = DB => (table, {
  qry = {},
  onResourceId = false,
  requireAuth = true
} = {}) => compose([
  // Does user need to be logged in
  requireAuth ? mw.verifyAuthed : null,
  mw.verifyScopes,

  mw.preventBogusPayloadKeys,

  // Set a `where` query on the `qry` object if resource Id passed. MUTATES qry.
  ctx => (onResourceId) && setWhereOnDbQuery(ctx, qry),

  // Prepare the payload
  mw.format.raw({defaults: false}),
  mw.validate.out(),

  (ctx, toSave) => DB.update(table, qry, toSave)

])

/**
  Generic List/Find resource
*/

const list = DB => (table, {
  qry = {},
  userKey = 'id',
  onResourceId = false
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  mw.verifyScopes,

  // Set a `where` query on the `qry` object if resource Id passed. MUTATES qry.
  ctx => onResourceId && setWhereOnDbQuery(ctx, qry),

  ctx => DB.list(table, qry),
  mw.projectOnScopes
])

/**
  Generic single resource record fetch
*/

const read = DB => (table, {
  qry = {},
  userKey = 'id',
  onResourceId = false
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  mw.verifyScopes,

  // Set a `where` query on the `qry` object if resource Id passed. MUTATES qry.
  ctx => onResourceId && setWhereOnDbQuery(ctx, qry),

  ctx => DB.read(table, qry),
  mw.verifyFound,
  mw.projectOnScopes
])

/**
  Generic Remove resource
*/

const remove = DB => (table, {
  qry = {},
  onResourceId = false
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  mw.verifyScopes,

  ctx => onResourceId && setWhereOnDbQuery(ctx, qry),

  ctx => DB.remove(table, qry)
])

/*
  The Generics export is initialised with an engine compatible `DB`
  The DB is a set of named functions (create, update, list, etc.) that wrap
  an underlying database driver.

  @param {Object} db An engine compatible set of named db commands

  @returns {Object} A set of generic CRUD fn middlewares
*/

const generics = (db = memoryDBwrapper) => {
  if (!db) throw new Error('Must provide generics with DB object map')

  return {
    create: create(db),
    update: update(db),
    list: list(db),
    read: read(db),
    remove: remove(db)
  }
}

module.exports = generics
