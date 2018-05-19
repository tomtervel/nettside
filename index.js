/* eslint-disable no-path-concat */
require('dotenv').config()
require('babel-polyfill')

var assert = require('assert')
var app = require('choo')()
var html = require('choo/html')
var raw = require('choo/html/raw')
var md = require('markdown-it')({
  linkify: true,
  typographer: true,
  html: true
})
var css = require('sheetify')
var fs = require('fs')
var hypha = require('hypha')
var Page = require('nanopage')

var MapBox = require('./mapbox')
var logo = fs.readFileSync(__dirname + '/assets/logo.svg', 'base64')
var content = hypha.readSiteSync('./content', { parent: 'content' })
var tomterMap = null

css('tachyons')
css('./app.css')

if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-devtools')({
    filter: function (event) {
      return event !== 'DOMTitleChange'
    }
  }))
} else {
  for (var path in content) {
    app.route(path, mainView)
  }
  app.use(require('choo-service-worker')())
}
app.use(wrapper(content))
app.use(init)
app.route('*', mainView)

module.exports = app.mount('body')

function init (state, emitter) {
  state.language = 'no'
  state.site = 'Tomter Vel'
  emitter.once(state.events.DOMCONTENTLOADED, function () {
    tomterMap = new MapBox()
    emitter.emit(state.events.RENDER)
    emitter.on(state.events.PUSHSTATE, function () {
      window.scrollTo(0, 0)
    })
  })
}

function wrapper (siteContent) {
  return function (state, emitter, app) {
    state.content = Object.assign({}, siteContent)
    state.page = new Page(state)
  }
}

function mainView (state, emit) {
  var tittel = state.content[state.href || '/'] ? state.content[state.href || '/'].tittel : '404'
  emit(state.events.DOMTITLECHANGE, `${state.site}${tittel ? ` | ${tittel}` : ''}`)
  return html`
    <body class="vh-100 flex flex-column justify-between items-center bg-washed-yellow black sans-serif">
      ${header(state, emit)}
      ${contentView(state, emit)}
      ${footer(state.content['/'].footer)}
    </body>
  `
}

function contentView (state, emit) {
  var page = state.page().value()
  if (Object.keys(page).length === 0) return fourOhFour()
  var downloads = Object.keys(page.files).filter(function (file) {
    return !file.match('.jpg')
  }).map(function (file) {
    return page.files[file]
  })
  return [
    html`<div 
      class="${Array.isArray(page.kart) || 'dn'} skew-y origin-top-left h4 bg-washed-yellow w-100 z-1" 
      style="margin-top: -8rem; margin-bottom: -5em;">
    </div>`,
    mapView(page.kart, tomterMap),
    html`
      <main class="w-100 pb5-l pb3 f6 f5-ns f4-l relative flex flex-column items-center bg-animate z-2" id="content">
        <article class="mw8 ph4-ns ph2 ph5-l pb3 pb5-ns w-100">
          <header class="flex flex-column mb4 mb5-ns cf">
            <div
              class="skew-y origin-top-right w-100 pv3 bg-vel-blue ph2 white z-1"
              style=${page.kart ? 'margin-top: -3rem' : ''}>
              <h1 class="skew-counter origin-top-right w-100 mv0 bg f-1 f-4-ns tc rotate-tiny origin-top-right ">${page.tittel}</h1>
            </div>
            <div class="${page.dato || 'dn'} skew-y self-end w-50 origin-top-right bg-white vel-blue z-1 ba bw1" style="margin-top: -.75rem; margin-bottom: -1rem;">
              <h3 class="fw4 tr f-2 mv1 mh2 skew-counter" rel="date">${page.dato}</h3>
            </div> 
          </header>
          ${raw(md.render(page.beskrivelse || ''))}
          <section class=${downloads.length ? 'mv4' : 'dn'} rel="files">
            ${downloads.map(fileDownload)}
          </section>
          ${page.url === '/' ? null : state.page().pages().sortBy('url', 'desc').toArray().map(pageListing)}
        </article>
      </main>
    `
  ]
}

function mapView (coords, component) {
  if (!coords) return null
  if (!component) return html`<div class="w-100 vh-50 bg-map-accent z-0"></div>`
  return [
    component.render(coords)
  ]
}

function header (state, emit) {
  return html`
    <header class="relative mw8 w-100 pa4-ns pv4-l ph5-l pa2 pv3 unselectable flex flex-row justify-between z-2">
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
      <nav class="f3-l pt2 pt0-ns flex flex-column justify-top items-center-ns items-stretch align-center-ns">
        ${menuElements(state, emit)}
      </nav>
    </header>
  `
}

function menuElements (state, emit) {
  return html`<ul class="list ma0 flex flex-column flex-wrap-ns flex-row-ns pl0 pl4-ns lh-title content-end justify-center align-center">
    ${Object.keys(state.content).sort().map(navElement)}
  </ul>`
  function navElement (path) {
    var pathArray = path.split('/')
    if (path === '/' || pathArray.length > 2) return null
    var isCurrent = state.href.indexOf(pathArray[1]) === 1
    return html`<li class="mv2 mt0-ns tr mv1-ns">
      <a
        href=${path}
        class="${isCurrent ? 'bg-light-yellow' : 'pointer'} link b black pa1 ml2-ns hover-bg-light-yellow bn bb-ns bg-animate">
        ${state.content[path].tittel}
        </a>
      </li>
    `
  }
}

function pageListing (page) {
  assert.equal(typeof page.tittel, 'string')
  assert.equal(typeof page.beskrivelse, 'string')
  return html`
    <section class="pb3 pb4-ns">
      <a class="link vel-blue" href=${page.url}>
        <h1 class="mb0">${page.tittel}</h1>
      </a>
      ${page.dato ? html`<h5>${page.dato}</h5>` : null}
      ${raw(md.render(page.beskrivelse))}
      <hr class="b--none skew-y bg-vel-blue pt1 w-20 mt5"/>
    </section>
  `
}

function fileDownload (file) {
  assert.equal(typeof file.name, 'string')
  assert.equal(typeof file.path, 'string')
  return html`<a
    href=${file.path} 
    rel="noopener noreferrer"
    download
    target="_blank"
    class="link pa2 bg-white mh-2 br2 ba b download">
    ${file.name}
  </a>`
}

function footer (markdown) {
  assert.equal(typeof markdown, 'string', `markdown should be type string, but was ${JSON.stringify(markdown)}`)
  return html`
    <footer class="w-100 flex flex-column items-center bg-vel-blue washed-yellow">
      <div class="mw8 f6 f5-ns pv4 ph4-ns ph2 ph5-l lh-copy">
        ${raw(md.render(markdown))}
      </div>
    </footer>
  `
}

function fourOhFour () {
  return html`
    <main class="w-100 tc pv6 ph3 red bg-animate" id="content">
      <h1 class="fw2">
        Vel, vel, vel…
        <br/>
        Siden du ser etter har kanskje flyttet seg til et annet sted.
      </h1>
    </main>
  `
}
