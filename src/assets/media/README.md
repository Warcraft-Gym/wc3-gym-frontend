# Media assets

`w3champions.png` is the W3Champions crown, taken byte for byte from
`public/favicon.png` of https://github.com/w3champions/website (branch
`master`), 512x512 PNG with alpha.

It is their mark, used here only to label the parts of this app that show
W3Champions data — the W3C Ladder page, the team Ladder card and the links out
to their site. Nothing in this app is a W3Champions product. Replace the file
if they publish a newer mark; `W3CIcon.vue` is the only thing that reads it.

`w3c-logo.png` is their "W3C" wordmark with crown, from
`public/assets/logos/medium-logo.png` of the same repo, with the white
letters recoloured dark so it reads on this app's light theme. `W3CMmr.vue`
labels every MMR column "W3C MMR" with it; the nav's "W3C Ladder" link and
the ladder page title carry it too. The letters fill the bottom half, so it is
always baseline-aligned with the text next to it.
