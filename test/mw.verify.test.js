
import test from 'ava'

const verify = require('../src/middleware/verify')

// Faux ctx object
const CTX = {meta: {'👻': '🙌'}}

test('hasMeta(field) checks meta field existence', async t => {
  const fn = verify.hasMeta('👻')
  const out = await fn(CTX, 'O_o')
  t.is(out, 'O_o', 'should return output')

  // No context object should throw
  t.throws(() => fn('No context object 💥'))

  // Missing meta field should throw
  await t.throws(fn({meta: {noMatch: true}}))
})

test('hasMeta(field, errType) returns errType error', async t => {
  // Check unknown Fage error type 'junkType' throws
  await t.throws(verify.hasMeta('moo', 'junkType'))

  const fn = verify.hasMeta('moo', 'badrequest')

  const out = await t.throws(fn(CTX))
  t.is(out.type, 'BadRequest', 'expected a 400 BadRequest error')
})

test('hasAuth(field)', async t => {
  const fn = verify.hasAuth('userId')
  t.throws(() => fn('💥'))
  const out = await fn({meta: {userId: '🐻'}}, '🚀')
  t.is(out, '🚀', 'should return output')

  await t.throws(fn({meta: {userId: ''}}, '😫'))
})

test('resultExists()', async t => {
  const fn = verify.resultExists()
  await t.throws(fn(CTX, null))
  await t.throws(fn(CTX))
  await t.throws(fn(CTX, []))
})

test('resultMatchMeta(resultField, metaField)', async t => {
  // Refer to the CTX object for the 👻 field
  const fn = verify.resultMatchMeta('jam', '👻')
  await t.throws(() => fn())
  const out = await t.throws(fn(CTX))
  t.is(out.type, 'Forbidden')

  const result = {jam: '🙌'}
  const final = await fn(CTX, result)
  t.deepEqual(final, result)
})
