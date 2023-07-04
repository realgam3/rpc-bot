const {firefox, chromium, webkit} = require("playwright");

async function getBrowser(browserConfig) {
    let browser = null;
    const browserOptions = browserConfig.options;
    switch (browserConfig.product) {
        case "firefox":
            browser = await firefox.launch(browserOptions);
            break;
        case "chromium":
        case "chrome":
            browser = await chromium.launch(browserOptions);
            break;
        case "webkit":
            browser = await webkit.launch(browserOptions);
            break;
        default:
            throw new Error(`Invalid browser product: ${browserConfig.product}`);
    }
    return browser;
}

module.exports = {
    getBrowser,
}