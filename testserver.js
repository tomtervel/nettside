const bankai = require('bankai/http')
const http = require('http')
const path = require('path')
const { spawnSync } = require('child_process')

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
  const { error } = spawnSync('osascript -e \'tell application "Safari" to activate\ntell application "Safari" to open location "http://localhost:8080"\'')
  if (error) {
    process.exit(1, error)
    console.log('No browser, please go to http://localhost:8080 to verify\n', error)
  }
})
