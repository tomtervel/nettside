var hyperstream = require('hstream')

module.exports = headertags

function headertags (opts) {
  return hyperstream({
    head: {
      _appendHtml: `
        <link rel='icon' href='/assets/favicon.svg'/>
        <script src='https://api.mapbox.com/mapbox-gl-js/v2.0.1/mapbox-gl.js' defer onload="window.mapboxgl.accessToken='${process.env.MAPBOX_TOKEN}'"></script>
        <link href='https://api.mapbox.com/mapbox-gl-js/v2.0.1/mapbox-gl.css' rel='stylesheet' />
      `
    }
  })
}
