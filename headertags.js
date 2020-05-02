var hyperstream = require('hstream')

module.exports = headertags

function headertags (opts) {
  return hyperstream({
    head: {
      _appendHtml: `
        <script src='https://api.mapbox.com/mapbox-gl-js/v1.10.0/mapbox-gl.js' defer onload="window.mapboxgl.accessToken='${process.env.MAPBOX_TOKEN}'"></script>
        <link href='https://api.mapbox.com/mapbox-gl-js/v1.10.0/mapbox-gl.css' rel='stylesheet' />
      `
    }
  })
}
