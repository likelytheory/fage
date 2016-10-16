
/**
  Sets up a generic log-levels compatible logger
  Intended to be replaced by something like Bunyan or Winston using .setLogger()
  @private
*/

function _createGenericLogger () {
  function _log () { console.log.apply(console, arguments) }
  const logLevels = ['trace', 'debug', 'info', 'warn', 'error']

  return logLevels.reduce((acc, level) => {
    acc[level] = _log.bind(null, level + ':')
    return acc
  }, {})
}

// Assign internal Log instance
let Log = _createGenericLogger()

/**
  Overwrites the internal generic Logger with `newLogger`
  @param {Object} newLogger Probably something like Bunyan or Winston
*/

const setLogger = newLogger => (Log = newLogger)

module.exports = Log
module.exports.setLogger = setLogger
