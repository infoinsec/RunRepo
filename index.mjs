import fs from 'fs'
import path from 'path'
import upath from 'upath'
import {
    exec,
    execSync
} from 'child_process'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import chalk from 'chalk'

//get existing version of the app
function getExistingVersion(packageName) {
    //build an array of all files containging the package name saved at packageLocation
    // let files = fs.readdirSync(startingDir)
    // files = files.filter(file => file.includes(packageName))
    //return the file with the largest number following the package name
    // let max = 0
    // let maxTimestamp = files.filter(file => {
    //     let num = parseInt(file.split('#')[1])
    //     if (num > max) {
    //         max = num
    //     }
    // })
    // return max       

    //return the file containing maxTimestamp in its name
    // let newestFile = files.filter(file => file.includes(maxTimestamp))


    const packageJsonPath = upath.joinSafe(startingDir, 'package.json')
    if (fs.existsSync(packageJsonPath)) {
        const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath));
        return packageInfo.version;
    }
    return null;
}

const packageName = 'H2testjs'
const startingDir = upath.toUnix(process.cwd())
var oldVersion = await getExistingVersion(packageName)
var myPackage = {
    name: packageName,
    oldVersion: oldVersion,
    newVersion: null,
    location: upath.joinSafe('./', packageName),
}

console.log(`package name: ${myPackage.name}`)


watchMain(5000)
const isDev = true

async function main() {
    await getInfo(packageName)
        .then(async shouldUpdate => {
            return await runUpdate(shouldUpdate)
        })
        .then(async shouldRestart => {
            return await restartIfNeeded(shouldRestart)
        })
        .catch(err => console.log(err))
}

let launchFlag = false

function watchMain(timeout = 10000) {
    return new Promise(async (resolve, reject) => {
        main().then(() => {
            console.log(`Waiting for ${timeout}ms before rechecking`)
            setTimeout(() => {
                watchMain(timeout)
                resolve()
            }, timeout)
        })
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
        let response = await fetch(url)
        if (!response.status === 200) {
            reject(response.status)
        }
        let $ = cheerio.load(await response.text())
        let version = $('#LC8 span.pl-s').text()
        //match the version number between the double quotes
        let regex = /"version": "([0-9]+\.[0-9]?\.[0-9]?)"/
        //match the version number
        let match = regex.exec(version)
        myPackage.newVersion = match[1]

        console.log(`old version: ${myPackage.oldVersion}`)
        console.log(`new version: ${myPackage.newVersion}`)
        myPackage.oldVersion === null || myPackage.newVersion > myPackage.oldVersion ? resolve(true) : resolve(false)
    });
}

//returns true if the app should be restarted
async function runUpdate(shouldUpdate) {
    return new Promise(async resolve => {
        let running = false
        try {
            //run powershell command to check if process is running
            if (!isDev) {
                execSync(`Get-Process ${myPackage.name}`, {
                    'shell': 'powershell.exe',
                    "encoding": "utf8"
                })
            }
            if (isDev) {
                execSync("Get-Process electron", {
                    'shell': 'powershell.exe',
                    "encoding": "utf8"
                })
            }
            running = true
        } catch (err) {
            running = false
        }

        if (shouldUpdate) {
            console.log('update required')

            let dir = myPackage.location
            if (!fs.existsSync(dir)) {
                console.log('Repo does not exist yet, cloning')
                await cloneRepo(packageName, `.\\${packageName}`)
            } else {
                console.log('repo already exists but needs an update. Updating...')
                if (running) {
                    console.log('Ending process for update')
                    //kill the process
                    // if (!isDev) execSync(`taskkill /f /im ${packageName}.exe`)
                    if (isDev) execSync(`taskkill /f /im electron.exe`)
                    console.log('Deleting _old folder')
                    if (fs.existsSync(`${dir}\\_old`)) {
                        fs.rmSync(`${dir}_old`, {
                            recursive: true,
                            force: true
                        })
                    }
                    console.log('Renaming current directory with _old')
                    fs.renameSync(dir, `${dir}_old`)
                    //clone the new repo
                    console.log('Re-cloning repo')
                    await cloneRepo(packageName, dir)
                } else {
                    console.log('Updating repo')
                    //process is not running, update
                    execSync(`git pull`, {
                        cwd: dir
                    })
                }
                console.log(`Running npm install`)
                execSync(`npm --prefix ./${packageName} i`)
                // console.log(`npm install results:\r ${npmInstall}`)
            }
            resolve(true)
        } else {
            console.log('no update required')
            //not running, should restart
            if (!running) resolve(true)
            //running, no restart needed
            resolve(false)
        }
    })
}

async function restartIfNeeded(shouldRestart) {
    return new Promise(async resolve => {
        console.log(`shouldRestart: ${shouldRestart}`)
        if (shouldRestart) {
            if (!launchFlag) {
                launchFlag = true
                console.log('restarting app')
                console.log('pwd: ' + execSync('pwd', {
                    shell: 'powershell.exe'
                }))
                // if (!isDev) execSync(`${packageName}.exe`)
                //TODO: pull main from package.json
                let command = upath.joinSafe('./', packageName, '/node_modules/electron/dist/electron.exe') + ' ' + ('./' + packageName + '/main.js')
                execSync(command, {
                    shell: 'powershell.exe'
                })
            } else {
                console.log('Waiting for process to launch')
                return
            }

            console.log("Running npm start...")
            exec(`npm --prefix ./${packageName} start`)
            async function recheck(res) {
                return new Promise((resolve, reject) => {
                    if (res) {
                        resolve = res
                    }
                    try {
                        execSync(`Get-Process electron`, {
                            'shell': 'powershell.exe',
                            "encoding": "utf8"
                        })
                        console.log('Process is running')
                        launching = false
                        resolve()
                    } catch (err) {
                        console.log('Process is not running, rechecking...')
                        setTimeout(() => {
                            recheck(resolve)
                        }, 1000)
                    }
                })
            }
            return await recheck(resolve).then(() => {
                launchFlag = false
                resolve()
            })
        }
    })
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