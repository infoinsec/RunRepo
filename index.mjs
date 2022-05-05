import fs from 'fs'
import path from 'path'
import process from 'process'
import upath from 'upath'
import {
    exec,
    execSync
} from 'child_process'
import fetch from 'node-fetch'
import semver from 'semver'
import getPackageJsonPropFromGithubRepo from './getPackageJsonPropFromGithubRepo.mjs'
import chalk from 'chalk'

//store command line arguments
var packageName = process.argv[2]
// var runArgs = process.argv[3]

const startingDir = upath.toUnix(process.cwd())
var oldVersion = await getExistingVersion(packageName)
oldVersion ? null : oldVersion = '0.0.0'
var myPackage = {
    name: packageName,
    oldVersion: oldVersion,
    newVersion: null,
    // location: upath.joinSafe('./', packageName),
}

console.log(`package name: ${myPackage.name}`)


watchMain(5000)
const isDev = true
var timestamp = Date.now()

async function main() {
    return new Promise(async (resolve, reject) => {
        timestamp = Date.now()
        await getInfo(packageName)
            .then(async shouldUpdate => {
                return await runUpdate(shouldUpdate)
            })
            .then(async shouldRestart => {
                return await restartIfNeeded(shouldRestart)
            })
            .catch(err => console.log(err))
        resolve()
    })
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
        myPackage.newVersion = await getPackageJsonPropFromGithubRepo(packageName, 'version')
        myPackage.newVersion ? null : myPackage.newVersion = '0.0.0'
        console.log(`old version: ${myPackage.oldVersion}`)
        console.log(`new version: ${myPackage.newVersion}`)
        myPackage.oldVersion === null || myPackage.oldVersion === undefined ||
            compareVersions(myPackage.newVersion, myPackage.oldVersion) 
            ? resolve(true) : resolve(false)
    });
}

//returns true if the app should be restarted
async function runUpdate(shouldUpdate) {
    return new Promise(async resolve => {
        let running = false
        try {
            //run powershell command to check if process is running
            // if (!isDev) {
            //     execSync(`Get-Process ${myPackage.name}`, {
            //         'shell': 'powershell.exe'
            //     })
            // }
            if (isDev) {
                execSync("Get-Process electron", {
                    'shell': 'powershell.exe'
                })
            }
            running = true
        } catch (err) {
            running = false
        }

        if (shouldUpdate) {
            console.log('update required')

            let dir = `../${packageName}#${myPackage.newVersion}`
            if (!fs.existsSync(dir)) {
                console.log('Repo does not exist yet, cloning')
                await cloneRepo(packageName, dir)
            } else {
                console.log('repo already exists but needs an update. Re-cloning...')
                if (running) {
                    console.log('Ending process for update')
                    //kill the process
                    // if (!isDev) execSync(`taskkill /f /im ${packageName}.exe`)
                    if (isDev) execSync(`taskkill /f /im electron.exe`)
                    // console.log('Deleting _old folder')
                    // if (fs.existsSync(`${dir}\\_old`)) {
                    //     fs.rmSync(`${dir}_old`, {
                    //         recursive: true,
                    //         force: true
                    //     })
                    // }
                    // console.log('Renaming current directory with _old')
                    // fs.renameSync(dir, `${dir}_old`)
                    console.log('Re-cloning repo')
                    await cloneRepo(packageName, dir)
                } else {
                    console.log('Re-cloning repo')
                    await cloneRepo(packageName, dir)
                    // execSync(`git pull`, {
                    //     cwd: dir
                    // })
                }
            }
            console.log(`Running npm install`)
            execSync(`npm --prefix "../${packageName}#${myPackage.newVersion}" i`)
            // console.log(`npm install results:\r ${npmInstall}`)
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
                // console.log('pwd: ' + execSync('pwd', {
                //     shell: 'powershell.exe'
                // }))
                let dir = getNewestPackagePath(packageName)

                console.log("Running npm start...")
                exec(`npm --prefix "${dir}" start`)
                async function recheck(res) {
                    return new Promise((resolve, reject) => {
                        if (res) {
                            resolve = res
                        }
                        try {
                            let result = execSync(`Get-Process electron`, {
                                "shell": "powershell.exe",
                                "encoding": "utf8"
                            })
                            // console.log(`result: ${result}`)
                            console.log('Process is running')
                            launchFlag = false
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
        } else {
            console.log('LaunchFlag is already set, returning')
            resolve()
        }
    })
}


function cloneRepo(packageName, dir) {
    //accepts a github package name and a directory to clone it to
    //returns a promise that resolves to the directory name
    let url = `https://github.com/infoinsec/${packageName}.git`
    return new Promise((resolve, reject) => {
        execSync(`git clone ${url} ${dir}`)
        resolve(dir)
    })
}

//return the newest module path
function getNewestPackagePath(packageName) {
    try {
        //build an array of all folders containging the package name saved at packageLocation
        let folders = fs.readdirSync(startingDir)
        folders = folders.filter(file => file.includes(packageName))

        //return the file with the largest number following the # in the file's name
        let newPackage = folders.reduce((prev, curr) => {
            let prevNum = prev.split('#')[1]
            let currNum = curr.split('#')[1]
            return compareVersions(currNum, prevNum) ? curr : prev
        })
        return upath.joinSafe(startingDir, newPackage)
    } catch (err) {
        console.log(`No package found with name ${packageName}`)
    }
}

//get existing version of the app
function getExistingVersion(packageName) {
    try {
        const packageJsonPath = upath.joinSafe(getNewestPackagePath(packageName), 'package.json')
        if (!fs.existsSync(packageJsonPath)) return undefined
        const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath));
        return packageInfo.version;
    } catch (err) {
        return undefined
    }
}

//compare semver version numbers and return true if the first is greater than the second
function compareVersions(version1, version2) {
    return semver.gt(version1, version2)
}

//spawn a process to update the app
// exec(`npm install -g H2testjs@${newVersion}`, (err, stdout, stderr) => {
//     if (err) {
//         console.log(err)
//     } else {
//         console.log(stdout)
//     }
// })