const bankai = require('bankai/http')
const http = require('http')
const path = require('path')
const osascript = require('node-osascript')
const { spawnSync } = require('child_process')

process.env.NODE_ENV = 'test'

const compiler = bankai(path.join(__dirname, 'index.js'))
const server = http.createServer(function (req, res) {
  if (req.url === '/test/pass') {
    console.log('visual verification 👍')
    process.exit(0)
  } else if (req.url === '/test/fail') {
    console.log('visual verification 👎')
    process.exit(1)
  }
  compiler(req, res, function () {
    res.statusCode = 404
    res.end('not found')
  })
})

server.listen(8080, function () {
  console.log('Server started, your browser should open to "http://localhost:8080"')
  if (process.platform === 'darwin') {
    osascript.execute('tell application "Safari" to open location "http://localhost:8080/"', function (err, result) {
      if (err) throw err
    })
  } else {
    const { error } = spawnSync('firefox', ['http://localhost:8080/'])
    if (error) throw error
  }
})
