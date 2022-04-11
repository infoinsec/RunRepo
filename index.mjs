import fs from 'fs';
import path from 'path';
import {
    exec,
    execSync
} from 'child_process';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

//get existing version of the app
function getExistingVersion(packageName) {
    const __dirname = path.resolve(path.dirname(''));
    const packageLocation = path.join(__dirname, packageName)
    const packageJsonPath = path.join(packageLocation, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
        const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath));
        return packageInfo.version;
    }
    return null;
}

const packageName = 'H2testjs'
let oldVersion = await getExistingVersion(packageName)
var myPackage = {
    name: packageName,
    oldVersion: oldVersion,
    newVersion: null,
    location: null,
}
var launching = false
var launched = false
console.log(`package name: ${myPackage.name}`)


watchMain(5000)
const isDev = true

async function main() {
    getInfo(packageName)
        .then(async shouldUpdate => await runUpdate(shouldUpdate))
        .then(async shouldRestart => await restartIfNeeded(shouldRestart))
        .catch(err => console.log(err))
}

function watchMain(timeout = 10000) {
    return new Promise(async (resolve, reject) => {
        await main()
        setTimeout(() => {
            console.log('watchMain timeout')
            watchMain(timeout)
            resolve()
        }, timeout)
    })
}

//a function to get the latest version of the app
function getInfo(packageName = packageName) {
    //returns the npm package version of the github repo
    //accepts a package name and returns the latest version
    myPackage.oldVersion = getExistingVersion(packageName)

    const homepage = 'https://github.com/infoinsec/'
    const url = homepage + packageName + '/blob/main/package.json'

    return new Promise(async (resolve, reject) => {
        const __dirname = path.resolve(path.dirname(''));
        const packageLocation = path.join(__dirname, packageName)
        myPackage.location = packageLocation
        let response = await fetch(url)
        if (!response.status === 200) {
            reject(response.status)
        }
        let $ = cheerio.load(await response.text())
        let version = $('#LC7 span.pl-s').text()
        //match the version number between the double quotes
        let regex = /"([^"]+)"/
        let match = regex.exec(version)
        myPackage.newVersion = match[1]
        
        console.log(`old version: ${myPackage.oldVersion}`)
        console.log(`new version: ${myPackage.newVersion}`)
        myPackage.oldVersion === null || myPackage.newVersion > myPackage.oldVersion ? resolve(true) : resolve(false)
    });
}

//returns true if the app should be restarted
async function runUpdate(shouldUpdate) {
    if (shouldUpdate) {
        console.log('update required')
        let running = false
        try {
            //run powershell command to check if process is running
            if (!isDev) {
                execSync(`Get-Process ${myPackage.name}`, {
                    'shell': 'powershell.exe',
                    "encoding": "utf8"})
            }
            if (isDev) {
                execSync("Get-Process electron", {
                    'shell': 'powershell.exe',
                    "encoding": "utf8"})
            }
            running = true
        } catch (err) {
            running = false
        }
        if (!fs.existsSync(myPackage.location)) {
            await cloneRepo(packageName, `.\\${packageName}`)
        } else {
            //Repo already exists, needs an update
            if (running) {
                console.log('Process is already running and needs to update')
                console.log('renaming current directory to old')
                //kill the process
                if (!isDev) execSync(`taskkill /f /im ${packageName}.exe`)
                if (isDev) execSync(`taskkill /f /im electron.exe`)
                launching = false
                //rename the old directory
                fs.renameSync(myPackage.location, `${myPackage.location}_old`)
                //clone the new repo
                await cloneRepo(packageName, myPackage.location)
            } else {
                //process is not running, update
                console.log('repo already exists but needs an update. Updating...')
                execSync(`git pull`, {
                    cwd: myPackage.location
                })
                exec(`cd ${myPackage.location} && git pull`)
            }
        }
        return true
    } else {
        console.log('no update required')
        if (!launched && !launching) return true
    }
}

async function restartIfNeeded(shouldRestart) {
    if (shouldRestart) {
        console.log(`shouldRestart: ${shouldRestart}`)
        if (launching) {
            console.log('Waiting for process to launch')
        } else {
            //restart the app
            launching = true
        }
        console.log(`already launching: ${launching}`)
        console.log(`shouldRestart: ${shouldRestart}`)
        let npmInstall = execSync(`cd "${path.resolve('./', packageName)}" && npm i`, {
            encoding: 'utf8'
        })
        console.log(`npm install results:\r ${npmInstall}`)
        console.log("Running npm start...")
        exec(`cd ${myPackage.location} && npm start`, (err, stdout, stderr) => {
            if (err) {
                console.log(err)
                return
            }
            while (launching && !launched) {
                console.log('process launching...')
                await recheck()
                launched = true
                launching = false
            }
        }
    }
}

function cloneRepo(packageName, dir) {
    //accepts a github package name and a directory to clone it to
    //returns a promise that resolves to the directory name
    let url = `https://github.com/infoinsec/${packageName}.git`
    return new Promise((resolve, reject) => {
        exec(`git clone ${url} ${dir}`, (err, stdout, stderr) => {
            if (err) {
                reject(err)
            } else {
                resolve(dir)
            }
        })
    })
}

//spawn a process to update the app
// exec(`npm install -g H2testjs@${newVersion}`, (err, stdout, stderr) => {
//     if (err) {
//         console.log(err)
//     } else {
//         console.log(stdout)
//     }
// })