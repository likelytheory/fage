
// Import testing frameworks
import test from 'ava'
import td from 'testdouble'

import db from '../src/db'

db.MemoryDB.setStore({punks: {}})

// ALWAYS USE REQUIRE HERE - `testdouble` replaces on `require` NOT `import`
// https://github.com/testdouble/testdouble.js/issues/147
const generic = require('../src/generics')(db.DB)

test.todo('Generics.Create suite')
test.todo('Generics.Read suite')
test.todo('Generics.Update suite')
test.todo('Generics.List suite')
test.todo('Generics.Remove suite')

test('Generics high level run through', async t => {
  // The data model
  const model = {
    id: {type: 'number'},
    name: {type: 'string'}
  }

  const data = {id: 1, name: 'Steve Stevens'}
  const requireAuth = false
  const qry = {where: {id: 1}}
  const meta = {}

  // 1. Create a new entry
  const creator = generic.create('punks', {requireAuth})
  const createOut = await creator({raw: data, model})

  // 2. Read it
  const reader = generic.read('punks', {qry})
  const readOut = await reader({meta})
  t.is(readOut.id, 1)

  // 3. Update it
  const updater = generic.update('punks', {requireAuth, qry})
  const updateOut = await updater({raw: {name: 'Steve Stephens'}, meta, model})
  // Currently DB update returns an array of updated elements. Choose first.
  t.is(updateOut[0].name, 'Steve Stephens')

  // 4. List it
  const lister = generic.list('punks', {qry})
  const listOut = await lister({meta})
  t.is(listOut.length, 1)

  // 5. Remove it
  const remover = generic.remove('punks', {qry})
  const removeOut = await remover({meta})
  t.is((await lister({meta})).length, 0)
})
