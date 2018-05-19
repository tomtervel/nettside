var hyperstream = require('hstream')

module.exports = headertags

function headertags (opts) {
  return hyperstream({
    'head': {
      _appendHtml: `
        <link href='//api.tiles.mapbox.com/mapbox-gl-js/v0.45.0/mapbox-gl.css' rel='stylesheet' />
        <script src='//api.tiles.mapbox.com/mapbox-gl-js/v0.45.0/mapbox-gl.js' defer onload="window.mapboxgl.accessToken='${process.env.MAPBOX_TOKEN}'"></script>
      `
    }
  })
}
