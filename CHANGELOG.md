2.4.0 - 2 May 2021
===

Changed:
- Stripped out `generics` export to prevent Node warning of missing circular ref



2.3.0 - 26 October 2018
===

Changed:
- Error functions called with no arguments bear canonical error message
- Updated npm package dependencies



2.2.1 - 28 May 2018
===

Changed:
- Organisation name
- Released as npm module `@likelytheory/fage`



2.2.0 - 10 May 2018
===

Changed:
- `generics` and `mw` now exposed on main export
- Types for generics and middleware

Removed:
- `opts` block from main factory function



2.1.0 - 4 May 2018
===

Changed:
- Verify middleware renamed `isAuthedOn` -> `hasAuth`

Removed:
- `setOwnerId` middleware

Internal:
- Update comment style to JSDoc
- Added Type definitions for Context
- Improved documentation for Typing
- Updated Readme docs



2.0.0 - 12 December 2017
===

**Breaking changes**

Added:
- Typescript type definitions
- .editorconfig file

Removed:
- Events emitter in Fage
- Old `Scopes` module and methods

Changed:
- `onError` hook errors are suppressed
- RateLimit error code updated to 429
- Error constructor returns an `Error` type
- Updated npm dependencies
- Complete refactor and move of all middleware
- Using `ctx.input` for user input (not `ctx.raw`)



1.1.0 - 26 September 2017
===

Added:
- New `generics.remove` method
- Added `ratelimit` as error type

Changed:
- Switched `error` over to plain object
- Renamed `api` to `ctx` context object
- Updated npm dependencies
- Renamed error `msg` prop to `message`
- Enabled `error.<type>(msg)` simple message setting
- Enabled Postgres `returning=*` on generics.update method
- Updated `Not Logged In` message in verifyAuthed middleware



1.0.0 - 8 February 2017
===

Initial release
