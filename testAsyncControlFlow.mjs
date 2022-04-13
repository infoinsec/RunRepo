//Test async control flow

const startTime = new Date()
const packageName = 'testAsyncControlFlow'
watchMain(25000)

async function main() {
    return await getInfo(packageName)
        .then(async shouldUpdate => {
            // console.log(`GetInfo(${packageName}) finished`)
            console.log(`ShouldUpdate: ${shouldUpdate}`)
            return await runUpdate(shouldUpdate)
            // console.log(`RunUpdate finished`)
        }).then(async shouldRestart => {
            console.log(`ShouldRestart: ${shouldRestart}`)
            return await restartIfNeeded(shouldRestart)
            // console.log(`RestartIfNeeded finished`)
        }).catch(err => console.log(err))
}

function watchMain(timeout = 10000) {
    return new Promise(async (resolve) => {
        main().then(() => {
            console.log(`Finished running, waiting for ${timeout}ms before rechecking`)
            setTimeout(() => {
                console.log(`WatchMain finished at ${new Date() - startTime}ms`)
                watchMain(timeout)
                resolve()
            }, timeout)
        })
    })
}

async function getInfo(packageName) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`GetInfo finished at ${new Date() - startTime}ms`)
            if (getRandomBoolean()) {
                console.log(`GetInfo(${packageName}) finished`)
                resolve(true)
            } else {
                console.log(`GitInfo(${packageName}) failed`)
                resolve(false)
            }
        }, 5000)
    })
}

async function runUpdate(shouldUpdate) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`runUpdate finished at ${new Date() - startTime}ms`)
            if (getRandomBoolean()) {
                console.log(`RunUpdate(${shouldUpdate}) finished`)
                resolve(true)
            } else {
                console.log(`RunUpdate(${shouldUpdate}) failed`)
                resolve(false)
            }
        }, 5000)
    })
}

async function restartIfNeeded(shouldRestart) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`RestartIfNeeded finished at ${new Date() - startTime}ms`)
            if (getRandomBoolean()) {
                console.log(`RestartIfNeeded(${shouldRestart}) finished`)
                resolve(true)
            } else {
                console.log(`RestartIfNeeded(${shouldRestart}) failed`)
                resolve(false)
            }
        }, 5000)
    })
}


//function to randomly generate a boolean
function getRandomBoolean() {
    return Math.random() >= 0.5
}