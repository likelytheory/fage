
import test from 'ava'

const {Data} = require('../src/middleware')

// Faux ctx object
const CTX = {meta: {'👻': '🙌'}}

const GModel = {
  id: {},
  created: {generate: Date.now},
  msg: {required: true},
  secret: {show: ['root'], lock: true}
}

/*
  Data.format()
*/

test('format(model [, opts, input]', async t => {
  const mw = Data.format(GModel)
  t.throws(() => mw()) // Requires context ctx

  // Returns formatted data
  const data = {msg: 'derp', secret: '😱'}
  const raw = await mw(Object.assign({}, CTX, {input: data}))
  t.deepEqual(Object.keys(raw).sort(), ['created', 'msg'].sort())

  // Check that options are correctly passed to Skematic
  const opts = {unlock: true, unscope: true}
  const mwo = await Data.format(GModel, opts)
  const out = await mwo(Object.assign({}, CTX, {input: data}))
  t.is(out.secret, '😱')

  // Ensure direct invocation works
  const direct = await Data.format(GModel, {}, data)
  t.deepEqual(Object.keys(direct).sort(), ['created', 'msg'].sort())
  const diro = await Data.format(GModel, opts, data)
  t.is(diro.secret, '😱')
})

/*
  Data.validate()
*/

test('validate(model [, opts, input])', async t => {
  const mw = Data.validate(GModel)
  t.throws(() => mw()) // Requires context ctx

  // Middlware should throw on bad data
  await t.throws(mw(Object.assign({}, CTX, {input: {id: '!'}})))
  // And return the unmodified data if validated
  const out = await mw(Object.assign({}, CTX, {input: {msg: '!'}}))
  t.deepEqual(out, {msg: '!'})

  // Check direct invocation
  await t.throws(Data.validate(GModel, {}, {id: '👻'}))
  const good = await Data.validate(GModel, {}, {msg: '😎'})
  t.is(good.msg, '😎')
})

/*
  Data.verifyKeysOk()
*/

test('verifyKeysOk(model [, input])', async t => {
  const mw = Data.verifyKeysOk(GModel)
  t.throws(() => mw()) // Requires context ctx

  // Throws for invalid data keys
  const er = await t.throws(mw(CTX, {hello: '🤯'}))
  t.is(er.message, 'Invalid keys in payload')

  // Verify passes if no bogus keys are present
  const data = {created: '1', id: '1'}
  const out = await mw(Object.assign({}, CTX, {input: data}))
  t.deepEqual(out, data)

  // Check direct invocation of good keys
  const good = await Data.verifyKeysOk(GModel, data)
  t.deepEqual(good, data)
})

/*
  Data.project()
*/

test('project(model [, useScopes, input])', async t => {
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
  const noModel = await Data.project({}, {}, 'passthru')
  t.true(noModel === 'passthru', JSON.stringify(noModel, null, 2))

  // HAS a model, but no scopes
  const noScopes = await Data.project(
    model,
    [],
    rawData
  )
  t.deepEqual(Object.keys(noScopes), ['id', 'ownerId'])

  // The owner with wrong scopes should still ONLY see public values
  const wrongScopes = await Data.project(
    model,
    ['allthewrongones'],
    rawData
  )
  t.deepEqual(Object.keys(wrongScopes), ['id', 'ownerId'])

  // Owner with right scopes should see protected fields (of matching scope)
  const rightScopes = await Data.project(
    model,
    ['moo'],
    rawData
  )
  t.deepEqual(Object.keys(rightScopes), ['id', 'ownerId', 'says'])

  // Test the middleware return
  const fn = Data.project(model)
  t.true(typeof fn === 'function')
  t.throws(() => fn())

  // Should use ctx.meta.claims for scope check
  const xo = await fn({meta: {claims: 'none'}, input: rawData})
  t.deepEqual(xo, {id: 'abc', ownerId: 'bravo'})
  const yo = await fn({meta: {claims: 'moo'}, input: rawData})
  t.deepEqual(Object.keys(yo), ['id', 'ownerId', 'says'])
  const zo = await fn({meta: {claims: ['moo', 'root']}, input: rawData})
  t.deepEqual(Object.keys(zo), ['id', 'ownerId', 'secret', 'says'])
})

/*
  mergeFromMeta(keymap)
*/

test('mergeFromMeta(keymap)', async t => {
  const myData = {yo: '🃏'}
  const mw = Data.mergeFromMeta({derp: 'moomoo'})

  // Check that passthrough (no keymap) is exact same object
  const pass = await Data.mergeFromMeta({})({input: myData})
  t.is(pass, myData)

  // Check merge meta field onto data
  const rp = await mw({input: myData, meta: {moomoo: '🐮'}})
  t.is(rp.derp, '🐮')

  // Ensure meta overwrites existing field 'derp'
  const cp = await mw({input: {derp: 'NO!'}, meta: {moomoo: '🍔'}})
  t.is(cp.derp, '🍔')
})
