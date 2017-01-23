
/**
  @namespace Scopes
*/

let registry = new Map()

// Internal stateful role tracker
let _roles = {}

/*
  Maps arbitrary 'role' tags to sets of scopes
  Roles are set on user accounts, whereas scopes are derived

  Stateful mutative method

  @param {String} role The unique role identifier
  @param {String|String[]} scopes An array of scopes for this role
  @param {Object} [opts] Options
  @param {String[]} opts.include An array of ROLES to include their scopes
*/

const grantRole = (role, scopes, {include = []} = {}) => {
  // "Make it an so, Number 1" (make all the arrays)
  if (!Array.isArray(include)) include = [include]
  if (!Array.isArray(scopes)) scopes = [scopes]

  // Apply any inherited scopes
  _roles[role] = include
    .map(r => _roles[r])
    .reduce((acc, roleScopes) => {
      // Push only unique new scopes onto role
      roleScopes.forEach(scp => acc.indexOf(scp) < 0 && acc.push(scp))
      return acc
    }, scopes.slice())
}

/**
  A simple combinator for a set of scopes given a collection of roles

  @param {String|String[]} roles A string or array of string roles
  @returns {Array} of scopes
*/

const getScopesByRole = roles => {
  // Ensure `roles` is an array
  if (!Array.isArray(roles)) roles = [roles]

  return roles.reduce((scopes, role) => {
    const grant = _roles[role]

    if (grant) {
      // Only add unique new scopes (don't double add)
      grant.forEach(scp => {
        if (scopes.indexOf(scp) < 0) scopes.push(scp)
      })
    }

    return scopes
  }, [])
}

/**
  Registers the scopes checked by a path with the Scopes Registry
  This allows application code to dynamically populate the registry which
  makes it available at runtime to interfaces

  @param {String} path A string representing a unique app method
  @param {String|String[]} scopes The scope/s being registered to this path

  @function
  @memberof Scopes
  @returns {Map} registry
*/

const register = (path, scopes) => {
  // Forces a String scope to a single array entity for easy concat to path
  if (!Array.isArray(scopes)) scopes = [scopes]

  // Append to existing path or create a new list of scopes
  let existing = registry.get(path) || []
  registry.set(path, existing.concat(scopes))

  return registry
}

/**
  Lists scopes used by a path, or all scopes in the application if no path
  is provided (ie. flattened contents of the scopes registry)

  @param {String} [path] Show scopes for path (uses all paths if not set)

  @function
  @memberof Scopes
  @returns {String[]}  scopes
*/

const get = path => {
  if (path) return registry.get('path')

  // Add only unique scopes to the list
  let ss = new Set()
  Array.from(registry.values())
    .forEach(scopes => scopes.forEach(str => ss.add(str)))

  return Array.from(ss)
}

/**
  Simple check that required `scopes` are present in the `claim`.
  Checks Strings and Arrays for both parameters, such that:

  ```
  scopes : claims
  STRING : STRING - Check equal
  STRING : ARRAY  - Check scope string is in claims array
  ARRAY  : STRING - Fails. ALL scopes must be met
  ARRAY  : ARRAY  - Check all scopes present in claims array
  ```

  @param {[String]|String} scopes The code defined required scopes
  @param {[String]|String} claim The user provided claim

  @function
  @memberof Scopes
  @throws {Error}
  @returns {Boolean} Check passes or fails
*/

const check = (reqscopes, claim) => {
  // If there are no requirements, always return true
  if (!reqscopes || !reqscopes.length) return true

  // Ensure `claim` is a String or an Array
  const isStr = typeof claim === 'string'
  if (!isStr && !Array.isArray(claim)) {
    throw new Error('Invalid Claim Type. Expected String or Array.')
  }

  // Required `reqscopes` is a SINGLE string eg. `signals:write`. Check:
  // STRING : STRING
  // STRING : ARRAY
  if (typeof reqscopes === 'string') {
    return isStr
      ? reqscopes === claim
      : claim.indexOf(reqscopes) > -1
  }

  // Required `reqscopes` are an ARRAY of scopes: ALL requirements must be met
  // ARRAY : STRING (autofail)
  // ARRAY : ARRAY
  if (Array.isArray(reqscopes)) {
    return isStr
      ? false
      : reqscopes.reduce((ac, v) => (ac && claim.indexOf(v) > -1), true)
  }

  // `reqscopes` is not a String OR an Array. Fail this hard.
  throw new Error('Invalid Type (reqscopes)', reqscopes)
}

module.exports = {
  check,
  get,
  getScopesByRole,
  grantRole,
  register
}
