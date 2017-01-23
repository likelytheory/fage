
import test from 'ava'
import {getScopesByRole, grantRole} from '../src/scopes'

const scopes = {
  user: ['user', 'user:emails'],
  root: ['root']
}

grantRole('user', scopes.user)
grantRole('root', scopes.root, {include: 'user'})

// Helper method that checks keys match in two arrays
const hasMatchingKeys = (src, check) => {
  if (src.length !== check.length) return false
  return src.reduce((match, v) => match && check.indexOf(v) > -1, true)
}

// Apply the tests
test('Scope assignment, inheritance and retrieval', t => {
  const rootScopes = getScopesByRole('root')
  const userScopes = getScopesByRole('user')

  // Existence check
  t.true(
    !!getScopesByRole && !!grantRole,
    'A sphincter says what?'
  )

  t.true(
    hasMatchingKeys(userScopes, scopes.user),
    'user scopes are applied to role:user'
  )

  t.true(
    hasMatchingKeys(rootScopes, scopes.user.concat(scopes.root)),
    'root scope inherits user scopes'
  )
})
