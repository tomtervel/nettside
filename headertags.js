var hyperstream = require('hstream')

module.exports = headertags

function headertags (opts) {
  return hyperstream({
    'head': {
      _appendHtml: `
        <link href='https://api.tiles.mapbox.com/mapbox-gl-js/v0.44.1/mapbox-gl.css' rel='stylesheet' />
        <script src='https://api.tiles.mapbox.com/mapbox-gl-js/v0.44.1/mapbox-gl.js' defer onload="window.mapboxgl.accessToken='${process.env.MAPBOX_TOKEN}'"></script>
      `
    }
  })
}
