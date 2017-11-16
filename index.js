/* eslint-disable no-path-concat */
require('dotenv').config()

var app = require('choo')()
var html = require('choo/html')
var raw = require('choo/html/raw')
var md = require('marked')
var persist = require('choo-persist')
var css = require('sheetify')
var fs = require('fs')

var MapBox = require('./mapbox')
var logo = fs.readFileSync(__dirname + '/assets/logo.svg', 'base64')
var pagesFolder = fs.readdirSync(__dirname + '/assets/pages')
var footerMarkdown = fs.readFileSync(__dirname + '/assets/footer.md', 'utf-8')
var tomterMap = null

css('tachyons')
css('./app.css')

app.use(persist())
app.use(markdownPages(pagesFolder))
app.use(init)
app.route('/*', mainView)

if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-log')())
  app.use(require('choo-devtools')())
}

if (!module.parent) app.mount('body')
else module.exports = app

function init (state, emitter) {
  state.language = 'no'
  state.title = 'Tomter Vel'
  state.mapSupport = true
  emitter.once(state.events.DOMCONTENTLOADED, function () {
    // redirect to content if we came from 404.html
    var redirect = window.sessionStorage.redirect
    delete window.sessionStorage.redirect
    if (redirect && redirect !== window.location.href) {
      window.history.replaceState(null, null, redirect)
    }
    state.mapSupport = require('mapbox-gl-supported')()
    if (state.mapSupport) {
      loadMapBox(() => {
        window.mapboxgl.accessToken = process.env.MAPBOX_TOKEN
        tomterMap = new MapBox()
        emitter.emit(state.events.RENDER)
      })
    }
  })
  function loadMapBox (callback) {
    var script = document.createElement('script')
    var style = document.createElement('link')
    script.addEventListener('load', callback)
    style.setAttribute('rel', 'stylesheet')
    script.setAttribute('src', 'https://api.mapbox.com/mapbox-gl-js/v0.42.0/mapbox-gl.js')
    style.setAttribute('href', 'https://api.mapbox.com/mapbox-gl-js/v0.42.0/mapbox-gl.css')
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
      acc[path] = { file: page, markdown: '', title: toTitleCase(page.slice(0, page.indexOf('.md'))) }
      if (!state.pages[path]) state.pages[path] = acc[path]
      app.route(path, mainView)
      return acc
    }, {})

    // If there are any pages that's been removed, remove them from potential persistant state
    Object.keys(state.pages).filter(function (path) {
      return !pages[path]
    }).forEach(function (path) {
      delete state.pages[path]
    })
    emitter.once('DOMContentLoaded', function () {
      // Populate state with new pages and update markdown
      Object.keys(pages).forEach(function (path) {
        window.fetch('/assets/pages/' + pages[path].file).then(function (data) { return data.text() }).then(function (markdown) {
          state.pages[path].markdown = markdown
          emitter.emit('log:info', 'got markdown', markdown)
          if (state.route === path) emitter.emit(state.events.RENDER)
        }).catch(function (error) {
          emitter.emit('log:error', 'failed to fetch markdown', error)
        })
      })
    })
     // Titlecasing function
    function toTitleCase (str) {
      return str.split(' ').map((w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase()).join(' ')
    }
  }
}

function mainView (state, emit) {
  return html`
    <body class="vh-100 flex flex-column justify-between items-center bg-washed-yellow black sans-serif">
      ${header(state, emit)}
      ${!state.pages[state.route]
        ? fourOhFour()
        : [
          state.mapSupport ? tomterMap ? tomterMap.render([11.000, 59.660]) : html`<div class="w-100 vh-50 map-brown"></div>` : null,
          pageContent(state, emit)
        ]
      }
      ${footer(state, emit)}
    </body>
  `
}
function header (state, emit) {
  return html`
    <header class="relative mw8 w-100 pa4-ns pv4-l ph5-l pa2 pv3 unselectable flex flex-column flex-row-ns justify-between">
      <h1 class="flex items-center ma0 h3 h3-l">
        <img 
          class="logo h2 h3-ns ${state.href ? 'pointer' : 'active'}"
          ondragstart=${function () { return false }}
          onclick=${function () { emit(state.events.PUSHSTATE, '/') }}
          src="data:image/svg+xml;base64,${logo}"
          rel="logo"
          role="presentation"
          alt="logo"
        />
        <span class="clip">Tomter Vel</span>
      </h1>
      <nav class="f3-l pt2 pt0-ns flex flex-column justify-center items-center-ns items-stretch align-center-ns">
        ${menuElements(state, emit)}
      </nav>
    </header>
  `
}

function menuElements (state, emit) {
  return html`
    <ul class="list ma0 flex flex-column flex-wrap-ns flex-row-ns pl0 pl4-ns content-end justify-center align-center">
      ${Object.keys(state.pages).sort().map(function (path) {
        if (path === '/') return null
        return html`
          <li id=${path} class="${path !== state.route ? 'pointer' : 'bg-light-yellow'} b pa1 ml2-ns hover-bg-light-yellow bn bb-ns bg-animate"
            onclick=${function () { emit(state.events.PUSHSTATE, path) }}>
            ${state.pages[path].title}
          </li>
        `
      })}
    </ul>
  `
}

function pageContent (state) {
  return html`
    <main class="w-100 pv5-l pv3 f6 f5-ns f4-l relative flex flex-column items-center bg-animate" id="content">
      <article class="flex flex-column mw8 ph4-ns ph2 ph5-l">
        ${raw(md(state.pages[state.route].markdown))}
      </article>
    </main>
  `
}

function footer () {
  return html`
    <footer class="w-100 flex flex-column items-center bg-vel-blue washed-red">
      <div class="mw8 pv4 ph4-ns ph2 ph5-l lh-copy">
        ${raw(md(footerMarkdown))}
      </div>
    </footer>
  `
}

function fourOhFour () {
  return html`
    <main class="w-100 tc pv6 ph3 red bg-animate" id="content">
      <h1 class="fw2">Vel, vel, vel…<br />Vi fant ikke siden du spurte etter.</h1>
    </main>
  `
}
