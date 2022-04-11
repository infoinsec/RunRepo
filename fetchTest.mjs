import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

let response = await fetch('https://github.com/infoinsec/H2testjs/blob/main/package.json')

let $ = cheerio.load(await response.text())

let version = $('#LC7 span.pl-s').text()

let regex = /"([^"]+)"/
let match = regex.exec(version)

console.log(match[1])

