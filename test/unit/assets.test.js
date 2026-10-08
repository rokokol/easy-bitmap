import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

// An SVG favicon cannot load the page's stylesheet, so it carries the colour itself
test('the favicon is painted in the palette plum', () => {
  const plum = read('assets/ddlc-ui.css').match(/--ddlc-plum:\s*(#[0-9A-Fa-f]{6})/)[1]
  const fill = read('favicon.svg').match(/<svg[^>]*\sfill="(#[0-9A-Fa-f]{6})"/)[1]
  assert.equal(fill.toUpperCase(), plum.toUpperCase())
})

// A double hyphen inside an XML comment makes the whole file unreadable, favicon and <use> alike
test('favicon.svg is well-formed XML', () => {
  for (const comment of read('favicon.svg').match(/<!--[\s\S]*?-->/g) ?? [])
    assert.doesNotMatch(comment.slice(4, -3), /--/, comment)
})

test('the page links the SVG favicon and draws its heart in the header', () => {
  const html = read('index.html')
  assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/)
  assert.match(html, /<use href="favicon\.svg#heart"\/>/)
  assert.match(read('favicon.svg'), /id="heart"/)
})
