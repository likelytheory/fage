
import test from 'ava'
import generate from '../index'

const def = {
  path: 'do.nothing',
  fns: [
    (api, out) => 'magic'
  ]
}

test('Engine export provides expected API', t => {
  t.true(
    typeof generate === 'function',
    'Exports a function generator'
  )

  t.true(
    typeof generate.compose === 'function',
    'Exposes export.compose() as a function'
  )

  t.true(
    typeof generate.runner === 'function',
    'Exposes export.runner() as a function'
  )
})

test('generate(defs) produces path-keyed `sdk`', t => {
  t.throws(
    () => generate(def), null,
    'Requires array as argument'
  )

  t.throws(
    () => generate([{nope: 1}]), null,
    'Requires valid definition object'
  )

  const sdk = generate([def])
  t.true(
    typeof sdk['do.nothing'] === 'function',
    'generate(defs) creates a keyed object by pathname'
  )

  // Setup the return value
  const ret = sdk['do.nothing']()

  t.true(
    !!ret.then,
    'Executed definitions return Promises'
  )

  return ret.then(result => {
    t.true(
      result === 'magic',
      'Middleware chain resolves as output of last function'
    )
  })
})

test('sdk.onError handler runs on thrown error if set on API block', t => {
  t.plan(3)

  const onErr = function (api, out) {
    t.true(
      api.path === 'demo.throw',
      'Confirm onError receives `api` block as first param'
    )

    t.true(
      out instanceof Error,
      'Expect `out` param to be an Error'
    )
  }

  const sdk = generate([{
    path: 'demo.throw',
    onError: onErr,
    fns: [() => { throw new Error('boom') }]
  }])

  return sdk['demo.throw']()
    .catch(err => {
      t.true(
        err.message === 'boom',
        'Caught middleware thrown output Error'
      )
    })
})
