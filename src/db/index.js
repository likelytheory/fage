
let DB = require('./memory')

module.exports = DB
module.exports.useDB = nextDB => (DB = nextDB)
