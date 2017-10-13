var Nanocomponent = require('nanocomponent')
var html = require('bel')
var onIdle = require('on-idle')

class Mapbox extends Nanocomponent {
  constructor () {
    super()
    this._log = require('nanologger')('mapbox')
    this.map = null
    this.coords = [0, 0]
  }
  createElement (coords) {
    this.coords = coords
    return html`
      <div class="w-100 overflow-hidden relative vh-50 map-brown">
      </div>
    `
  }
  update (coords) {
    if (!this.map) return this._log.warn('missing map', 'failed to update')
    if (coords[0] !== this.coords[0] || coords[1] !== this.coords[1]) {
      var self = this
      onIdle(function () {
        self.coords = coords
        self._log.info('update-map', coords)
        self.map.flyTo(coords)
      })
    }
    return false
  }
  beforerender (el) {
    var coords = this.coords
    this._log.info('create-map', coords)

    var map = new window.mapboxgl.Map({
      container: el,
      style: 'mapbox://styles/benlyn/cj7tttb9y1jbe2rmsdpeiacdv',
      center: coords,
      zoom: 10.5,
      scrollZoom: false,
      logoPosition: 'bottom-right',
      attributionControl: false
    })
    this.map = map
  }
  load () {
    this._log.info('load')
    this.map.resize()
    this.map.easeTo({ bearing: 360, pitch: 30, duration: 10000, zoom: 14 })
    setTimeout(() => {
      this.map.addControl(new window.mapboxgl.AttributionControl({
        compact: true
      }))
    }, 10000)
  }

  unload () {
    this._log.info('unload')
    this.map.remove()
    this.map = null
    this.coords = [0, 0]
  }
}

module.exports = Mapbox
