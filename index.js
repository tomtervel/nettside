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
var hypha = require('nanocontent')
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
}

for (var path in content) {
  app.route(path, mainView)
}

app.use(wrapper(content))
app.use(init)
if (process.env.NODE_ENV === 'test') app.use(visualVerification)
app.route('*', mainView)
app.use(require('choo-service-worker/clear')())

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

function visualVerification (state, emitter) {
  Object.assign(state, { testmode: true })
  Object.assign(state.events, { VERIFY_TEST: 'VERIFY_TEST' })
  emitter.once(state.events.DOMCONTENTLOADED, () => {
    app.route('/verified', verified)
    emitter.once(state.events.VERIFY_TEST, (pass) => {
      if (pass) {
        state.testmode = 'success'
        window.fetch('/test/pass')
      } else {
        state.testmode = 'fail'
        window.fetch('/test/fail')
      }
    })
  })
  function verified (state, emit) {
    return html`
      <body>
        <h1 class="tc">${state.testmode === 'success' ? 'Godt jobba!' : 'Til lykke med forbedringene.'}</h1>
      </body>`
  }
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
    <body class="relative flex flex-column justify-between items-center bg-washed-yellow black sans-serif">
      ${banner(state, emit)}
      ${header(state, emit)}
      ${contentView(state, emit)}
      ${footer(state.content['/'].footer)}
    </body>
  `
}

function banner (state, emit) {
  if (!state.testmode) return null
  return html`
    <div class="h-2 w-100 sticky top-0 z-4 flex pa2 bg-white justify-center bg-light-pink bold">
      <span>For at dine endringer skal bli lagt til må du visuelt verifisere endringene.</span>
      <a href="/verified" onclick=${() => emit(state.events.VERIFY_TEST, true)} class="link b green mh2">Ja, her ser det bra ut.</a>
      <a href="/verified" onclick=${() => emit(state.events.VERIFY_TEST, false)} class="link b red mh2">Nei, her må det mere til.</a>
    </div>
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
  var coverImages = Object.keys(page.files).filter(function (file) {
    return file.includes('cover.jpg')
  }).map(function (file) {
    return page.files[file]
  })
  return [
    html`<div 
      class="${Array.isArray(page.kart) || 'dn'} skew-y origin-top-left h4 bg-washed-yellow w-100 z-1" 
        style="margin-top: -8rem; margin-bottom: -5em; min-height: 5vmax;">
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
            <div class="${page.dato || page.avsluttet || 'invisible'} skew-y self-end w-50 origin-top-right bg-white vel-blue z-1 ba bw1" style="margin-top: -.75rem; margin-bottom: 2em;"> 
              <h3 class="fw4 tr f-2 mv1 mh2 skew-counter" rel="date">${page.dato || page.avsluttet}</h3>
            </div> 
          </header>
          <section class="flex flex-wrap items-center ${coverImages.length !== 0 || 'dn'}" style="margin-top: -3.8em;" rel="coverimage">
          ${coverImages.map(image => html`<img class="object-contain" src=${image.path} />`)}
          </section>
          ${raw(md.render(page.beskrivelse || ''))}
          <section class=${downloads.length ? 'mv4 flex flex-wrap' : 'dn'} rel="files">
            ${downloads.map(fileDownload)}
          </section>
          ${page.path.includes('komiteer') ? html`<a href="mailto:post+${encodeURIComponent(page.tittel.toLowerCase())}@tomtervel.no?subject=Inspill%20til%20${page.tittel}>Ta kontakt</a>` : null}
          ${page.url === '/'
        ? [
          html`
              <section rel="komiteer" class="mt4">
                <div
                  class="dib center pv3 bg-vel-blue ph2 white z-1">
                  <h1 class="mv0 bg f5 f3-ns mh2">Vi har komiteer for</h1>
                </div>
                <ul class="grid gg4 gtc-repeat justify-between items-baseline list pl0 mt4">${
            state.page('/komiteer').children()
              .sortBy('tittel', 'asc').toArray()
              .filter(page => !page.avsluttet)
              .map(frontedContent)
            }</ul>
              </section>
              `,
          state.page('/annonseringer').children().toArray().length > 0 ? html`
              <section rel="annonseringer">
                <div
                  class="dib center pv3 bg-vel-blue ph2 white z-1">
                  <h1 class="mv0 bg f5 f3-ns mh2">Siste Annonseringer</h1>
                </div>${state.page('/annonseringer').children().toArray().sort((a,b) => a.name < b.name)
              .map(pageListing)
            }</section>` : null
        ]
        : state.page().pages().sortBy('url', 'desc').toArray().map(pageListing)}
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
    if (path === '/' || pathArray.length > 2 || path === '/annonseringer') return null
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
  assert.strictEqual(typeof page.tittel, 'string', 'page listing is missing a title')
  assert.strictEqual(typeof page.beskrivelse, 'string', `page ${page.tittel} is missing a description`)
  var images = Object.keys(page.files).filter(function (file) {
    return file.includes('cover.jpg')
  }).map(function (file) {
    return page.files[file]
  })
  return html`
    <section class="pb3 pb4-ns">
      <a class="link vel-blue" href=${page.url}>
        <h1 class="mb0">${page.tittel}</h1>
      </a>
      ${page.dato ? html`<h5>${page.dato}</h5>` : null}
      ${page.avsluttet ? html`<h5>Avsluttet ${page.avsluttet}</h5>` : null}
      <section class="flex flex-wrap items-center" rel="images">${
    images.map(function (image) {
      return html`<img class="object-contain" src=${image.path} />`
    })
    }</section>
      ${raw(md.render(page.beskrivelse))}
      <hr class="b--none skew-y bg-vel-blue pt1 w-20 mt5"/>
    </section> 
  `
}

function frontedContent (page) {
  if (page.avsluttet) return null
  return html`
    <a href=${page.url} class="bg-vel-blue link br3 flex-auto shadow-hover shadow-1">
      <h4 class="white pv0 mt3 mb1 mh2 ph2 f4">${page.tittel}</h4>
      ${page.beskrivelse ? html`<div class="db pa2 mh3 br2 black no-underline bg-white">
        ${page.beskrivelse.length > 140 ? raw(md.render(page.beskrivelse.slice(0, 140) + '…')) : raw(md.render(page.beskrivelse))}
        </div>`
      : null} 
    </a>
  `
}

function fileDownload (file) {
  assert.strictEqual(typeof file.name, 'string')
  assert.strictEqual(typeof file.path, 'string')
  return html`<a
    href=${file.path} 
    rel="noopener noreferrer"
    download
    target="_blank"
    class="link pa2 bg-white ma1 br2 ba b download">
    ${file.name}
  </a>`
}

function footer (markdown) {
  assert.strictEqual(typeof markdown, 'string', `markdown should be type string, but was ${JSON.stringify(markdown)}`)
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
    <main class="w-100 tc pv6 ph3 red" id="content">
      <h1 class="fw2">
        Vel, vel, vel…
        <br/>
        Siden du ser etter har kanskje flyttet seg til et annet sted.
      </h1>
    </main>
  `
}
