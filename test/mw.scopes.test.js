
import test from 'ava'

const Scopes = require('../src/middleware/scopes')

// Faux ctx object
const CTX = {meta: {'👻': '🙌'}}

test('verify(reqScopes [, claims])', async t => {
  const mw = Scopes.verify(['admin'])
  t.throws(() => mw())

  // Not passing any 'claims' on `ctx.meta.claims`
  const nogood = await t.throws(mw(CTX))
  t.is(nogood.message, 'Insufficient permissions to access this resource')

  // A bogus claim should also fail
  await t.throws(mw({meta: {claims: '😈'}}))

  // But good claims should pass
  await t.notThrows(mw({meta: {claims: 'admin'}}))
  await t.notThrows(mw({meta: {claims: ['admin']}}))

  // And direct invocation throws on bad claims
  await t.throws(Scopes.verify(['admin'], '😈'))
  await t.throws(Scopes.verify(['admin'], ['😈']))

  // And passes on good invocation
  t.true(await Scopes.verify(['admin'], 'admin'))
  t.true(await Scopes.verify(['💵', '💋'], ['💵', '💋']))
})

test('check(reqScopes [, claims])', async t => {
  const mw = Scopes.check(['admin'])
  t.throws(() => mw())

  // Resolves `false` on missing or incorrect claims
  t.false(await mw(CTX))
  t.false(await mw({meta: {claims: '😈'}}))
  t.false(await mw({meta: {claims: ['erdmin']}}))

  // But resolves `true` when claims match
  t.true(await mw({meta: {claims: 'admin'}}))
  t.true(await mw({meta: {claims: ['admin']}}))

  // And direct invocation resolves false on bad claims
  t.false(await Scopes.check(['admin'], '😈'))
  t.false(await Scopes.check(['admin'], ['😈']))

  // And passes on good invocation
  t.true(await Scopes.check(['admin'], 'admin'))
  t.true(await Scopes.check(['💵', '💋'], ['💵', '💋']))
})
