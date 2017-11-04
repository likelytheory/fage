
import test from 'ava'

import errors from '../src/error'

test('Errors export defined API', t => {
  const keys = [
    'create',
    'badrequest',
    'unauthorized',
    'forbidden',
    'notfound',
    'conflict',
    'ratelimit',
    'fatal',
    'unavailable'
  ].sort()

  const exportedKeys = Object.keys(errors).sort()

  t.deepEqual(keys, exportedKeys)
})

test('HTTP statuses match expectation', t => {
  t.is(errors.badrequest().status, 400)
  t.is(errors.unauthorized().status, 401)
  t.is(errors.forbidden().status, 403)
  t.is(errors.notfound().status, 404)
  t.is(errors.conflict().status, 409)
  t.is(errors.ratelimit().status, 429)
  t.is(errors.fatal().status, 500)
})

test('HTTP types match expectation', t => {
  t.is(errors.badrequest().type, 'BadRequest')
  t.is(errors.unauthorized().type, 'Unauthorized')
  t.is(errors.forbidden().type, 'Forbidden')
  t.is(errors.notfound().type, 'NotFound')
  t.is(errors.conflict().type, 'Conflict')
  t.is(errors.ratelimit().type, 'TooManyRequests')
  t.is(errors.fatal().type, 'ServerError')
  t.is(errors.unavailable().type, 'Unavailable')
})

test('Prebuilt errors can override type but not status', t => {
  t.is(errors.badrequest({status: '111'}).status, 400)
  t.is(errors.badrequest({type: 'derp'}).type, 'derp')
})

test('Unknown params are ignored', t => {
  let out = errors.badrequest({junk: 'hello'})
  t.is(Object.keys(out).indexOf('junk'), -1)
})

test('Error message is set if passed on `message`', t => {
  let out = errors.fatal({message: 'Omg!'})
  t.is(out.message, 'Omg!')
})

test('Params are added only if present', t => {
  let out = errors.fatal({code: '123', debug: 'Oh!'})
  t.is(Object.keys(out).indexOf('errors'), -1)

  out = errors.fatal({code: '123', debug: 'Oh!', errors: ['yep']})
  const expected = ['message', 'type', 'status', 'code', 'debug', 'errors'].sort()
  t.deepEqual(Object.keys(out).sort(), expected)
})

test('Simple set message with `error.[method](\'Message\')`', t => {
  const er = errors.fatal('Oh yes!')

  t.is(er.message, 'Oh yes!', 'Message should be set on error obj')
})
