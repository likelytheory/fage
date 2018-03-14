export = Fage;
export as namespace Fage;

declare function Fage(methodBlocksArray: Fage.MethodBlock[]): Fage.RunBlock;

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
    input: any;

    /**
     * `meta` data channel: trusted data set by the application
     */
    meta: any;

    /**
     * The path name of the Fage method block
     */
    path: string;

    /**
     * Any reference data attached by the Fage method block
     */
    ref?: any;

    /**
     * A mutable state container - set your own data here
     */
    state?: any;
  }

  interface RunBlock {
    [pathKey: string]: (input: any, meta?: object) => any;
  }

  interface ErrorOptions {
    type?: string;
    message?: string;
    code?: number | string;
    debug?: any;
    errors?: any;
  }

  interface ErrorOptionsAll {
    status: number;
    type: string;
    message?: string;
    code?: number | string;
    debug?: any;
    errors?: any;
  }

  /**
   * Fage Errors extend default Javascript Error objects with custom fields
   * that can provide useful additional information to app environments
   *
   * @prop {Number} status
   * @prop {String} type
   * @prop {String} [message]
   * @prop {Number|String} [code]
   * @prop {any} [debug] A container for any debug info dumps
   * @prop {any} [errors] A container for errors to attach for reference
   */
  interface Error {
    status: number;
    type: string;
    message?: string;
    code?: number | string;
    debug?: any;
    errors?: any;
  }

  interface ErrorBuilder {
    create(options: ErrorOptionsAll): Error;

    /** 400 Bad Request */
    badrequest(opts: ErrorOptions): Error;
    /** 401 Unauthorized */
    unauthorized(opts: ErrorOptions): Error;
    /** 403 Forbidden */
    forbidden(opts: ErrorOptions): Error;
    /** 404 Not Found */
    notfound(opts: ErrorOptions): Error;
    /** 409 Conflict */
    conflict(opts: ErrorOptions): Error;
    /** 421 Rate Limit */
    ratelimit(opts: ErrorOptions): Error;
    /** 500 Server Error */
    fatal(opts: ErrorOptions): Error;
    /** 503 Server Unavailable */
    unavailable(opts: ErrorOptions): Error;
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
  type Middleware = (ctx: Context, prevResult?: any) => any;

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
    path: string;

    /**
     * An array of Fage.Middleware functions
     */
    fns: Middleware[];

    /**
     * Any reference `ref` data to pass along to Middleware functions
     */
    ref?: object;

    /**
     * A custom handler to process any Errors thrown by the Middleware.
     * Note that this is a pass through function, the thrown Error will
     * continue to be thrown after being processed by this handler.
     */
    onError?: (error?: Error) => void;
  }

  const error: ErrorBuilder;

  function run(
    methodBlock: MethodBlock
  ): Promise<any>;

  function compose(
    fns: Middleware[]
  ): Middleware;
}
