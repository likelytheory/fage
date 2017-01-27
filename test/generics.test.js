
// Import testing frameworks
import test from 'ava'
import td from 'testdouble'

import db from '../src/db'

db.MemoryDB.setStore({punks: {}})

// ALWAYS USE REQUIRE HERE - `testdouble` replaces on `require` NOT `import`
// https://github.com/testdouble/testdouble.js/issues/147
const generics = require('../src/generics')(db)

test.todo('Create Generics tests')

test.skip('Generics', async t => {
  // 1. Create a new entry
  // 2. Read it
  // 3. Update it
  // 4. List it
  // 5. Remove it
})
