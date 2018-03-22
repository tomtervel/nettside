var Nanocomponent = require('nanocomponent')
var html = require('choo/html')
var onIdle = require('on-idle')

class Mapbox extends Nanocomponent {
  constructor () {
    super()
    this.map = null
    this.coords = [0, 0]
    this.zoom = 10.5
    this.supported = window.mapboxgl.supported()

    this.map = new window.mapboxgl.Map({
      container: html`<div class="w-100 overflow-hidden relative vh-50 map-brown"></div>`,
      style: 'mapbox://styles/benlyn/cj7tttb9y1jbe2rmsdpeiacdv',
      center: this.coords,
      zoom: this.zoom,
      scrollZoom: false,
      logoPosition: 'bottom-right',
      attributionControl: false
    })
    setTimeout(() => {
      this.map.addControl(new window.mapboxgl.AttributionControl({
        compact: true
      }))
    }, 10000)
  }

  createElement (coords) {
    this.coords = coords.slice(0, 2)
    this.zoom = coords[2]
    return this.map._container
  }

  update (coords) {
    if (coords.map((cord, i) => this.coords[i] !== cord).find(c => c)) {
      this.coords = coords.slice(0, 2)
      this.zoom = coords[2]
      return true
    }
    return false
  }

  beforerender (el) {
    this.map.resize()
    this.map.setCenter(this.coords)

    onIdle(() => {
      this.map.resize()
      this.map.easeTo({ bearing: 360, pitch: 30, duration: 5000, zoom: this.zoom })
    })
  }

  load () {
  }

  unload () {
  }
}

module.exports = Mapbox
