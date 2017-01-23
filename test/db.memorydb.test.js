
import test from 'ava'
import DB from '../src/db/memorydb'

/*
  IMPORTANT TESTING NOTE:
  - MemoryDB is implemented as a SINGLETON
  - This means the JSO store is the SAME one between tests
  - MemoryDB is implemented using async promises
  - This means that even resetting the store between tests can't guarantee
    ORDER OF OPERATION for concurrent accessors (how AVA works by default)

  This means tests that MUTATE the store **MUST BE RUN WITH .serial**
  (or you'll be debugging store mutations you can't explain)
*/

// Reset the "DB"
const dbDump = {
  test: {
    555: {id: 555, go: 1, meta: 'YES!'},
    678: {id: 678, go: 0, meta: 'swee!'},
    999: {id: 999, go: 1, meta: 'test'}
  }
}
test.beforeEach(() => {
  DB.setStore(JSON.parse(JSON.stringify(dbDump)))
})

test('API as expected', t => {
  const expectedKeys = [
    'findOne',
    'findMany',
    'save',
    'update',
    'remove'
  ]

  t.plan(expectedKeys.length)

  expectedKeys.forEach(key => {
    t.truthy(DB[key], 'Missing DB API field: ' + key)
  })
})

// READ a single record from the DB
test('.findOne(table, opts)', async t => {
  const noWhere = DB.findOne('test')
  t.throws(noWhere, null, 'Should throw with no opts.where')

  // Look for a record that doesn't exist (404)
  const four04 = await DB.findOne('test', {where: {id: 'bogus'}})
  t.is(four04, undefined, 'Expect 404 record to be undefined')

  // Get a specific, existing record
  const res = await DB.findOne('test', {where: {meta: 'swee!'}})
  t.is(res.id, 678, 'Expected to find test data {id: 678}')
})

// LIST several records
test('.findMany(table, opts)', async t => {
  // Get all
  const all = await DB.findMany('test')
  t.is(all.length, 3, 'Expected all records to be returned')

  // Grab all the {go: 1} records
  const res = await DB.findMany('test', {where: {go: 1}})
  t.true(Array.isArray(res), 'Expected an array of results')
  t.is(res.length, 2, 'Expected two results back')
  // Confirm that 'go' is set for each record in results
  res.forEach(rec => t.is(rec.go, 1))

  // Get no records (empty array)
  const empty = await DB.findMany('test', {where: {derp: 1}})
  t.true(Array.isArray(empty), 'Expected an array')
  t.is(empty.length, 0, 'Expected empty array back')
})

// Write data to the DB as a PUT style operation
// Mutates store: run as .serial!
test.serial('.save(table, data, opts) puts a record', async t => {
  const toSave = {id: 1, power: 10}
  const ret = await DB.save('test', toSave)
  t.is(ret, toSave, 'Expect MemoryDB to return exact data')

  // Quick sanity check that the data exists
  const check = await DB.findOne('test', {where: {id: 1}})
  t.is(check, toSave, 'Expect MemoryDB to return exact data')
})

// Update existing data as a patch
// Mutates store: run as .serial!
test.serial('.update(table, data, opts) patches existing', async t => {
  const toUpdate = {meta: 'OMG'}
  const out = await DB.update('test', toUpdate, {where: {id: 999}})
  t.true(Array.isArray(out), 'Expected array of matching updates')
  t.is(out[0].id, 999)
  t.is(out[0].meta, toUpdate.meta)
  t.is(out[0].go, 1)
})

// Remove a record from the store
// Mutates store: run as .serial!
test.serial('.remove(table, opts) deletes a record', async t => {
  // Not found returns false
  const notFound = DB.remove('junk', {where: {id: 10}})
  t.throws(notFound, null, 'Expected unknown record removal to be false')

  // t.fail('FINISH THIS SECTION')
  const rem = await DB.remove('test', {where: {id: 555}})
  t.is(rem[0], 555, 'Expected response to be id on successful remove')
  const all = await DB.findMany('test')
  t.is(all.length, 2, 'Expected only TWO records in DB')

  // Ensure id: 555 is removed
  const exists = all.reduce((has, o) => has || o.id === 555, false)
  t.false(exists, 'Expected id:555 to be removed')
})

test.todo('Test projection of fields')
