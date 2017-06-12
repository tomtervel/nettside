var app = require('choo')()
var html = require('choo/html')
var persist = require('choo-persist')
var md = require('marked')
var css = require('sheetify')
var fs = require('fs')

var logo = fs.readFileSync(__dirname + '/assets/logo.svg')
var pagesFolder = fs.readdirSync(__dirname + '/assets/pages')
var footerMarkdown = fs.readFileSync(__dirname + '/assets/footer.md', 'utf-8')

document.body.appendChild(document.createElement('div'))
document.body.classList.add('h-100', 'bg-washed-yellow', 'black', 'sans-serif')

app.use(persist())
app.use(markdownPages(pagesFolder))
app.route('/:page', mainView)
app.mount('div')

if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-log')())
  document.body.classList.add('debug-grid-16')
}

css('tachyons')
css`
  html, body {
    height: 100%;
  }
  .unselectable {
    user-select: none;
    -moz-user-select: none;
  }`

function mainView (state, emit) {
  return html`
    <div class='flex flex-column items-stretch h-100'>
      ${header(state, emit)}
      ${pageContent(state, emit)}
      ${footer(state, emit)}
    </div>
  `
}
function header (state, emit) {
  return html`
    <header class="mw8 center w-100 pa4-m pa5-l pa2 unselectable flex flex-column flex-row-ns justify-between">
      <h1 class="ma0 h3 h4-l">
        <img 
          class="logo h3 h4-l ${state.params.page !== 'active' && 'pointer'}"
          ondragstart=${function () { return false }}
          onclick=${function () { emit('pushState', '/') }}
          src="data:image/svg+xml;base64,${btoa(String.fromCharCode.apply(null, new Uint8Array(logo)))}"
        />
        <span class="clip">Tomter Vel</span>
      </h1>
      <nav class="f3-l pt2 pt0-ns flex flex-column justify-center">
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
  var pagekey = '/' + state.params.page
  if (!state.pages[pagekey]) return null
  return html`
    <main class="self-stretch w-100 pb3 f3-ns" id="content">
      ${toHtml(md(state.pages[pagekey].markdown))}
    </main>
  `
}
function footer (state, emit) {
  return html`
      <footer class="mw8 w-100 center">
        ${toHtml(md(footerMarkdown))}
      </footer>
    `
}
function toHtml (src) {
  var el = document.createElement('div')
  el.innerHTML = src.trim()
  el.childNodes.forEach(fmt)
  return el
  function fmt (el, i) {
    if (el.classList !== undefined) {
      var nodeName = el.nodeName.toLowerCase()
      if (nodeName === 'h1' && i === 0) el.classList.value = 'f-5-ns tc'
      if (nodeName === 'p' && i === 1) el.classList.value = 'f-4'
      if (nodeName === 'h2') el.classList.value = 'f1'
      if (nodeName === 'pre') el.classList.value = 'f3 bg-dark-gray mw9 pa4 tl overflow-y-auto'
      if (nodeName === 'ul') el.classList.value = 'f2 list b lh-copy'
      if (nodeName === 'table') el.classList.value = 'w-100'
      el.classList.add('ph4-ns', 'ph5-l', 'ph2', 'mw8', 'center')
    }
    return el
  }
}

function markdownPages (pagesFolder) {
  return function markdownLoader (state, emitter) {
    if (!state.pages) state.pages = {}

    emitter.on('DOMContentLoaded', function () {
      // List of static pages

      // Populate an object map of urls with titlecasing, filename and markdown keys
      var PAGES = pagesFolder.reduce(function (acc, page) {
        var path = page !== 'index.md' ? '/' + page.slice(0, page.indexOf('.md')) : '/'
        acc[path] = { file: page, markdown: '', title: toProperCase(page.slice(0, page.indexOf('.md'))) }
        return acc
      }, {})

      // If there are any pages that's been removed, remove them from potential persistant state
      Object.keys(state.pages).filter(function (path) {
        return !PAGES[path]
      }).forEach(function (path) {
        delete state.pages[path]
      })

      // Populate state with new pages and updated markdown
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

      // Titlecasing function
      function toProperCase (str) {
        return str.replace(/\w\S*/g, function (txt) { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase() })
      }
    })
  }
}
