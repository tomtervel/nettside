const bankai = require('bankai/http')
const https = require('https')
const path = require('path')
const fs = require('fs')
const os = require('os')

const osascript = require('node-osascript')
const { spawnSync } = require('child_process')

process.env.NODE_ENV = 'test'

const CONFIG_DIR = path.join(os.homedir(), '.config/bankai')
const CERT_NAME = 'cert.pem'
const KEY_NAME = 'key.pem'
const CERT_LOCATION = path.join(CONFIG_DIR, CERT_NAME)
const KEY_LOCATION = path.join(CONFIG_DIR, KEY_NAME)

const opts = {
  key: fs.readFileSync(KEY_LOCATION),
  cert: fs.readFileSync(CERT_LOCATION)
}

const compiler = bankai(path.join(__dirname, 'index.js'))
const server = https.createServer(opts, function (req, res) {
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
  console.log('Server started, your browser should open to "https://localhost:8080"')
  if (process.platform === 'darwin') {
    osascript.execute('tell application "Safari" to open location "https://localhost:8080/"', function (err, result) {
      if (err) throw err
    })
  } else {
    const { error } = spawnSync('firefox', ['https://localhost:8080/'])
    if (error) throw error
  }
})
