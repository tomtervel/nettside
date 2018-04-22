/* eslint-disable no-path-concat */
require('dotenv').config()
require('babel-polyfill')

var assert = require('assert')
var app = require('choo')()
var html = require('choo/html')
var raw = require('choo/html/raw')
var md = require('markdown-it')({html: true})
var css = require('sheetify')
var fs = require('fs')
var hypha = require('hypha')
var Page = require('nanopage')

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
    emitter.on(state.events.PUSHSTATE, function () {
      window.scrollTo(0,0)
    })
  })
}

function wrapper (siteContent) {
  return function (state, emitter, app) {
    state.partials = Object.assign({}, siteContent['/partials'])
    delete siteContent['/partials']
    state.content = Object.assign({}, siteContent)
    state.page = new Page(state)
  }
}

function mainView (state, emit) {
  var page = state.page().value()
  emit(state.events.DOMTITLECHANGE, `${state.site}${page.tittel ? ` | ${page.tittel}` : ''}`)
  return html`
    <body class="vh-100 flex flex-column justify-between items-center bg-washed-yellow black sans-serif">
      ${header(state, emit)}
      ${!state.content[state.href || '/']
        ? fourOhFour()
        : [
          page.kart && page.kart.length >= 2
            ? tomterMap
              ? [ 
                html`<div class="skew-y origin-top-left h4 bg-washed-yellow w-100 z-1" style="margin-top: -8rem; margin-bottom: -5rem;"></div>`, 
                tomterMap.render(page.kart)
              ]
              : [
                html`<div class="skew-y origin-top-right h4 bg-washed-yellow w-100 z-1" style="margin-top: -8rem; margin-bottom: -5rem;"></div>`,
                html`<div class="w-100 vh-50 map-brown z-0"></div>`
              ]
            : null,
          pageContent(state, emit)
        ]
      }
      ${footer(state.partials.footer || '')}
    </body>
  `
}

function pageContent (state, emit) {
  var currentPage = state.page().value()
  return html`
    <main class="w-100 pb5-l pb3 f6 f5-ns f4-l relative flex flex-column items-center bg-animate z-2" id="content">
      <article class="mw8 ph4-ns ph2 ph5-l pb3 pb5-ns w-100">
        <header class="flex flex-column mb4 mb5-ns cf">
          <div
            class="skew-y origin-top-right w-100 pv3 bg-vel-blue ph2 white z-1"
            style=${currentPage.kart ? 'margin-top: -3rem' : ''}>
            <h1 class="skew-counter origin-top-right w-100 mv0 bg f-1 f-4-ns tc rotate-tiny origin-top-right ">${currentPage.tittel}</h1>
          </div>
          ${ currentPage.dato
            ? html`
              <div class="skew-y self-end w-50 origin-top-right bg-white vel-blue z-1 ba bw1" style="margin-top: -.75rem; margin-bottom: -1rem;">
                <h3 class="tr f-2 mv1 mh2 skew-counter" rel="date">${currentPage.dato}</h3>
              </div>
            ` 
            : null
          }
        </header>
        ${raw(md.render(currentPage.beskrivelse))}
        ${state.href !== '/'
          ? state.page().pages().sortBy('url', 'desc').toArray().map(pageListing)
          : null
        }
      </article>
    </main>
  `
}


function header (state, emit) {
  return html`
    <header class="relative mw8 w-100 pa4-ns pv4-l ph5-l pa2 pv3 unselectable flex flex-column flex-row-ns justify-between z-2">
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
  return html`
    <ul class="list ma0 flex flex-column flex-wrap-ns flex-row-ns pl0 pl4-ns  content-end justify-center align-center">
      ${Object.keys(state.content).sort().map(function (path) {
        var pathArray = path.split('/')
        var isCurrent = path !== state.href
        if (path === '/' || pathArray.length > 2) return null
        return html`
          <li class="mv2 mv0-ns">
            <a
              href=${path}
              class="${state.href.indexOf(pathArray[1]) !== 1 ? 'pointer' : 'bg-light-yellow'} link b black pa1 ml2-ns hover-bg-light-yellow bn bb-ns bg-animate"
            >
              ${state.content[path].tittel}
            </a>
          </li>
        `
      })}
    </ul>
  `
}

function pageListing (page) {
  return html`
    <section class="pb3 pb5-ns">
      <a class="link vel-blue" href=${page.url}>
        <h1 class="mb0">${page.tittel}</h1>
      </a>
      <h5>${page.dato}</h5>
      ${raw(md.render(page.beskrivelse))}
    </section>
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
      <h1 class="fw2">Vel, vel, vel…<br />Siden du søkte har enten flyttet på seg eller finnes ikke lenger.</h1>
    </main>
  `
}
