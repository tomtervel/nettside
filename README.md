# Nettside for Tomter Vel

## Oppdatering av innhold

Rediger filer i `/content` for oppdatering av innhold.
Nye sider og poster legges til ved oppretting av ny mappe med en `index.txt` fil.

### `index.txt` filer

Inneholder data felt ved hjelp av [smarkt struktur](https://github.com/jondashkyle/smarkt)
For øyeblikket eksisterer det støtte for disse feltene:
* `tittel` - Klar tekst  _obligatorisk_
* `kart` - En liste med høydegrad, breddegrad og zoom-nivå i den rekkefølgen. Se `content/index.txt` for eksempel.
* `beskrivelse` - Markdown _obligatorisk_
* `dato` - formaterings agnostisk tekst felt

Om det ønskes støtte for flere data-felt enn dette er det bare å spørre.
Eksempel til forslag:
```
bildegalleri:
  - content/annonseringer/22-02-01-tomter-rydde-robot-moette-raadmannen/bilde1.jpg
  - content/annonseringer/22-02-01-tomter-rydde-robot-moette-raadmannen/bilde2.jpg
  - content/annonseringer/22-02-01-tomter-rydde-robot-moette-raadmannen/bilde3.jpg
```

For en del exempler av [markdown syntaksen](https://ungoldman.github.io/style.css/guide.html)
