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
    input: any,

    /**
     * `meta` data channel: trusted data set by the application
     */
    meta: any,

    /**
     * The path name of the Fage method block
     */
    path: string,

    /**
     * Any reference data attached by the Fage method block
     */
    ref?: any,

    /**
     * A mutable state container - set your own data here
     */
    state?: any
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

    badrequest(opts: ErrorOptions): Error;
    unauthorized(opts: ErrorOptions): Error;
    forbidden(opts: ErrorOptions): Error;
    notfound(opts: ErrorOptions): Error;
    conflict(opts: ErrorOptions): Error;
    ratelimit(opts: ErrorOptions): Error;
    fatal(opts: ErrorOptions): Error;
    unavailable(opts: ErrorOptions): Error;
  }

  type Middleware = (ctx: Context, prevResult?: any) => any;

  interface MethodBlock {
    path: string;
    fns: Middleware[];
    ref?: object;
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
