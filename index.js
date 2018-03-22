/* eslint-disable no-path-concat */
require('dotenv').config()

var assert = require('assert')
var app = require('choo')()
var html = require('choo/html')
var raw = require('choo/html/raw')
var md = require('markdown-it')({html: true})
var css = require('sheetify')
var fs = require('fs')
var hypha = require('hypha')

var MapBox = require('./mapbox')
var logo = fs.readFileSync(__dirname + '/assets/logo.svg', 'base64')

var tomterMap = null

css('tachyons')
css('./app.css')

var content = hypha.readSiteSync('./content', { parent: 'content' })

app.use(wrapper(content))
app.use(init)

Object.keys(content).forEach(function (path) {
  if (path === '/partials') return
  app.route(path, mainView)
})

app.route('/*', mainView)

if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-devtools')())
} else {
  app.use(require('choo-service-worker')())
}

module.exports = app.mount('body')

function init (state, emitter) {
  state.language = 'no'
  state.site = 'Tomter Vel'
  emitter.once(state.events.DOMCONTENTLOADED, function () {
    tomterMap = new MapBox()
    emitter.emit(state.events.RENDER)
  })
}

function wrapper (siteContent) {
  return function (state, emitter, app) {
    state.partials = Object.assign({}, siteContent['/partials'])
    delete siteContent['/partials']
    state.pages = Object.assign({}, siteContent) 
  }
}

function mainView (state, emit) {
  var page = state.pages[state.href || '/']
  emit(state.events.DOMTITLECHANGE, `${state.site}${page.tittel ? ` | ${page.tittel}` : ''}`)
  return html`
    <body class="vh-100 flex flex-column justify-between items-center bg-washed-yellow black sans-serif">
      ${header(state, emit)}
      ${ !state.pages[state.href || '/'] 
        ? fourOhFour()
        : [
          page.kart && page.kart.length >= 2  
          ? tomterMap 
          ? tomterMap.render(page.kart)
          : html`<div class="w-100 vh-50 map-brown"></div>`
          : null,
          pageContent(state, emit)
        ]
      }
      ${footer(state.partials.footer || '')}
    </body>
  `
}

function pageContent (state, emit) {
  assert(state.pages[state.href || '/'], ` should be type string, but was ${JSON.stringify(state.pages[state.href || '/'])}`)
  // Help, I wrote a hack II
  var childPages = state.href === '' ? null : Object.keys(state.pages).filter(path => {
    return Object.keys(state.pages[state.href].pages).find(p => path.indexOf(p) > 0)
  }).map(path => state.pages[path]).sort((a, b) => b.dato - a.dato).reverse()
  return html`
    <main class="w-100 pv5-l pv3 f6 f5-ns f4-l relative flex flex-column items-center bg-animate" id="content">
      <article class="flex flex-column mw8 ph4-ns ph2 ph5-l pb5 w-100">
        <h1 class="tc">${state.pages[state.href || '/'].tittel}</h1>
        ${raw(md.render(state.pages[state.href || '/'].beskrivelse))}
      </article>
      ${ childPages
        ? childPages.map(page => html`
          <article class="flex flex-column mw8 w-100 ph4-ns ph2 ph5-l pb5 ml-auto mr-auto">
            <a class="link vel-blue" href=${page.url}>
              <h1 class="mb0">${page.tittel}</h1>
            </a>
            <h5>${page.dato}</h5>
            ${raw(md.render(page.beskrivelse))}
          </article>
          `)
        : null 
      }
    </main>
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
        var pathArray = path.split('/')
        if (path === '/' || pathArray.length > 2) return null
        return html`
          <li
            id=${path}
            class="${state.href.indexOf(pathArray[1]) !== 1 ? 'pointer' : 'bg-light-yellow'} b pa1 ml2-ns hover-bg-light-yellow bn bb-ns bg-animate"
            onclick=${function () { if (path !== state.href) emit(state.events.PUSHSTATE, path) }}
          >
            ${state.pages[path].tittel}
          </li>
        `
      })}
    </ul>
  `
}

function footer (markdown) {
  assert.equal(typeof markdown, 'string', `markdown should be type string, but was ${JSON.stringify(markdown)}`)
  return html`
    <footer class="w-100 flex flex-column items-center bg-vel-blue washed-yellow">
      <div class="mw8 pv4 ph4-ns ph2 ph5-l lh-copy">
        ${raw(md.render(markdown))}
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
