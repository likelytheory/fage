
const memoryDBwrapper = require('./db')
const {compose, error} = require('./index')
const {Data, Scopes, Verify} = require('./middleware/index')

/*
  setWhereOnDbQuery
  `qry` is the query object sent to the DB, and contains all the options and
  data used to modify or read from the database. This fn enables setting a
  `where` condition on that `qry` query object BASED ON a "resourceId" field
  on the `meta` channel of the definition block `ctx`
  MUTATES qry!
*/

function setWhereOnDbQuery (ctx, qry) {
  if (!ctx.meta.resourceId) {
    throw error.create({
      status: 500,
      type: 'GenericsError',
      message: 'No resourceId field set on meta'
    })
  }
  const cond = {id: ctx.meta.resourceId}
  qry.where = Object.assign({}, qry.where, cond)
}

/*
  Generic create resource
*/

const create = DB => (table, {
  auth = true,
  query = {},
  merge = null,
  model = {},
  format = {},
  scopes = []
} = {}) => compose([
  auth ? Verify.hasAuth('userId') : null,
  Scopes.verify(scopes),
  Data.verifyKeysOk(model),

  Data.mergeFromMeta(merge),

  (ctx, merged) => Data.format(
    model,
    Object.assign({once: true, unlock: true}, format),
    merged),
  (ctx, formatted) => Data.validate(model, {}, formatted),

  // Save to datastore
  (ctx, toSave) => DB.create(table, query, toSave)
])

/*
  Generic Update resource
*/

const update = DB => (table, {
  auth = true,
  query = {},
  onResourceId = false,
  model = {},
  projectModel,
  scopes = []
} = {}) => compose([
  // Does user need to be logged in
  auth ? Verify.hasAuth('userId') : null,

  // Ensure scopes are valid if any
  Scopes.verify(scopes),

  // Verify that payload shapes match
  Data.verifyKeysOk(model),

  // Set `where` field on the `query` if resource Id passed - MUTATES query
  ctx => onResourceId && setWhereOnDbQuery(ctx, query),
  // Postgres specific: Return all fields on update
  ctx => (query.returning = '*'),

  // Prepare the payload
  Data.format(model, {defaults: false}),
  (ctx, out) => Data.validate(model, {}, out),

  (ctx, toSave) => DB.update(table, query, toSave),

  // Project only the fields we have permission for
  // Can override the ctx model with a projection model `projectModel`
  (ctx, out) => Data.project(projectModel || model, scopes, out)
])

/**
  Generic List/Find resource
*/

const list = DB => (table, {
  query = {},
  model = {},
  onResourceId = false,
  scopes = []
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  Scopes.verify(scopes),

  // Set `where` field on the `query` if resource Id passed - MUTATES query
  ctx => onResourceId && setWhereOnDbQuery(ctx, query),

  ctx => DB.list(table, query),

  (ctx, out) => Data.project(model, scopes, out)
])

/**
  Generic single resource record fetch
*/

const read = DB => (table, {
  query = {},
  userKey = 'id',
  model = {},
  onResourceId = false,
  scopes = []
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  Scopes.verify(scopes),

  // Set `where` field on the `query` if resource Id passed - MUTATES query
  ctx => onResourceId && setWhereOnDbQuery(ctx, query),

  ctx => DB.read(table, query),

  Verify.resultExists(),
  (ctx, out) => Data.project(model, scopes, out)
])

/**
  Generic Remove resource
*/

const remove = DB => (table, {
  query = {},
  onResourceId = false,
  scopes = []
} = {}) => compose([
  // First ensure user has appropriate global scope if any on the definition
  Scopes.verify(scopes),

  // Set `where` field on the `query` if resource Id passed - MUTATES query
  ctx => onResourceId && setWhereOnDbQuery(ctx, query),

  ctx => DB.remove(table, query)
])

/*
  The Generics export is initialised with an engine compatible `DB`
  The DB is a set of named functions (create, update, list, etc.) that wrap
  an underlying database driver.

  @param {Object} db An engine compatible set of named db commands

  @returns {Object} A set of generic CRUD fn middlewares
*/

module.exports = (db = memoryDBwrapper) => {
  // Duck-type check the provided 'db'
  if (!db || !db.create || !db.remove || !db.read || !db.list) {
    throw new Error('Invalid DB object map provided to generics(db)')
  }

  return {
    create: create(db),
    update: update(db),
    list: list(db),
    read: read(db),
    remove: remove(db)
  }
}
