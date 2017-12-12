export = Fage;
export as namespace Fage;

declare function Fage(methodBlocksArray: Fage.MethodBlock[]): Fage.RunBlock;

declare namespace Fage {
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

  type Middleware = (ctx: object, prevResult?: any) => any;

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
