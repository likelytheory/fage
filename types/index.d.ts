import * as Skematic from 'skematic'

export = Fage
export as namespace Fage

declare function Fage (methodBlocksArray: Fage.MethodBlock[]): Fage.RunBlock

declare namespace Fage {
  /**
   * Fage `context` object
   * @prop {any} input Raw input data from the user
   * @prop {any} meta Application set data
   * @prop {String} path The name of the Fage method block
   * @prop {String} [ref] Any reference data set by the method block
   * @prop {String} [state] A mutable state container for your data
   */
  interface Context {
    /**
     * `input` data channel: raw user input (untrusted)
     */
    input: any

    /**
     * `meta` data channel: trusted data set by the application
     */
    meta: any

    /**
     * The path name of the Fage method block
     */
    path: string

    /**
     * Any reference data attached by the Fage method block
     */
    ref?: any

    /**
     * A mutable state container - set your own data here
     */
    state?: any
  }

  interface RunBlock {
    [pathKey: string]: (input: any, meta?: object) => any
  }

  interface ErrorOptions {
    status?: number
    type?: string
    message?: string
    code?: number | string
    debug?: any
    errors?: any
  }

  interface ErrorOptionsAll {
    status: number
    type: string
    message?: string
    code?: number | string
    debug?: any
    errors?: any
  }

  /**
   * Fage Errors extend default JavaScript Error objects with custom fields
   * that can provide useful additional information to app environments
   *
   * @prop {Number} status
   * @prop {String} type
   * @prop {String} [message]
   * @prop {Number|String} [code]
   * @prop {any} [debug] A container for any debug info dumps
   * @prop {any} [errors] A container for errors to attach for reference
   */
  interface FageError extends Error {
    status: number
    type: string
    code?: number | string
    debug?: any
    errors?: any
  }

  interface ErrorBuilder {
    create (options: ErrorOptionsAll): FageError

    /** 400 Bad Request */
    badrequest (opts?: ErrorOptions | string): FageError
    /** 401 Unauthorized */
    unauthorized (opts?: ErrorOptions | string): FageError
    /** 403 Forbidden */
    forbidden (opts?: ErrorOptions | string): FageError
    /** 404 Not Found */
    notfound (opts?: ErrorOptions | string): FageError
    /** 409 Conflict */
    conflict (opts?: ErrorOptions | string): FageError
    /** 429 Too Many Requests */
    ratelimit (opts?: ErrorOptions | string): FageError
    /** 500 Internal Server Error */
    fatal (opts?: ErrorOptions | string): FageError
    /** 503 Service Unavailable */
    unavailable (opts?: ErrorOptions | string): FageError
  }

  /**
   * Fage Middleware are functions that receive the Fage Context object
   * and the output of the previous middleware (or `undefined` if no previous
   * function exists). For async functions, return a Promise, otherwise
   * return any synchronous value. Critical errors should `throw` a
   * Fage [Error](#Error)
   *
   * @param {Fage.Context} ctx The Fage Context object for this method block
   * @param {any} [prevResult] The result from the previous middleware
   *
   * @throws {Error} Critical errors are thrown by Middleware
   * @returns {any} The result of this middleware function
   */
  type Middleware = (ctx: Context, prevResult?: any) => any

  /**
   * A Fage MethodBlock defines the functions `fns` to run through the Promise
   * reducer and a `path` name to uniquely identify the block. Optionally
   * define a `ref` object to store reference data on the Fage Context object.
   * Also optionally define an `onError` handler to pass-through process
   * any thrown Errors
   *
   * @prop {String} path Unique identifier for the MethodBlock
   * @prop {Fage.Middleware[]} fns Array of Fage.Middleware functions
   * @prop {any} [ref] Any reference data to be made available on Fage Context
   * @prop {Function} [onError] Optional error handler
   */
  interface MethodBlock {
    /**
     * The `path` to uniquely identify the MethodBlock
     */
    path: string

    /**
     * An array of Fage.Middleware functions
     */
    fns: Middleware[]

    /**
     * Any reference `ref` data to pass along to Middleware functions
     */
    ref?: object

    /**
     * A custom handler to process any Errors thrown by the Middleware.
     * Note that this is a pass through function, the thrown Error will
     * continue to be thrown after being processed by this handler.
     */
    onError?: (error?: Error) => void
  }

  /** Fage generics "namespace" object */
  type Generics = (db: any) => {
    create: (table: string, {auth, query, merge, model, format, scopes}?: {
      auth?: boolean, query?: any, merge?: any, model?: Skematic.Model, format?: Skematic.FormatOptions, scopes?: string[] }
    ) => any
    update: (table: string, {auth, query, onResourceId, model, projectModel, scopes}?:
      { auth?: boolean, query?: any, onResourceId?: boolean, model?: Skematic.Model, projectModel?: Skematic.Model, scopes?: string[] }
    ) => any
    list: (table: string, {query, model, onResourceId, scopes}?: {
      query?: any, model?: Skematic.Model, onResourceId?: boolean, scopes?: string[] }
    ) => any
    read: (table: string, {query, _userKey, model, onResourceId, scopes}?: {
      query?: any, _userKey?: any, model?: Skematic.Model, onResourceId?: boolean, scopes?: string[] }
    ) => any
    remove: (table: string, {query, onResourceId, scopes}?: {
      query?: any, onResourceId?: boolean, scopes?: string[] }
    ) => any
  }

  /** Fage middleware "namespace" object */
  interface Mw {
    readonly Data: MwData
    readonly Scopes: MwScopes
    readonly Verify: MwVerify
  }

  /** Fage middleware Data api */
  interface MwData {
    /**
     * verifyKeysOk(model, [input])
     * Checks user provided data has no unknown keys - useful as a quick check
     * validation prior to mutating raw user input. Thin wrapper for
     * `Skematic.validate(... {keyCheckOnly: true})`
     *
     * ```js
     * // Assuming Fage method block:
     * fns: [(ctx, result) => data.verifyKeysOk(myModel, result)]
     * // passing model AND input returns result as a Promise
     * // or:
     * fns: [data.verifyKeysOk(myModel)]
     * // passing ONLY model return middleware that uses `ctx.input` as input
     * ```
     *
     * @param {Object} model The Skematic model to validate against
     * @param {Object} [input] Optional input - returns result as Promise if provided
     *
     * @returns {Function} Promise yielding function rejects 400 Bad Request
     */
    readonly verifyKeysOk: (model: Skematic.Model, input?: any) => Promise<any>

    /** */
    readonly format: (model: Skematic.Model, opts: Skematic.FormatOptions, input?: any) => any

    /** */
    readonly validate: (model: Skematic.Model, opts?: Skematic.ValidateOptions, input?: any) => any

    /**
     * project(model, [useScopes, input])
     * Skematic method to format field visibility based on the `model` and any
     * provided scopes on `useScopes`. Resolve a Promise if `useScopes` and `input`
     * are passed, otherwise returns a middelware fn that formats the data on
     * `ctx.input` against scopes on `ctx.meta.claims`
     *
     * @param {Object} model The Skematic model to format against
     * @param {Object} [useScopes] Optional scopes to use for matching
     * @param {String} [input] Optional input data to project against
     *
     * @returns {Promise|Function}
     */
    readonly project: (model: Skematic.Model, useScopes?: string[], input?: string) => any

    /**
     * mergeFromMeta(keymap)
     * Merges `input` channel data with values from `meta` channel keys
     * Enables saving meta (application derived) data down to user supplied data
     *
     * @param {Object} keymap Map `{toKey: 'fromMetaKey'}`
     *
     * @returns {Function} Middleware that merges meta keys (if any) and continues
     */
    readonly mergeFromMeta: (keymap?: any) => (ctx: Context) => any
  }

  /** Fage middleware Scopes api */
  interface MwScopes {
    /**
     * Verifies that the `claims` (or `ctx.meta.claims`) meet the `reqScopes`
     * or THROWS a 403 Forbidden error
     *
     * @param {[String]|String} reqScopes The scopes required to be met
     * @param {[String]|String} [claims] Optional claims to be checked
     *
     * @return {Promise|Function} Middleware fn if no claims provided
     */
    readonly verify: (reqScopes: string | string[], claims?: string | string[]) => any

    /**
     * Boolean check `claims` (or `ctx.meta.claims`) meet the `reqScopes`
     * and resolves as a Promise
     *
     * @param {[String]|String} reqScopes The scopes required to be met
     * @param {[String]|String} [claims] Optional claims to be checked
     *
     * @return {Promise|Function} Middleware fn if no claims provided
     */
    readonly check: (reqScopes: string | string[], claims?: string | string[]) => any
  }

  /** Fage middleware Verify api */
  interface MwVerify {
    /**
     * hasMeta(field)
     * Ensures that a specific `field` exists on the ctx.meta object and yields a
     * 403 Forbidden error if not
     *
     * @param {String} field The meta field to evaluate presence on
     * @param {String} [errType=forbidden] Default Fage error type
     *
     * @returns {Function} Promise yielding middleware that rejects 403 Forbidden
     */
    readonly hasMeta: (field: string, errType?: string) => (ctx: Context, output: any) =>
      Promise<any>

    /**
     * hasAuth(field)
     * Identical to `hasMeta(field)` but returns 401 Unauthorized rather
     * than the 403 Forbidden
     *
     * @param {String} field The meta field to evaluate presence on
     *
     * @returns {Function} Promise yielding middleware that rejects 401 Unauthorised
     */
    readonly hasAuth: (field: string) => (ctx: Context, output: any) => Promise<any>

    /**
     * resultExists()
     * Ensures that a result exists on the `output` channel of middleware
     *
     * @returns {Function} Promise yielding middleware that rejects 404 Not Found
     */
    readonly resultExists: () => (ctx: Context, output: any) => Promise<any>

    /**
     * resultMatchMeta(resultField, metaField)
     * Checks that a field on the result matches a field on the meta object
     * This is useful for checking "ownership" fields
     *
     * @returns {Function} Promise yielding middleware that rejects 403 Forbidden
     */
    readonly resultMatchMeta: (resultField: string, metaField: string) =>
      (ctx: Context, output: any) => Promise<any>
  }

  const error: ErrorBuilder
  const generics: Generics
  const mw: Mw

  function run(
    methodBlock: MethodBlock,
    input?: any,
    meta?: any
  ): Promise<any>

  function compose(
    fns: Middleware[]
  ): Middleware
}
