
import test from 'ava'
import td from 'testdouble'

// Spit back arguments as resolved Promise
function retArgs () { return Promise.resolve(arguments) }

const DBMemoryStub = {
  save: retArgs,
  update: retArgs,
  findOne: retArgs,
  findMany: retArgs,
  remove: retArgs
}

td.replace('../src/db/memorydb', DBMemoryStub)
test.after.always(td.reset)

// Testdouble stubbing needs "require" NOT import
const dbmw = require('../src/db/wrapper')

test('Wrapper API exists', t => {
  const expectedKeys = [
    'create',
    'update',
    'save',
    'read',
    'list',
    'remove'
  ]

  t.plan(expectedKeys.length)

  expectedKeys.forEach(action => {
    t.truthy(dbmw[action], 'Missing expected DB action: ' + action)
  })
})

// Placeholder parameters to do pass to middleware and check against
const table = 'tableName'
const options = {opts: true}
const data = {myData: 'woo!'}

// The `prep()` method is used to prepare application `where` calls for the
// DB layer in MemoryDB.
test('._prep(where)', t => {
  const prep = dbmw._prep

  const noWhere = {dummy: 1}
  t.is(prep(noWhere), noWhere, 'Pass through opts if no `where` condition')

  const singleKey = {where: {id: 1}}
  t.is(prep(singleKey), singleKey, 'Single key `where` passes through')

  const complex = {where: {id: 1, name: 'Bob'}}
  const expected = {where: {and: [{id: {eq: 1}}, {name: {eq: 'Bob'}}]}}
  t.deepEqual(prep(complex), expected, 'Format to match condition shape')
})

// - - - -
// The following are function signature checks to ensure that the middleware
// is correctly parsing input parameters for dispatching to the DB API
// (in this case, the Memory DB)
// - - - -

test('.create() passes (table, data, opts)', async t => {
  const ret = await dbmw.create(table, options, data)
  t.is(ret[0], table)
  t.is(ret[1], data)
  t.is(ret[2], options)
})

test('.update() passes (table, data, opts)', async t => {
  const ret = await dbmw.update(table, options, data)
  t.is(ret[0], table)
  t.is(ret[1], data)
  t.is(ret[2], options)
})

test('.save() passes (table, data, opts)', async t => {
  const ret = await dbmw.save(table, options, data)
  t.is(ret[0], table)
  t.is(ret[1], data)
  t.is(ret[2], options)
})

test('.read() passes (table, combinedOpts)', async t => {
  const ret = await dbmw.read(table, options, data)
  t.is(ret[0], table)
  t.is(ret[1].opts, options.opts)
  t.is(ret[1].myData, data.myData)
})

test('.list() passes (table, combinedOpts)', async t => {
  const ret = await dbmw.list(table, options, data)
  t.is(ret[0], table)
  t.is(ret[1].opts, options.opts)
  t.is(ret[1].myData, data.myData)
})
