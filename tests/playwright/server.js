const Xvfb = require("xvfb");
const {options} = require("axios");

const {getBrowser} = require("./utils");

async function main(config = require("./config")) {
    config.queue.host = "localhost";
    config.timeout = 6000;

    // Start xvfb
    const xvfb = new Xvfb({
        silent: true,
        xvfb_args: config.xvfb.args,
    });
    xvfb.start();

    // Start Browser
    const browser = await getBrowser(config.browser);
    await options?.extend?.init?.();

    require("../../").main({
        context: {
            browser: browser,
        },
        config: config,
        callbacks: {
            onStart: async function (context, config) {
                // Create Browser Context
                context.context = await context.browser.newContext(config.context);

                // Create Page
                context.page = await context.context.newPage(config.page);

                // Setup Events
                for (let [eventName, event] of Object.entries(config.context.events)) {
                    context.context.on(eventName, event);
                }

                // Hook JavaScript Functions
                await context.page.addInitScript(`(${config.page.evaluate.document_start.toString()})();`);
            },
            onFinish: async function (context) {
                // Close Browser Context
                await context.context.close();
            },
            onError(error) {
                console.error(error);
            }
        }
    }).catch(async (error) => {
        console.error(error);

        // Close Browser
        await browser.close();

        // Stop xvfb
        xvfb.stop();
    });
}

main()
    .catch(console.error)
