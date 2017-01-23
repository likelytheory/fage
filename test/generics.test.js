
// Import testing frameworks
import test from 'ava'
import td from 'testdouble'

// ALWAYS USE REQUIRE HERE - `testdouble` replaces on `require` NOT `import`
// https://github.com/testdouble/testdouble.js/issues/147
const generics = require('../generics')

td.replace('./dep', {
  dothething: () => 'motherfucker'
})

test('Do stubs work', t => {
  console.log('---', generics)
  // console.log(td.verify(derp.dothething('woo')))
})
