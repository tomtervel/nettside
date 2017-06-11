var app = require('choo')()
var html = require('choo/html')
var persist = require('choo-persist')
var md = require('marked')
var css = require('sheetify')
var fs = require('fs')

var pageFolder = fs.readdirSync(__dirname + '/assets/pages')

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
  :host:hover #vel {
    fill: #fbf1a9;
  }
  :host #vel {
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
    <header class="pa4-ns unselectable flex flex-column flex-row-ns justify-content ph2">
      <img 
        class="logo h3 ${logoAnimation} ${state.params.page !== 'active' && 'pointer'}"
        ondragstart=${function () { return false }}
        onclick=${function () { emit('pushState', '/') }}
        src="data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKIHdpZHRoPSI0MjUyLjAwMDAwMHB0IiBoZWlnaHQ9IjE3MjIuMDAwMDAwcHQiIHZpZXdCb3g9IjAgMCA0MjUyLjAwMDAwMCAxNzIyLjAwMDAwMCIKIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiPgo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLjAwMDAwMCwxNzIyLjAwMDAwMCkgc2NhbGUoMC4xMDAwMDAsLTAuMTAwMDAwKSIKc3Ryb2tlPSJub25lIj4KPGcgaWQ9InRvbXRlciIgZmlsbD0iIzAwMDAwMCI+CjxwYXRoIGQ9Ik0xNzI5MCAxMjAzMCBsMCAtMzI5MCA0NjUgMCA0NjUgMCAwIDE1NzUgMCAxNTc1IDM2MCAwIDM2MCAwIDAgNDM1CjAgNDM1IC0zNjAgMCAtMzYwIDAgMCAxMjgwIDAgMTI4MCAtNDY1IDAgLTQ2NSAwIDAgLTMyOTB6Ii8+CjxwYXRoIGQ9Ik0yMjgwIDE0NjQ1IGwwIC00NTUgNzMwIDAgNzMwIDAgMCAtMjcyNSAwIC0yNzI1IDQ4MyAyIDQ4MiAzIDMgMjcyMwoyIDI3MjIgNzI1IDAgNzI1IDAgMCA0NTUgMCA0NTUgLTE5NDAgMCAtMTk0MCAwIDAgLTQ1NXoiLz4KPHBhdGggZD0iTTc1NjAgMTI4NjMgYy0yNzYgLTI3IC00NzIgLTc1IC02ODUgLTE2NyAtNTM0IC0yMzAgLTk4MCAtNzEwIC0xMTU5Ci0xMjQ4IC0xMjMgLTM2OCAtMTM5IC04MTcgLTQ1IC0xMjIxIDExOCAtNTA2IDQzNSAtOTU2IDg4NyAtMTI2MCAxMDQgLTcwIDMzNgotMTg1IDQ0NyAtMjIyIDI1NCAtODQgNDIzIC0xMDkgNzI1IC0xMTAgMjQ4IDAgMzM2IDggNTI3IDUxIDc5OCAxNzcgMTQzMSA4MTMKMTU4NyAxNTk0IDExNiA1ODMgMTQgMTE3NCAtMjgxIDE2MjAgLTk3IDE0NiAtMTcyIDIzNyAtMzA0IDM2NiAtMzYwIDM1MCAtNzg2CjU0NyAtMTI4OSA1OTMgLTEwNyAxMCAtMzI5IDEyIC00MTAgNHogbTQyMSAtODU4IGM0ODAgLTc5IDgyNCAtNDI3IDkyNCAtOTMyCjM0IC0xNzIgMzYgLTQ4MCA0IC02NDMgLTM2IC0xODggLTEyNCAtMzk3IC0yMTggLTUyMSAtMTAyIC0xMzQgLTI2NSAtMjY5Ci0zOTYgLTMyOSAtMTY2IC03NCAtMjgxIC0xMDAgLTQ4NSAtMTA3IC0yNjEgLTkgLTQyNCAyMiAtNjE1IDExNyAtMzEzIDE1NQotNTEwIDQyNSAtNTk3IDgxNyAtMTkgODYgLTIyIDEyOSAtMjIgMzQzIDAgMjE0IDMgMjU3IDIxIDM0MCA0MSAxODIgMTE3IDM1NQoyMTMgNDgxIDcyIDk2IDIxNyAyMzAgMzEyIDI4OSAyMzIgMTQyIDU0OSAxOTYgODU5IDE0NXoiLz4KPHBhdGggZD0iTTEyMjgwIDEyODU1IGMtMjM5IC0zNCAtMzk2IC0xMjAgLTYzOCAtMzUwIGwtMTEyIC0xMDcgMCAxODEgMCAxODEKLTQ2NSAwIC00NjUgMCAwIC0yMDEwIDAgLTIwMTAgNDY1IDAgNDY1IDAgMCAxMDg4IGMwIDEwNzcgNSAxMjY5IDM1IDE0NjIgNzgKNDkyIDMwNCA3MzAgNjk1IDczMSAxMTAgMCAxOTIgLTE2IDI1OCAtNTAgMTQ1IC03NSAyNDcgLTIyMyAzMDUgLTQ0MSA2NCAtMjM5CjY3IC0zMjQgNjcgLTE2NDMgbDAgLTExNDcgNDY4IDIgNDY3IDMgNiAxMjA1IGM2IDEyMjggNiAxMjQ3IDQ1IDE0NDAgODcgNDMwCjMwMCA2MzAgNjcwIDYzMSAxODUgMCAzMDYgLTQ0IDQwNyAtMTUwIDk4IC0xMDIgMTQ4IC0yMzQgMTg4IC00OTcgOSAtNTggMTQKLTQyMyAxOCAtMTM1NCBsNiAtMTI3NSA0NjggLTMgNDY4IC0yIC00IDEzOTIgYy0zIDEyNjIgLTUgMTQwNCAtMjEgMTUwOCAtNjIKNDE1IC0xNzkgNjg1IC0zODUgODkwIC0xODUgMTg1IC00MTQgMjg4IC03MjEgMzI1IC01NjYgNjkgLTEwNDUgLTExNCAtMTM3MAotNTI2IGwtMzcgLTQ3IC00NCA2MSBjLTIzIDM0IC03OSA5OSAtMTIzIDE0NSAtMjg4IDMwMCAtNjc3IDQyOCAtMTExNiAzNjd6Ii8+CjxwYXRoIGQ9Ik0yMTE5MCAxMjg2MyBjLTQ2OSAtMzYgLTg3NCAtMjIxIC0xMTc3IC01MzYgLTMxOSAtMzMyIC01MDIgLTc2MgotNTU0IC0xMzAyIC0xNSAtMTU4IC02IC01NTUgMTYgLTY5NSA4MyAtNTI3IDI5NiAtOTQyIDYzOCAtMTI0MSAzNzIgLTMyNCA4MzUKLTQ3NCAxNDA3IC00NTYgMjY0IDkgNDM5IDM4IDY0NSAxMDggNDIyIDE0MyA3ODEgNDUwIDEwODYgOTI4IDYzIDk5IDc3IDEyNwo2NyAxMzYgLTEwIDkgLTQxMCAyMzMgLTc2OSA0MzEgLTQgMiAtMjggLTI5IC01NCAtNjkgLTk0IC0xNDMgLTI0NCAtMzM0IC0zMjkKLTQxOSAtMTM2IC0xMzcgLTI1MSAtMjA2IC00MjAgLTI1MSAtNzEgLTE5IC0xMDYgLTIyIC0yODEgLTIxIC0xNzIgMCAtMjExIDMKLTI3NiAyMiAtMjg4IDc5IC01MDYgMjYwIC02MzMgNTI1IC03MCAxNDYgLTEwNCAyNjcgLTEyNCA0NDAgbC04IDY3IDE0MzIgMAoxNDMyIDAgNyA4MCBjMTMgMTUwIC05IDQ4NyAtNDYgNzAwIC0xMjYgNzIwIC01NTEgMTI0OCAtMTE3MCAxNDU0IC0yNTAgODQKLTU5MyAxMjIgLTg4OSA5OXogbTQxMCAtODU0IGMzMzggLTQ5IDU4MSAtMjYzIDcwMSAtNjE3IDE2IC00NyAyOSAtODcgMjkgLTg5CjAgLTIgLTQxNCAtMyAtOTIwIC0zIGwtOTIwIDAgNiAyOCBjMTQgNTkgODAgMjAxIDEzMSAyODAgMTUxIDIzNSA0MDggMzg4IDY4OAo0MTEgOTMgOCAxODAgNSAyODUgLTEweiIvPgo8cGF0aCBkPSJNMjU5NjUgMTI4NTYgYy0yMzcgLTQwIC00MDYgLTEzMiAtNjIyIC0zNDAgbC0xMTMgLTEwOCAwIDE3NiAwIDE3NgotNDY1IDAgLTQ2NSAwIDAgLTIwMTAgMCAtMjAxMCA0NjMgMiA0NjIgMyA2IDExNzUgYzYgMTI4MCA0IDEyNDIgNjQgMTQ2OSA0NwoxNzQgMTE5IDMwNSAyMjEgNDAyIDExOCAxMTEgMjM2IDE1OCA0MTYgMTY2IDE3OSA5IDMxMiAtMjYgNDY4IC0xMjMgNDEgLTI1CjgwIC00OCA4NyAtNTEgOCAtMyA5MCAxNTAgMjIzIDQxNiAxMTUgMjMyIDIxMCA0MjUgMjEwIDQyOSAwIDE0IC0yNTUgMTM3Ci0zNDQgMTY3IC0xOTYgNjYgLTQzOCA5MCAtNjExIDYxeiIvPgo8L2c+CjxnIGlkPSJ2ZWwiIGZpbGw9InJnYigyMywgMTMzLCAxOTQpIiA+CjxwYXRoIGQ9Ik0yNzAwMiAxNTMwMyBjMyAtMTAgMTA1NyAtMjU5OSAyMzQzIC01NzUzIDEyODUgLTMxNTQgMjUxMyAtNjE2NwoyNzI4IC02Njk1IDIxNSAtNTI4IDM5MiAtOTYyIDM5NCAtOTY0IDIgLTIgNiAtMiA5IDIgNiA1IDI2ODQgNjQxNiAyNjg0IDY0MjQKMCAxIC0yMjMgMyAtNDk1IDMgbC00OTUgMCAtMTggLTM3IGMtMTAgLTIxIC0zODcgLTk1MCAtODM4IC0yMDY0IC00NTAgLTExMTUKLTgyMSAtMjAyNSAtODI0IC0yMDIzIC0yIDMgLTEwMDIgMjUwNiAtMjIyMSA1NTYyIGwtMjIxNyA1NTU3IC01MjcgMyBjLTQ5OSAyCi01MjcgMSAtNTIzIC0xNXoiLz4KPHBhdGggZD0iTTM5MzgwIDU2MDUgbDAgLTMyNzUgNDQwIDAgNDQwIDAgMCAzMjc1IDAgMzI3NSAtNDQwIDAgLTQ0MCAwIDAKLTMyNzV6Ii8+CjxwYXRoIGQ9Ik0zNjUyMiA2MjA5IGMtNjM1IC01MiAtMTEzOSAtMzk2IC0xNDEzIC05NjMgLTE0NiAtMzAzIC0yMTEgLTYxNQotMjEyIC0xMDIxIDAgLTI4NiAyNiAtNDg1IDk0IC03MjEgMTIxIC00MjIgNDAwIC03OTYgNzU0IC0xMDE0IDI4NyAtMTc3IDYxMgotMjYxIDEwMTAgLTI2MSA2OTMgLTEgMTE3MyAyMzUgMTU4MiA3NzggMTAwIDEzMyAyMTUgMzE1IDIwNSAzMjQgLTQgMyAtMTcxCjk3IC0zNzEgMjA4IC0yNzIgMTUxIC0zNjYgMTk5IC0zNzIgMTg5IC00IC03IC00MiAtNjIgLTg0IC0xMjMgLTE2OCAtMjQwCi0zMTcgLTQwMCAtNDQ0IC00NzUgLTIwNSAtMTIxIC01MTMgLTE1MSAtNzc4IC03NCAtMjM5IDY5IC00MzcgMjM4IC01NTMgNDczCi02NCAxMjkgLTk5IDI1MyAtMTI0IDQ0NCBsLTUgMzcgMTM0OCAwIDEzNDggMCA3IDgxIGMxMyAxNDcgLTkgNDc2IC00NSA2NjkKLTY3IDM1OSAtMTkyIDYzNSAtNDAyIDg4NyAtMzQ0IDQxMyAtODk5IDYxNSAtMTU0NSA1NjJ6IG00NzggLTgxOSBjMjE2IC01MwozODkgLTE4NCA0OTcgLTM3NyA0MyAtNzggMTAyIC0yMjcgMTAzIC0yNjEgbDAgLTIyIC04NjIgMiBjLTg1NyAzIC04NjMgMwotODYwIDIzIDIgMTEgMTcgNTQgMzMgOTUgMTEyIDI5MSAzNTQgNDk3IDY1NCA1NTYgMTAwIDE5IDMyNCAxMSA0MzUgLTE2eiIvPgo8L2c+CjwvZz4KPC9zdmc+Cg=="
      />
      ${menuElement(state, emit)}
    </header>
  `
}

function menuElement (state, emit) {
  return html`
    <ul class="list">
      ${Object.keys(state.pages).map(function (path) {
        if (path == '/') return null
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
    <main class="mw8 w-100 ph4-ns pb1 ph2 f3-ns" id="content">
      ${toHtml(md(state.pages['/' + state.params.page].markdown))}
    </main>
  `
}

function toHtml (src) {
  var el = document.createElement('div')
  el.innerHTML = src
  var nodes = el.childNodes
  var els = document.createElement('div')
  for (var i = 0; i > nodes.length; i++) {
    els.appendChild(fmt(nodes[i]))
  }

  return el
  function fmt (el) {
    var nodeName = el.nodeName.toLowerCase()
    if (nodeName === 'h1') el.setAttribute('class', 'f-5 ttu')
    if (nodeName === 'h2') el.setAttribute('class', 'f1 ttu')
    if (nodeName === 'pre') el.setAttribute('class', 'f3 bg-dark-gray mw9 pa4 tl overflow-y-auto')
    if (nodeName === 'ul') el.setAttribute('class', 'f2 list b lh-copy')
    return el
  }
}

function markdownLoader (state, emitter) {
  if (!state.pages) state.pages = {}
  emitter.on('DOMContentLoaded', function () {
    Object.keys(state.pages).filter(function (path) {
      return !!PAGES[path]
    }).forEach(path => {
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
