# Nettside for Tomter Vel

## Oppdatering av innhold

Rediger filer i `/content` for oppdatering av innhold.
Nye sider og poster legges til ved oppretting av ny mappe, gjerne med ett dato-prefix (`18-08-18-mappenavn`) og med en `index.txt` fil.

### `index.txt` filer

Inneholder data felt formatert i [smarkt struktur](https://github.com/jondashkyle/smarkt)
For øyeblikket eksisterer det støtte for disse feltene:
* `tittel` - Klar tekst  _obligatorisk_
* `kart` - En liste med høydegrad, breddegrad og zoom-nivå i den rekkefølgen. Se `content/index.txt` for eksempel.
* `beskrivelse` - Markdown _obligatorisk_
* `dato` - formaterings agnostisk tekst felt

Sjekk ut en del exempler for bruk av [markdown syntaksen](https://ungoldman.github.io/style.css/guide.html)
