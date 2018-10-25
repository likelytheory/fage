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

test('Result of nullary error calls bear canonical message value', t => {
  t.is(errors.badrequest().message, 'Bad Request')
  t.is(errors.unauthorized().message, 'Unauthorized')
  t.is(errors.forbidden().message, 'Forbidden')
  t.is(errors.notfound().message, 'Not Found')
  t.is(errors.conflict().message, 'Conflict')
  t.is(errors.ratelimit().message, 'Too Many Requests')
  t.is(errors.fatal().message, 'Internal Server Error')
  t.is(errors.unavailable().message, 'Service Unavailable')
})

test('HTTP statuses match expectation', t => {
  t.is(errors.badrequest().status, 400)
  t.is(errors.unauthorized().status, 401)
  t.is(errors.forbidden().status, 403)
  t.is(errors.notfound().status, 404)
  t.is(errors.conflict().status, 409)
  t.is(errors.ratelimit().status, 429)
  t.is(errors.fatal().status, 500)
  t.is(errors.unavailable().status, 503)
})

test('HTTP types match expectation', t => {
  t.is(errors.badrequest().type, 'Bad Request')
  t.is(errors.unauthorized().type, 'Unauthorized')
  t.is(errors.forbidden().type, 'Forbidden')
  t.is(errors.notfound().type, 'Not Found')
  t.is(errors.conflict().type, 'Conflict')
  t.is(errors.ratelimit().type, 'Too Many Requests')
  t.is(errors.fatal().type, 'Internal Server Error')
  t.is(errors.unavailable().type, 'Service Unavailable')
})

test('Error object is an Error Type', t => {
  const er = errors.create({status: 1, type: 'Test'})
  t.true(er instanceof Error, 'errors should be instanceof Error')
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

test('JSON serialization of error objects', t => {
  t.is(
    JSON.stringify(errors.badrequest()),
	'{"message":"Bad Request","type":"Bad Request","status":400}'
  )
  t.is(
    JSON.stringify(errors.badrequest('Delete Facebook not supported')),
    '{"message":"Delete Facebook not supported","type":"Bad Request","status":400}'
  )
  t.is(
    JSON.stringify(errors.badrequest({ message: 'Google tracking can never be turned off' })),
    '{"message":"Google tracking can never be turned off","type":"Bad Request","status":400}'
  )
  t.is(
    JSON.stringify(errors.fatal({ debug: 'Uh Oh' })),
    '{"message":"Internal Server Error","type":"Internal Server Error","status":500,"debug":"Uh Oh"}'
  )
  t.is(
    JSON.stringify(errors.unavailable({ code: 'PayPal-123' })),
    '{"message":"Service Unavailable","type":"Service Unavailable","status":503,"code":"PayPal-123"}'
  )
  t.is(
    JSON.stringify(errors.unavailable({ message: 'Try again later', errors: [ errors.fatal('Database offline') ] })),
	'{"message":"Try again later","type":"Service Unavailable","status":503,"errors":[{"message":"Database offline","type":"Internal Server Error","status":500}]}'
  )
})
