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
