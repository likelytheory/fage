
interface IFageErrorOptions {
  type: string,
  message?: string,
  code?: number | string,
  debug?: any,
  errors?: any
}

interface IFageErrorOptionsAll {
  status: number,
  type: string,
  message?: string,
  code?: number | string,
  debug?: any,
  errors?: any
}

interface IFageError {
  status: number,
  type: string,
  message?: string,
  code?: number | string,
  debug?: any,
  errors?: any
}

interface IFageErrorBuilder {
  create(options: IFageErrorOptionsAll) : Error,

  badrequest(opts: IFageErrorOptions): IFageError,
  unauthorized(opts: IFageErrorOptions): IFageError,
  forbidden(opts: IFageErrorOptions): IFageError,
  notfound(opts: IFageErrorOptions): IFageError,
  conflict(opts: IFageErrorOptions): IFageError,
  ratelimit(opts: IFageErrorOptions): IFageError,
  fatal(opts: IFageErrorOptions): IFageError,
  unavailable(opts: IFageErrorOptions): IFageError
}

declare module 'fage' {
  const error : IFageErrorBuilder
}
