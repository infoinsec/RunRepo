//A module that gets the package.json property from a github repo
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

async function getPackageJsonPropFromGithubRepo(packageName, propertyName = version) {
    //returns the npm package version of the github repo's package.json
    //accepts a package name and returns the value of the propertyName
    const url = `https://github.com/infoinsec/${packageName}/blob/main/package.json`
    const response = await fetch(url)
    if (!response.status === 200) return undefined
    let text = await response.text()
 
    // const $ = cheerio.load(text)
    // let test = `<span class="pl-ent">&quot;version&quot;</span>: <span class="pl-s"><span class="pl-pds">&quot;</span>1.0.8<span class="pl-pds">&quot;</span></span>`
    // const $2 = cheerio.load(test)
    // const testElement = $2('span.pl-ent')
    // console.log(testElement.text())
    // const version = $('#LC7 span.pl-s').text()
    // /"([^"]+)"/

    
    //regex, capture group matches requested propertyName
    const regexStr = `&quot;${propertyName}&quot;<\/span>: <span class="pl-s"><span class="pl-pds">&quot;<\/span>([^<]*)`
    const regex = new RegExp(regexStr)

    const match = regex.exec(text)
    if (!match) return undefined
    if (match) return match[1]
}

//export the function as default
export default getPackageJsonPropFromGithubRepo