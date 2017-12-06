export = Fage;
export as namespace Fage;

declare namespace Fage {
  interface ErrorOptions {
    type?: string,
    message?: string,
    code?: number | string,
    debug?: any,
    errors?: any
  }

  interface ErrorOptionsAll {
    status: number,
    type: string,
    message?: string,
    code?: number | string,
    debug?: any,
    errors?: any
  }

  interface Error {
    status: number,
    type: string,
    message?: string,
    code?: number | string,
    debug?: any,
    errors?: any
  }

  interface ErrorBuilder {
    create(options: ErrorOptionsAll) : Error,

    badrequest(opts: ErrorOptions): Error,
    unauthorized(opts: ErrorOptions): Error,
    forbidden(opts: ErrorOptions): Error,
    notfound(opts: ErrorOptions): Error,
    conflict(opts: ErrorOptions): Error,
    ratelimit(opts: ErrorOptions): Error,
    fatal(opts: ErrorOptions): Error,
    unavailable(opts: ErrorOptions): Error
  }
}
