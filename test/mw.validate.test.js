
import test from 'ava'

const {
  validate
} = require('../src/methods')

test('validate()', t => {
  // Ensures that an undefined `opts` block does not error
  // This check was introduced after the optional override of a model was made
  // possible on the `opts` block (requiring it to be present OR defaulted
  // into existence). ROCK THE FUCK ON!
  t.notThrows(() => validate.out()({model: {}}, {}))
})
