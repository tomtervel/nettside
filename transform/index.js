var through = require('through2')

module.exports = transform

// WARN: Madness (thanks bankai)

function transform (opts) {
  var triggered = false
  return through(function (chunk, enc, next) {
    var string = chunk.toString()
    if (!triggered && string.indexOf('<html') === 0) {
      triggered = true
      var msg = '<html lang="no" dir="ltr"><script src="https://api.mapbox.com/mapbox-gl-js/v0.40.1/mapbox-gl.js"></script><link href="https://api.mapbox.com/mapbox-gl-js/v0.40.1/mapbox-gl.css" rel="stylesheet" />'
      this.push(new Buffer(msg))
      next()
    } else if (string.indexOf(`onload="this.rel='stylesheet'"`) > 0) {
      var msg = string.replace(`<link rel="preload" as="style"`, '<link rel="stylesheet"')
      this.push(new Buffer(msg))
      next()
    } else {
      this.push(chunk)
      next()
    }
  })
}
