const api = new require("./api.js")();
const path = require("path");
const color = require("cli-color");
const fs = require("fs-extra")

let bandwithUsed = 0
let watchtimeUsed = 0
let jobsProgress = []

try {
    fs.rmdirSync("./cli/cache/")
} catch (e) {

}

let { sleep } = require("./application/publicFunctions.js");

function convertTime(t) {
    let date = new Date(null);
    date.setSeconds(t);

    return date.toISOString().substr(11, 8);
}

function argumentParser() {
    let args = process.argv.slice(2, process.argv.length)
    let result = {}

    let currentSelector

    for (let [index, argument] of args.entries()) {
        if (argument.startsWith(`--`)) {
            currentSelector = argument.slice(2, argument.length).toLowerCase()
        } else {
            if (!result[currentSelector]) {
                result[currentSelector] = [argument]
            } else {
                let old = []

                old.push(argument)
                old.push(...result[currentSelector])

                result[currentSelector] = old
            }
        }
    }

    return result
}

let file = fs.readJSONSync("./cli/options.json")
let topArguments = { ...file, ...argumentParser() }

if (!topArguments.views) {
    arguments.views = 2
    console.log(color.yellow("No views argument, defaulting to 2"))
} else {
    topArguments.views = parseFloat(topArguments.views)
}

/*if(!topArguments.browserPath){
    console.log(color.red(`FATAL ERROR: browserPath is not selected or invalid. Please edit /cli/options.json`))
    process.exit(1)
}

if(topArguments.browserPath.length < 2){
    console.log(color.red(`FATAL ERROR: browserPath is not selected or invalid. Please edit /cli/options.json`))
    process.exit(1)
}*/

if (!topArguments.concurrency) {
    arguments.concurrency = 2
    console.log(color.yellow("No concurrency argument, defaulting to 3"))
} else {
    topArguments.concurrency = parseFloat(topArguments.concurrency)
}

if (!topArguments.concurrencyInterval) {
    topArguments.concurrencyInterval = 5
} else {
    topArguments.concurrencyInterval = parseFloat(topArguments.concurrencyInterval)
}

if (!topArguments.style) {
    arguments.style = "direct"
    console.log(color.yellow("No style argument, defaulting to direct"))
} else {
    topArguments.style = topArguments.style
}

if (topArguments.headless) {
    console.log(color.red("CAUTION: Headless mode on, program may fail at any time and youtube can detect the bots"))
}

if (topArguments.headless) {
    console.log(color.red("CAUTION: Headless mode on, program may fail at any time and youtube can detect the bots"))
}

if (!topArguments.proxies) {
    console.log(color.red("No proxies set, don't expect many views from a single IP address"))
    topArguments.proxies = ["direct://"]
} else {
    if (topArguments.proxies.length < 1) {
        console.log(color.red("No proxies set, don't expect many views from a single IP address"))
        topArguments.proxies = ["direct://"]
    }
}

if (!["direct", "search"].includes(topArguments.style)) 
    console.log(color.yellow(`Unknown watching style '${topArguments.style}', defaulting to direct`))

let workingJobs = []

let jobNumbers = 0
let currentlyUsed = 0
let jobNum = 0

async function runJob(job, index){ 
    return new Promise(async (resolve, reject) => {
        let maxTime = job.maxWatchtime
        let maxTimeNum = parseInt(maxTime.toString().substring(0, maxTime.toString().length - 1))
        let maxSeconds = parseFloat(maxTime)
    
        let videoInfo = await api.getVideoMetadata(job.id)
    
        //jobsProgress[index].videoInfo = videoInfo
        jobsProgress[index].duration = videoInfo.duration
        jobsProgress[index].stopAt = typeof maxTime === "number" && maxSeconds || ((maxTimeNum / 100) * videoInfo.duration)
        jobsProgress[index].watchTime = 0

        let correctCacheIndex = index
        let found = false

        workingJobs.forEach((value, index2) => {
            if(value.proxy !== job.proxy) return
            if(found) return

            if(jobsProgress[index2] && jobsProgress[index2].done && !jobsProgress[index2].proxyUsed){
                jobsProgress[index2].proxyUsed = true
                found = true

                correctCacheIndex = index2
            }
        })
    
        let browserConnection = api.connectBrowser(topArguments.browserPath, {
            //browserWSEndpoint: "wss://chrome.browserless.io?",
            proxyServer: job.proxy,
            userDataDir: path.join(__dirname, `/cli/cache/${correctCacheIndex}`),
            saveBandwith: true,
        })
    
        browserConnection.data.on("debug", (message) => {
            jobsProgress[index].debugLog.push(message)
        })
    
        browserConnection.data.on("pageMessage", () => {
            jobsProgress[index].pageMessages.push(message)
        })
    
        browserConnection.data.on("bandwithUsed", (bandwith) => {
            bandwithUsed += bandwith
            jobsProgress[index].bandwith += bandwith
    
            //console.log(`${bandwithUsed * 1e-6}mb`)
        })
    
        //browserConnection.data.on("pageError", console.log)
        browserConnection.data.on("requestHandled", (request) => {
            jobsProgress[index].requests += 1
        })
    
        let browser = await browserConnection.browser()
        let page = await api.handleNewPage()
    
        switch (topArguments.style){
            case "direct":
                await page.goto(`https://www.youtube.com/watch?v=${job.id}`)
                await api.initWatcher(page)
                break;
            case "search":
                await api.handleSearchPage(page, job.id)
                await api.initWatcher(page)
                break;
            //case "direct":
            //    break;
        }
    
        let dataInterval = setInterval(async () => {
            if(jobsProgress[index].done){
                return clearInterval(dataInterval)
            }
    
            let currentInfo = await api.getPlayerStatistics(page)
    
            jobsProgress[index].watchTime = currentInfo.time
    
            if(currentInfo.time >= jobsProgress[index].stopAt){
                resolve()

                watchtimeUsed += currentInfo.time
                jobsProgress[index].done = true
                jobsProgress[correctCacheIndex].proxyUsed = false

                await browser.close()

                return clearInterval(dataInterval)
            }
        }, 250)
    })
}

let start = new Date()
let currentLogs = fs.readJSONSync("./cli/logs.json")

let errorLoop = setInterval(() => {
    fs.writeJSONSync("./cli/logs.json", [...currentLogs, [...jobsProgress]])
}, 500)

console.clear()

;(async () => {
    for (let i = 3; i > 0; i--){
        console.log(color.blue(`Starting in ${i} seconds...`))
        await sleep(1000)
    }

    console.clear()

    let debugInterval = setInterval(() => {
        let filteredJobs = []
        let finalDuration = 0

        jobsProgress.forEach(job => {
            finalDuration += job.watchTime
            if(!job.done){

                filteredJobs.push({
                    "bandwith usage": `${(job.bandwith * 1e-6).toFixed(2)}mb`,
                    "network requests": job.requests,
                    "watch time:": `${((job.watchTime * 100) / job.duration).toFixed(2)}% (${convertTime(job.watchTime)})`,
                    "duration": convertTime(job.duration),
                    "max watch time": convertTime(job.stopAt || 0)
                })
            }
        })

        if(filteredJobs.length < 1){
            return clearInterval(debugInterval)
        }

        console.clear()

        console.log(color.blueBright("Worker stats: \n"))
        console.table(filteredJobs)

        console.log(`\n\n`)
        console.log(color.blueBright(`Final stats: \n`))

        console.table({
            "total bandwith usage": `${(bandwithUsed * 1e-6).toFixed(2)} megabits`,
            "average usage": `${(bandwithUsed * 1e-6) / (finalDuration / 60)} megabits per minute`,
            "total views generated": jobNum,
            "total watchtime generated": convertTime(finalDuration),
            "jobs left": workingJobs.length - jobNum - 1
        })
    }, 500)

    jobsProgress[0] = {
        done: false,
        errors: [],
        debugLog: [],
        pageMessages: [],
        bandwith: 0,
        requests: 0,
        duration: 0,
        watchTime: 0,
    }

    runJob(workingJobs[0], 0).catch((error) => {
        jobsProgress[currentJobNum].done = true
        jobsProgress[currentJobNum].errors.push(error)
    }).then(() => {
        currentlyUsed -= 1
    })

    let queueInterval = setInterval(async () => {   
        if(currentlyUsed < topArguments.concurrency - 1){
            currentlyUsed += 1
            jobNum += 1

            let currentJobNum = jobNum
            let currentJob = workingJobs[currentJobNum]

            if(currentJob){
                jobsProgress[currentJobNum] = {
                    done: false,
                    errors: [],
                    debugLog: [],
                    pageMessages: [],
                    bandwith: 0,
                    requests: 0,
                    duration: 0,
                    watchTime: 0,
                }

                runJob(currentJob, currentJobNum).then(() => {
                    if(currentJobNum === workingJobs.length - 1){
                        console.clear()

                        console.log(color.green(`Sucesfully watched videos.`))
                        console.log(color.green(`Statistics: `))
        
                        console.table({
                            "total bandwith usage": `${(bandwithUsed * 1e-6).toFixed(2)} megabits`,
                            "average usage": `${(bandwithUsed * 1e-6) / (finalDuration / 60)} megabits per minute`,
                            "total views generated": jobNumbers,
                            "total watchtime generated": convertTime(watchtimeUsed) ,
                            "time took": convertTime((start - new Date()) / 1000),
                        })
        
                        clearInterval(queueInterval)
                    }

                    currentlyUsed -= 1
                }).catch((error) => {
                    jobsProgress[currentJobNum].done = true
                    jobsProgress[currentJobNum].errors.push(error)
                })
            }
        }
    }, topArguments.concurrencyInterval * 1000)
})()

for (let video of topArguments.videos) {
    for (let proxy of topArguments.proxies) {
        for (let view = 0; view < topArguments.views; view++){
            workingJobs.push({ 
                id: video, 
                proxy: proxy, 
                maxWatchtime: topArguments.watchTime 
            })

            jobNumbers += 1
        }
    }
}