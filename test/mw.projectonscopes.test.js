
import test from 'ava'

const {
  projectOnScopes
} = require('../src/methods')

test('projectOnScopes()', t => {
  const rawData = {
    id: 'abc',
    ownerId: 'bravo',
    secret: 'm4g1c',
    says: 'Hey there pretty momma'
  }

  const model = {
    id: {},
    ownerId: {},
    secret: {show: ['root']},
    says: {show: ['moo']}
  }

  // No model provided to test against.. pass the data straight through
  const noModel = projectOnScopes({}, 'passthru')
  t.true(noModel === 'passthru', 'No model should pass through data')

  // HAS a model, but no scopes
  const noScopes = projectOnScopes({model, meta: {userId: 'junk'}}, rawData)
  t.deepEqual(Object.keys(noScopes), ['id', 'ownerId'])

  // The owner with wrong scopes should still ONLY see public values
  const wrongScopes = projectOnScopes({
    model,
    state: {activeScopes: ['allthewrongones']}
  }, rawData)
  t.deepEqual(Object.keys(wrongScopes), ['id', 'ownerId'])

  // Owner with right scopes should see protected fields (of matching scope)
  const rightScopes = projectOnScopes({
    model,
    state: {activeScopes: ['moo']}
  }, rawData)
  t.deepEqual(Object.keys(rightScopes), ['id', 'ownerId', 'says'])
})
