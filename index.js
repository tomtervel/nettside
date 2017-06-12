var app = require('choo')()
var html = require('choo/html')
var persist = require('choo-persist')
var md = require('marked')
var css = require('sheetify')
var fs = require('fs')

var pageFolder = fs.readdirSync(__dirname + '/assets/pages')
var logo = fs.readFileSync(__dirname + '/assets/logo.svg')

var PAGES = pageFolder.reduce(function (acc, page) {
  var path = page !== 'index.md' ? '/' + page.slice(0, page.indexOf('.md')) : '/'
  acc[path] = { file: page, markdown: '', title: toProperCase(page.slice(0, page.indexOf('.md'))) }
  return acc
}, {})

css('tachyons')
css`
  html, body {
    height: 100%;
  }
  .unselectable {
    user-select: none;
    -moz-user-select: none;
  }
`
document.body.appendChild(document.createElement('div'))
document.body.classList.add('h-100', 'bg-washed-yellow', 'black', 'sans-serif')

app.use(persist())
app.use(markdownLoader)

if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-log')())
  document.body.classList.add('debug-grid-16')
}

app.route('/:page', mainView)

app.mount('div')

var logoAnimation = css`
  :host:hover svg #vel {
    fill: #fbf1a9 !important;
  }
  :host svg #vel {
    transition: fill .2s ease;
  } 
`

function mainView (state, emit) {
  return html`
    <div class='flex flex-column'>
      ${header(state, emit)}
      ${pageContent(state, emit)}
    </div>
  `
}
function header (state, emit) {
  return html`
    <header class="pa4-m pa5-l pa2 unselectable flex flex-column flex-row-ns justify-between">
      <h1 class="ma0 h3 h4-l">
        <img 
          class="logo h3 h4-l ${logoAnimation} ${state.params.page !== 'active' && 'pointer'}"
          ondragstart=${function () { return false }}
          onclick=${function () { emit('pushState', '/') }}
          src="data:image/svg+xml;base64,${btoa(String.fromCharCode.apply(null, new Uint8Array(logo)))}"
        />
        <span class="clip">Tomter Vel</span>
      </h1>
      <nav class="f3-l pt2 pt0-ns flex flex-column justify-center">
        ${menuElement(state, emit)}
      </nav>
    </header>
  `
}

function menuElement (state, emit) {
  return html`
    <ul class="list ma0 flex flex-column flex-row-reverse-ns pl1 pl4-ns content-end justify-center align-center">
      ${Object.keys(state.pages).map(function (path) {
        if (path === '/') return null
        return html`
          <li class="${path.slice(1) !== state.params.page ? 'pointer b' : 'bg-light-yellow'} pa1 hover-bg-light-yellow bg-animate"
            onclick=${function () { emit('pushState', path) }}>
            ${state.pages[path].title}
          </li>
        `
      })}
    </ul>
  `
}

function pageContent (state, emit) {
  return html`
    <main class="mw8 w-100 ph4-ns ph5-l pb3 ph2 f3-ns" id="content">
      ${toHtml(md(state.pages['/' + state.params.page].markdown))}
    </main>
  `
}

function toHtml (src) {
  var el = document.createElement('div')
  el.innerHTML = src.trim()
  el.childNodes.forEach(fmt)
  return el
  function fmt (el, i) {
    var nodeName = el.nodeName.toLowerCase()
    if (nodeName === 'h1' && i === 0) el.setAttribute('class', 'f-5-ns tc')
    if (nodeName === 'p' && i === 1) el.setAttribute('class', 'f-4')
    if (nodeName === 'h2') el.setAttribute('class', 'f1')
    if (nodeName === 'pre') el.setAttribute('class', 'f3 bg-dark-gray mw9 pa4 tl overflow-y-auto')
    if (nodeName === 'ul') el.setAttribute('class', 'f2 list b lh-copy')
    if (nodeName === 'table') el.setAttribute('class', 'w-100')
    return el
  }
}

function markdownLoader (state, emitter) {
  if (!state.pages) state.pages = {}
  emitter.on('DOMContentLoaded', function () {
    Object.keys(state.pages).filter(function (path) {
      return !PAGES[path]
    }).forEach(function (path) {
      delete state.pages[path]
    })
    Object.keys(PAGES).forEach(function (path) {
      if (!state.pages[path]) state.pages[path] = PAGES[path]
      fetch('/assets/pages/' + PAGES[path].file).then(function (data) { return data.text() }).then(function (markdown) {
        state.pages[path].markdown = markdown
        emitter.emit('log:info', 'got markdown', markdown)
        emitter.emit('render')
      }).catch(function (error) {
        emitter.emit('log:error', 'failed to fetch markdown', error)
      })
    })
  })
}

function toProperCase (str) {
  return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase() })
}
