const bankai = require('bankai/http')
const http = require('http')
const path = require('path')
const osascript = require('node-osascript');

process.env.NODE_ENV = 'test'

const compiler = bankai(path.join(__dirname, 'index.js'))
const server = http.createServer(function (req, res) {
  if (req.url === '/test/pass') {
    process.exit(0)
  } else if (req.url === '/test/fail') {
    process.exit(1)
  }
  compiler(req, res, function () {
    res.statusCode = 404
    res.end('not found')
  })
})

server.listen(8080, function () {
  osascript.execute('tell application "Safari" to make new document with properties {URL:"http://localost:8080"}', function (err, result, raw) {
    if (err) throw err
  })
})
