var app = require('choo')()
var html = require('choo/html')
var persist = require('choo-persist')
var md = require('marked')
var css = require('sheetify')
var fs = require('fs')

var logo = fs.readFileSync(__dirname + '/assets/logo.svg')
var pagesFolder = fs.readdirSync(__dirname + '/assets/pages')
var footerMarkdown = fs.readFileSync(__dirname + '/assets/footer.md', 'utf-8')

app.use(persist())
app.use(markdownPages(pagesFolder))
app.route('/:page', mainView)
app.mount('body')

if (process.env.NODE_ENV !== 'production') {
  app.use(require('choo-log')())
  document.body.classList.add('debug-grid-16')
}

css('tachyons')
css`
  html {
    height: 100%;
  }
  header, main, footer {
    flex-shrink: 0;
  }
  .unselectable {
    user-select: none;
    -moz-user-select: none;
  }`

function mainView (state, emit) {
  return html`
    <body class='flex flex-column justify-between items-center h-100 bg-washed-yellow black sans-serif'>
      ${header(state, emit)}
      <iframe width="100%" height="350" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="//www.openstreetmap.org/export/embed.html?bbox=10.951952934265138%2C59.64363172482308%2C11.061000823974611%2C59.671749816409886&amp;layer=hot" style="border: 1px solid transparent"></iframe>
      ${pageContent(state, emit)}
      ${footer(state, emit)}
    </body>
  `
}
function header (state, emit) {
  return html`
    <header class="mw8 w-100 pa4-m pa5-l pa2 unselectable flex flex-column flex-row-ns justify-between">
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
    <main class="w-100 pb3 f3-ns flex flex-column" id="content">
      ${toHtml(md(state.pages[pagekey].markdown))}
    </main>
  `
}

function footer (state, emit) {
  return html`
      <footer class="mw8 w-100 pv4">
        ${toHtml(md(footerMarkdown))}
      </footer>
    `
}

function toHtml (src) {
  var el = document.createElement('div')
  el.innerHTML = src.trim()
  el.childNodes.forEach(formatMarkdown)
  el.classList.value = 'items-center flex flex-column'
  return el
}

function formatMarkdown (el, i) {
  if (el.classList !== undefined) {
    var nodeName = el.nodeName.toLowerCase()
    if (nodeName === 'h1' && i === 0) el.classList.value = 'f-5-ns tc lh-solid'
    if (nodeName === 'p' && i === 1) el.classList.value = 'f-4 lh-copy'
    if (nodeName === 'h2') el.classList.value = 'f1 lh-title'
    if (nodeName === 'pre') el.classList.value = 'f3 bg-dark-gray mw9 pa4 tl overflow-y-auto'
    if (nodeName === 'ul') el.classList.value = 'list lh-copy'
    if (nodeName === 'table') el.classList.value = 'w-100'
    el.classList.add('ph4-ns', 'ph5-l', 'ph2', 'mw8', 'w-100')
  }
}

function markdownPages (pagesFolder) {
  return function markdownLoader (state, emitter) {
    if (!state.pages) state.pages = {}

    emitter.on('DOMContentLoaded', function () {
      // Populate an object map of urls with titlecasing, filename and markdown keys
      var pages = pagesFolder.reduce(function (acc, page) {
        var path = page !== 'index.md' ? '/' + page.slice(0, page.indexOf('.md')) : '/'
        acc[path] = { file: page, markdown: '', title: toProperCase(page.slice(0, page.indexOf('.md'))) }
        return acc
      }, {})

      // If there are any pages that's been removed, remove them from potential persistant state
      Object.keys(state.pages).filter(function (path) {
        return !pages[path]
      }).forEach(function (path) {
        delete state.pages[path]
      })

      // Populate state with new pages and update markdown markdown
      Object.keys(pages).forEach(function (path) {
        if (!state.pages[path]) state.pages[path] = pages[path]
        fetch('/assets/pages/' + pages[path].file).then(function (data) { return data.text() }).then(function (markdown) {
          state.pages[path].markdown = markdown
          emitter.emit('log:info', 'got markdown', markdown)
          if (path.slice(1) === state.params.page) emitter.emit('render')
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
