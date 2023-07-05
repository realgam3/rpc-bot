const {log} = require("../../logs");
const {getEnv} = require("../../utils");

const config = {
    "timeout": parseInt(getEnv("TIMEOUT", 30000)),
    "queue": {
        "url": getEnv("RABBITMQ_URL", "amqp://guest:guest@queue:5672"),
        "name": getEnv("QUEUE_NAME", "queue"),
        "prefetch": parseInt(getEnv("PREFETCH", 1)),
    },
    "init": async () => {
        log.info(`Initializing Browser...`);
    },
    "extend": {
        "example": async () => {
            log.info(`Example extend function`);
        },
        // Add close pages function
        closePages: async (context) => {
            // for (let page of await context.context.pages()) {
            //     await page.close();
            // }
            await context.context.close();
            context.context = await context.browser.newContext(config.context.options);
            context.page = await context.context.newPage();

            for (let [eventName, event] of Object.entries(config.context.events)) {
                context.context.on(eventName, event);
            }
            await context.page.addInitScript(`(${config.page.evaluate.document_start.toString()})();`);
        },
        slowType: async (context, selector, text, options = {"delay": 500}) => {
            await context.page.type(selector, text, options);
        },
        setCookies: async (context, cookies) => {
            await context.context.addCookies(cookies);
        },
    },
    "allowed_actions": [
        "extend.example",
        "page.type",
        "page.goto",
        "page.click",
        "page.addCookies",
        "extend.slowType",
        "extend.setCookies",
        "extend.closePages",
        "page.waitForTimeout",
        "page.waitForSelector",
    ],
    "xvfb": {
        "args": [
            "-screen", "0", '1280x720x24', "-ac"
        ]
    },
    "browser": {
        "product": "chrome",
        "options": {
            "headless": false,
            "args": [
                "--no-sandbox",
                "--disable-gpu",
                "--ignore-certificate-errors",
                "--disable-dev-shm-usage",
            ]
        }
    },
    "context": {
        "events": {
            // "console": message => console.debug(`[${message.type().toUpperCase()}] ${message.text()}`),
            "error": message => console.error(message),
            "pageerror": message => console.error(message),
        },
        "options": {
            "ignoreHTTPSErrors": true,
        }
    },
    "page": {
        "evaluate": {
            "document_start": function () {
                window.open = () => {
                    console.warn('window.open');
                };
                window.prompt = () => {
                    console.warn('window.prompt');
                };
                window.confirm = () => {
                    console.warn('window.confirm');
                };
                window.alert = () => {
                    console.warn('window.alert');
                };
            }
        }
    }
};

module.exports = config;