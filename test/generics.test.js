
// Import testing frameworks
import test from 'ava'

import db from '../src/db'

// Initialise an empty "database" of 'punks'
db.MemoryDB.setStore({punks: {}})

// ALWAYS USE REQUIRE HERE - `testdouble` replaces on `require` NOT `import`
// https://github.com/testdouble/testdouble.js/issues/147
const generic = require('../src/generics')(db.DB)

test.todo('Generics.Create suite')
test.todo('Generics.Read suite')
test.todo('Generics.Update suite')
test.todo('Generics.List suite')
test.todo('Generics.Remove suite')

test('Generics functional run through', async t => {
  // The data model
  const model = {
    id: {
      generate: {
        ops: () => Math.random().toString(16).substr(2, 4),
        once: true
      },
      lock: true
    },
    name: {required: true}
  }

  // Setup faux `ctx` object
  const CTX = {meta: {}}

  const data = {id: 1, name: 'Steve Stevens'}

  // 1. Create a new entry
  const createMw = generic.create('punks', {auth: false, model})
  const res = await createMw({input: data, meta: {}})
  // Confirm generated result record
  t.is(res.id.length, 4)

  // Setup where query on result ID (which was generated)
  const where = {where: {id: res.id}}

  // 2. Read it
  const reader = generic.read('punks', {query: where})
  const readOut = await reader(CTX)
  t.is(readOut.name, data.name)

  // 3. Update it
  const updater = generic.update('punks', {auth: false, query: where, model})
  const updateOut = await updater({input: {name: 'Steve Stephens'}, meta: {}})
  // Currently DB update returns an array of updated elements. Choose first.
  t.is(updateOut[0].name, 'Steve Stephens')

  // 4. List it
  const lister = generic.list('punks', {query: where})
  const listOut = await lister(CTX)
  t.is(listOut.length, 1)
  t.is(listOut[0].id, res.id)

  // 5. Remove it
  const remover = generic.remove('punks', {query: where})
  await remover(CTX)
  t.is((await lister(CTX)).length, 0)
})
