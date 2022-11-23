const useProxy = require('puppeteer-page-proxy');

/**
 * Connects to a browser, also creates one if no browserWSEndpoint is provided
 * @param {Object} browserConnection Result of api.connectBrowser
*/

function handleNewPage() {
    return new Promise(async (resolve, reject) => {
        if (!this.__handled) reject(new Error(`Please call api.connectBrowser first`))
        if (!this.__launched) reject(new Error(`api.connectBrowser was called, but failed doing so`))

        const page = await this.browser.newPage()
        this.data.emit(`debug`, `Created a new page`)

        await page.setRequestInterception(true)

        const session = await page.target().createCDPSession();
        await session.send('Page.enable'); // Disable automatic view stopper
        await session.send('Page.setWebLifecycleState', { state: 'active' });
        //await session.send('Network.clearBrowserCookies');

        this.data.emit(`debug`, `Spoofed new page`)

        page.on('console', message => {
            if (message.type() === "error") {
                this.data.emit(`pageError`, message.text());
            } else if (message.type() === "warning") {
                this.data.emit(`pageWarning`, message.text());
            } else if (message.type() === "info") {
                this.data.emit(`pageInfo`, message.text());
            } else if (message.type() === "log") {
                this.data.emit(`pageMessage`, message.text());
            }
        }) // Monitor page information

        page.on('pageerror', message => this.data.emit(`pageError`, message.message)) // Oops, error

        let proxy = this.extra.proxyServer

        page.on('request', (request) => {
            if (this.extra.saveBandwith) { // Block useless media
                if (["image", "font", "other"].includes(request.resourceType())) return request.abort()

                if (request.resourceType() === "stylesheet") {
                    if (request.url().includes(`https://www.youtube.com/s/desktop/`)) return request.abort()
                    if (request.url().includes(`fonts.googleapis.com/css`)) return request.abort()
                }

                if (request.resourceType() === "media") {
                    return request.abort()
                }

                if (request.url().includes("/ads")) {
                    return request.abort()
                }
            }


            this.data.emit(`requestAccepted`, { url: request.url(), headers: request.headers() })

            if (proxy && proxy !== "direct://") {
                useProxy(request, proxy)
            } else {
                request.continue()
            }
        })

        page.on('response', async (response) => { // Monitor responses and bandwith usage
            let headers = response.headers()
            this.data.emit(`requestHandled`, { url: response.url(), headers: headers, status: response.status() })

            if (headers[`content-length`]) {
                this.data.emit("bandwithUsed", parseFloat(headers[`content-length`]))
            } else {
                response.buffer().then((buffer) => {
                    this.data.emit("bandwithUsed", buffer.length)
                }).catch(() => { })
            }
        })

        page.on('requestfailed', (request) => {
            this.data.emit(`requestFail`, { error: request.failure().errorText, url: request.url() })
        })

        resolve(page)
    })
}

module.exports = handleNewPage