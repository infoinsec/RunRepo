import fs from 'fs';
import path from 'path';
import {
    exec,
    execSync
} from 'child_process';
import fetch from 'node-fetch';

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

//a function to get the latest version of the app
function getInfo(packageName) {
    //returns the npm package version of the github repo
    //accepts a package name and returns the latest version
    myPackage.oldVersion = getExistingVersion(packageName)

    const homepage = 'https://raw.githubusercontent.com/infoinsec/'
    const url = homepage + packageName + '/main/package.json'

    return new Promise(async (resolve, reject) => {
        const __dirname = path.resolve(path.dirname(''));
        const packageLocation = path.join(__dirname, packageName)
        myPackage.location = packageLocation
        let response = await fetch(url)
        if (!response.status === 200){
            reject(response.status)
        }
        let json = await response.json()
        myPackage.name = json.name
        myPackage.newVersion = json.version
        console.log(`package name: ${myPackage.name}`)
        console.log(`old version: ${myPackage.oldVersion}`)
        console.log(`new version: ${myPackage.newVersion}`)
        myPackage.oldVersion >= myPackage.newVersion ? shouldUpdate = false : true
        resolve(json)
    });
}

const packageName = 'H2testjs'

let oldVersion = await getExistingVersion(packageName)
let shouldUpdate = true
var myPackage = {
    oldVersion: oldVersion,
    newVersion: null,
    location: null,
}

getInfo(packageName).then(async info => {
    if (shouldUpdate) {
        console.log('update required')
        if(!fs.existsSync(myPackage.location)){
            await cloneRepo(packageName, `.\\${packageName}`)
        } else {
            //Repo already exists, update it
            console.log('repo already exists, updating')
            execSync(`git pull`, {
                cwd: myPackage.location
            })
        }
    } else {
        console.log('no update required')
    }
}).then(() => {
    //running npm install
    let npmInstall = execSync(`cd ${myPackage.location} && npm i`, {encoding: 'utf8'})
    console.log(`npm install results:\r ${npmInstall}`)
    console.log("Running npm start...")
    var handle = exec(`cd ${myPackage.location} && npm start`, (err, stdout, stderr) => {
        if (err) {
            console.log(err)
            return
        }
        console.log(stdout)
    })
})

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