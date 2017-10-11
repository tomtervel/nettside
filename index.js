require('dotenv').config()

var app = require('choo')()
var html = require('choo/html')
var raw = require('choo/html/raw')
var md = require('marked')
var persist = require('choo-persist')
var css = require('sheetify')
var fs = require('fs')

var MapBox = require('./mapbox')
var logo = fs.readFileSync(__dirname + '/assets/logo.svg')
var pagesFolder = fs.readdirSync(__dirname + '/assets/pages')
var footerMarkdown = fs.readFileSync(__dirname + '/assets/footer.md', 'utf-8')
var map = null

css('tachyons')
css`
  html {
    min-height: 100%;
  }
  a, a:hover, a:visited {
    color: rgb(23, 133, 194);
  }
  header, main, footer, div {
    flex-shrink: 0;
  }
  #content div > *:first-child {
    text-align: center;
  }
  #content {
    min-height: 50vh;
  }
  #content ul {
    line-height: 1.75em;
  }
  footer {
    background-color: rgb(23, 133, 194);
  }
  footer a, footer a:hover, footer a:visited {
    color: white;
  }
  .map-brown {
    background-color: rgb(183,174,156);
  }
  .unselectable {
    user-select: none;
    -moz-user-select: none;
  }`

app.use(persist())
app.use(markdownPages(pagesFolder))
app.use(init)
app.route('/', mainView)

if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-log')())
  app.use(require('choo-devtools')())
}

if (!module.parent) app.mount('body')
else module.exports = app

function init (state, emitter) {
  state.language = 'no'
  emitter.emit(state.events.DOMTITLECHANGE, 'Tomter Vel')
  emitter.once(state.events.DOMCONTENTLOADED, function () {
    // redirect to content if we came from 404.html
    var redirect = window.sessionStorage.redirect
    delete window.sessionStorage.redirect
    if (redirect && redirect !== window.location.href) {
      window.history.replaceState(null, null, redirect)
    }

    loadMapBox(() => {
      window.mapboxgl.accessToken = process.env.MAPBOX_TOKEN
      map = new MapBox()
      emitter.emit(state.events.RENDER)
    })
  })
  function loadMapBox (callback) {
    var script = document.createElement('script')
    var style = document.createElement('link')
    script.addEventListener('load', callback)
    style.setAttribute('rel', 'stylesheet')
    script.setAttribute('src', 'https://api.mapbox.com/mapbox-gl-js/v0.40.1/mapbox-gl.js')
    style.setAttribute('href', 'https://api.mapbox.com/mapbox-gl-js/v0.40.1/mapbox-gl.css')
    document.head.appendChild(script)
    document.head.appendChild(style)
  }
}

function markdownPages (pagesFolder) {
  return function markdownLoader (state, emitter) {
    if (!state.pages) state.pages = {}
    // Populate an object map of urls with titlecasing, filename and markdown keys
    var pages = pagesFolder.reduce(function (acc, page) {
      var path = page !== 'index.md' ? '/' + page.slice(0, page.indexOf('.md')) : '/'
      app.route(path, mainView)
      acc[path] = { file: page, markdown: '', title: toProperCase(page.slice(0, page.indexOf('.md'))) }
      return acc
    }, {})

    // If there are any pages that's been removed, remove them from potential persistant state
    Object.keys(state.pages).filter(function (path) {
      return !pages[path]
    }).forEach(function (path) {
      delete state.pages[path]
    })
    emitter.once('DOMContentLoaded', function () {
      // Populate state with new pages and update markdown markdown
      Object.keys(pages).forEach(function (path) {
        if (!state.pages[path]) state.pages[path] = pages[path]
        window.fetch('/assets/pages/' + pages[path].file).then(function (data) { return data.text() }).then(function (markdown) {
          state.pages[path].markdown = markdown
          emitter.emit('log:info', 'got markdown', markdown)
          if ((state.href || '/') === path) emitter.emit(state.events.RENDER)
        }).catch(function (error) {
          emitter.emit('log:error', 'failed to fetch markdown', error)
        })
      })
    })
     // Titlecasing function
    function toProperCase (str) {
      return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase() })
    }
  }
}

function mainView (state, emit) {
  return html`
    <body class="vh-100 flex flex-column justify-between items-center bg-washed-yellow black sans-serif">
      ${header(state, emit)}
      ${map ? map.render([11.000, 59.660]) : html`<div class="mb4 w-100 vh-50 h4 map-brown"></div>`}
      ${pageContent(state, emit)}
      ${footer(state, emit)}
    </body>
  `
}
function header (state, emit) {
  return html`
    <header class="mw8 w-100 pa4-ns pv4-l ph5-l pa2 pv3 unselectable flex flex-column flex-row-ns justify-between">
      <h1 class="flex items-center ma0 h3 h3-l">
        <img 
          class="logo h2 h3-ns ${state.href ? 'pointer' : 'active'}"
          ondragstart=${function () { return false }}
          onclick=${function () { emit(state.events.PUSHSTATE, '/') }}
          src="data:image/svg+xml;base64,${process ? logo.toString('base64') : window.btoa(String.fromCharCode.apply(null, new Uint8Array(logo)))}"
        />
        <span class="clip">Tomter Vel</span>
      </h1>
      <nav class="f3-l pt2 pt0-ns flex flex-column justify-center items-center-ns items-stretch align-center-ns">
        ${menuElement(state, emit)}
      </nav>
    </header>
  `
}

function menuElement (state, emit) {
  return html`
    <ul class="list ma0 flex flex-column flex-wrap-ns flex-row-reverse-ns pl0 pl4-ns content-end justify-center align-center">
      ${Object.keys(state.pages).map(function (path) {
        if (path === '/') return null
        return html`
          <li class="${path.slice(1) !== state.href ? 'pointer' : 'bg-light-yellow'} b pa1 hover-bg-light-yellow bn bb-ns bg-animate tracked-tight"
            onclick=${function () { emit(state.events.PUSHSTATE, path) }}>
            ${state.pages[path].title}
          </li>
        `
      })}
    </ul>
  `
}

function pageContent (state, emit) {
  var pagekey = state.href || '/'
  if (!state.pages[pagekey]) return html`<div class="vh-50"></div>`
  return html`
    <main class="w-100 pb4 f6 f5-ns f4-l flex flex-column items-center lh-copy" id="content">
      <div class="flex flex-column mw8 ph4-ns ph2 ph5-l">
        ${raw(md(state.pages[pagekey].markdown))}
      </div>
    </main>
  `
}

function footer (state, emit) {
  return html`
    <footer class="w-100 flex flex-column items-center washed-yellow">
      <div class="mw8 pv4 ph4-ns ph2 ph5-l lh-copy">
        ${raw(md(footerMarkdown))}
      </div>
    </footer>
  `
}
