
import test from 'ava'
import generate from '../src/index'

const def = {
  path: 'do.nothing',
  fns: [
    (ctx, out) => 'magic'
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
    typeof generate.run === 'function',
    'Exposes export.run() as a function'
  )
})

test('generate([blocks]) produces path-keyed `app`', t => {
  t.throws(
    () => generate(def), null,
    'Requires array as argument'
  )

  t.throws(
    () => generate([{nope: 1}]), null,
    'Requires valid definition object'
  )

  const app = generate([def])
  t.true(
    typeof app['do.nothing'] === 'function',
    'generate(defs) creates a keyed object by pathname'
  )

  // Setup the return value
  const ret = app['do.nothing']()

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

test('block.onError handler runs on thrown error if set on method block', t => {
  t.plan(3)

  const onErr = function (ctx, out) {
    t.true(
      ctx.path === 'demo.throw',
      'Confirm onError receives `ctx` block as first param'
    )

    t.true(
      out instanceof Error,
      'Expect `out` param to be an Error'
    )
  }

  const app = generate([{
    path: 'demo.throw',
    onError: onErr,
    fns: [() => { throw new Error('boom') }]
  }])

  return app['demo.throw']()
    .catch(err => {
      t.true(
        err.message === 'boom',
        'Caught middleware thrown output Error'
      )
    });
})

test('block.onError handler has thrown errors suppressed', t => {
  const onErr = function (ctx, out) {
    throw new Error('moop!')
  }

  const app = generate([{
    path: 'dothrow',
    onError: onErr,
    fns: [() => { throw new Error('boom') }]
  }])

  return app.dothrow()
    .catch(err => {
      t.true(
        err.message === 'boom',
        'Expected `moop!` to be suppressed'
      )
    })
})
