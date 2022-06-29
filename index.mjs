import fs from 'fs'
import path from 'path'
import process from 'process'
import upath from 'upath'
import {
    exec,
    execSync,
    spawn,
    spawnSync
} from 'child_process'
import * as url from 'url';
const __filename = url.fileURLToPath(
    import.meta.url);
const __dirname = url.fileURLToPath(new URL('.',
    import.meta.url));
import {
    hyperClient,
    hyperServer
} from './hyper.mjs'

//store command line arguments
var packageName = process.argv[2];
if (packageName === undefined) packageName = 'swarm';
// var runArgs = process.argv[3]

const startingDir = upath.toUnix(process.cwd())

console.log(`package name: ${packageName}`)

main()
// watchMain(5000)
var repo = undefined
var child = undefined
// const isDev = true
// var timestamp = Date.now()

//Currently accepts a github repo name
async function main() {
    if (process.argv.findIndex(arg => arg === '--server' || arg === '-s') !== -1) {
        console.log(`running server mode...`)
        await hyperServer(packageName)
        return
    }

    if (process.argv.findIndex(arg => arg === '--client' || arg === '-c') !== -1) {
        console.log(`running client mode...`)
        await hyperClient(packageName)
        // return
    }

    var next

    await prepare(packageName)
    repo = await getRepo("next")
    console.log(`repo: ${repo}`)
    if (repo === undefined) {
        repo = await createRepo(packageName)
    }

    // await updateRepo(repo)
    runChild(repo)
    console.log('repo is running')
    next = await createRepo(packageName)
    await updateRepo(next)
    await prune(3)

    hyperClient()

    // await new Promise(async (resolve, reject) => {
    //     setTimeout(async (resolve) => {
    //         await child.kill('SIGINT')
    //         resolve()
    //     }, 5000, resolve)
    // })
}


//Check for
async function prepare(name) {
    return new Promise(async (resolve, reject) => {
        if (child != null) {
            child.kill('SIGINT')
        }
        resolve()
    })
}

async function getInfo(name) {
    if (!packageName) packageName = name
    //returns the npm package version of the github repo
    //accepts a package name and returns the latest version
    // myPackage.oldVersion = getExistingVersion(packageName)

    // const homepage = 'https://github.com/infoinsec/'
    // const url = homepage + packageName + '/blob/main/package.json'

    // return await new Promise(async (resolve, reject) => {
    //     let response = await fetch(url)
    //     if (!response.status === 200) {
    //         reject(response.status)
    //     }
    //     myPackage.newVersion = await getPackageJsonPropFromGithubRepo(packageName, 'version')
    //     myPackage.newVersion ? null : myPackage.newVersion = '0.0.0'
    //     console.log(`old version: ${myPackage.oldVersion}`)
    //     console.log(`new version: ${myPackage.newVersion}`)
    //     myPackage.oldVersion === null || myPackage.oldVersion === undefined ||
    //         compareVersions(myPackage.newVersion, myPackage.oldVersion) 
    //         ? resolve(true) : resolve(false)
    // })
}

function prune(keep = 3) {
    return new Promise(async (resolve, reject) => {
        let prefix = '/repos/'

        let repos = undefined
        try {
            repos = fs.readdirSync(__dirname + prefix)
        } catch (err) {
            fs.mkdirSync(__dirname + prefix)
            repos = fs.readdirSync(__dirname + prefix)
        }
        repos = repos.filter(repo => repo.includes(`${packageName}.`))

        if (repos.length <= keep) resolve()
        else {
            repos = repos.sort((first, second) => {
                first = first.split(`${packageName}.`)[1]
                second = second.split(`${packageName}.`)[1]
                return first - second
            })
            for (let i = 0; i < repos.length - keep; i++) {
                let repo = repos[i]
                console.log(`removing ${repo}`)
                fs.rSm(__dirname + prefix + repo, {
                    recursive: true
                })
            }
        }
    })
}

//returns the path of the requsted repo, either current (next to latest) or next (latest)
function getRepo(currentOrNext = 'current') {
    const useNext = currentOrNext === 'next' ? true : false
    return new Promise(async (resolve, reject) => {
        let prefix = '/repos/'

        let repos = undefined
        try {
            repos = fs.readdirSync(__dirname + prefix)
        } catch (err) {
            fs.mkdirSync(__dirname + prefix)
            repos = fs.readdirSync(__dirname + prefix)
        }
        repos = repos.filter(repo => repo.includes(`${packageName}.`))
        let repo = undefined

        if (repos.length === 0) resolve(undefined)
        else if (repos.length === 1) {
            console.log(`Only one repo found. Using ${repos[0]}`)
            repo = repos[0]
        } else {
            repo = repos.reduce((prev, curr, index) => {
                let prevNum = prev.split(`${packageName}.`)[1]
                let currNum = curr.split(`${packageName}.`)[1]
                if (repos.length === index + 1) {
                    if (useNext && currNum > prevNum) return curr
                    if (useNext && prevNum > currNum) return prev
                    if (!useNext && currNum > prevNum) return prev
                    if (!useNext && prevNum > currNum) return curr
                }
                return currNum > prevNum ? curr : prev
            })
        }
        if (!!repo) repo = __dirname + prefix + repo
        console.log(`repo: ${repo ? repo : 'not found'}`)
        resolve(repo)
    })
}

async function createRepo(packageName) {
    return new Promise(async (resolve, reject) => {
        let repoPath = String(__dirname + '/repos/' + `${packageName}.${Date.now()}`)
        console.log(`cloning to ${repoPath}`)
        await cloneRepo(packageName, repoPath)
        resolve(repoPath)
    })
}

async function updateRepo(repoPath) {
    return new Promise((resolve, reject) => {
        //git pull
        console.log(`updating ${repoPath}`)
        execSync(`cd ${repoPath} && git pull`)
        console.log(`Running npm install`)
        execSync(`npm --prefix "${repoPath}" i`)
        resolve()
    })
}

async function runChild(repoPath, runCommand = 'npm start') {
    console.log(`Input command: ${runCommand}`)
    if (!runCommand.match(/--prefix/i)) {
        runCommand = `cd "${repoPath}" && ${runCommand}`
    }
    return new Promise(async (resolve, reject) => {
        child = spawn(runCommand, {
            shell: true,
            detached: false,
            stdio: 'inherit'
        })
        child.on('error', (err) => {
            console.log(err)
        })
        child.on('exit', (code) => {
            console.log(`child exited with code ${code}`)
        })
        resolve(child)
    })
}




//     let running = false
//     try {
//         //run powershell command to check if process is running
//         // if (!isDev) {
//         //     execSync(`Get-Process ${myPackage.name}`, {
//         //         'shell': 'powershell.exe'
//         //     })
//         // }
//         if (isDev) {
//             execSync("Get-Process electron", {
//                 'shell': 'powershell.exe'
//             })
//         }
//         running = true
//     } catch (err) {
//         running = false
//     }

//     if (shouldUpdate) {
//         console.log('update required')

//         let dir = `../${packageName}-${myPackage.newVersion}`
//         if (!fs.existsSync(dir)) {
//             console.log('Repo does not exist yet, cloning')
//             await cloneRepo(packageName, dir)
//         } else {
//             console.log('repo already exists but needs an update. Re-cloning...')
//             if (running) {
//                 console.log('Ending process for update')
//                 //kill the process
//                 // if (!isDev) execSync(`taskkill /f /im ${packageName}.exe`)
//                 if (isDev) execSync(`taskkill /f /im electron.exe`)
//                 // console.log('Deleting _old folder')
//                 // if (fs.existsSync(`${dir}\\_old`)) {
//                 //     fs.rmSync(`${dir}_old`, {
//                 //         recursive: true,
//                 //         force: true
//                 //     })
//                 // }
//                 // console.log('Renaming current directory with _old')
//                 // fs.renameSync(dir, `${dir}_old`)
//                 console.log('Re-cloning repo')
//                 await cloneRepo(packageName, dir)
//             } else {
//                 console.log('Re-cloning repo')
//                 await cloneRepo(packageName, dir)
//                 // execSync(`git pull`, {
//                 //     cwd: dir
//                 // })
//             }
//         }
//         console.log(`Running npm install`)
//         execSync(`npm --prefix "../${packageName}#${myPackage.newVersion}" i`)
//         // console.log(`npm install results:\r ${npmInstall}`)
//         resolve(true)
//     } else {
//         console.log('no update required')
//         //not running, should restart
//         if (!running) resolve(true)
//         //running, no restart needed
//         resolve(false)
//     }
// })
// }

// async function restartIfNeeded(shouldRestart) {
//     return new Promise(async resolve => {
//         console.log(`shouldRestart: ${shouldRestart}`)
//         if (shouldRestart) {
//             if (!launchFlag) {
//                 launchFlag = true
//                 console.log('restarting app')
//                 // console.log('pwd: ' + execSync('pwd', {
//                 //     shell: 'powershell.exe'
//                 // }))
//                 let dir = getNewestPackagePath(packageName)

//                 console.log("Running npm start...")
//                 exec(`npm --prefix "${dir}" start`)
//                 async function recheck(res) {
//                     return new Promise((resolve, reject) => {
//                         if (res) {
//                             resolve = res
//                         }
//                         try {
//                             let result = execSync(`Get-Process electron`, {
//                                 "shell": "powershell.exe",
//                                 "encoding": "utf8"
//                             })
//                             // console.log(`result: ${result}`)
//                             console.log('Process is running')
//                             launchFlag = false
//                             resolve()
//                         } catch (err) {
//                             console.log('Process is not running, rechecking...')
//                             setTimeout(() => {
//                                 recheck(resolve)
//                             }, 1000)
//                         }
//                     })
//                 }
//                 return await recheck(resolve).then(() => {
//                     launchFlag = false
//                     resolve()
//                 })
//             }
//         } else {
//             console.log('LaunchFlag is already set, returning')
//             resolve()
//         }
//     })
// }


function cloneRepo(packageName, dir = __dirname) {
    //accepts a github package name and a directory to clone it to
    //returns a promise that resolves to the directory name
    let url = `https://github.com/infoinsec/${packageName}.git`
    return new Promise((resolve, reject) => {
        console.log(`cloning ${url} to ${dir}`)
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
// function compareVersions(version1, version2) {
//     return semver.gt(version1, version2)
// }

//spawn a process to update the app
// exec(`npm install -g H2testjs@${newVersion}`, (err, stdout, stderr) => {
//     if (err) {
//         console.log(err)
//     } else {
//         console.log(stdout)
//     }
// })