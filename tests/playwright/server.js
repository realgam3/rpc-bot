const Xvfb = require("xvfb");

const {log} = require("../../logs");
const {getBrowser} = require("./utils");

async function main(config = require("./config")) {
    // Start xvfb
    const xvfb = new Xvfb({
        silent: true,
        xvfb_args: config.xvfb.args,
    });
    xvfb.start();

    // Start Browser
    const browser = await getBrowser(config.browser);

    require("../../").main({
        context: {
            browser: browser,
        },
        config: config,
        callbacks: {
            onStart: async (context, config) => {
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
            onFinish: async (context) => {
                // Close Browser Context
                await context.context.close();
            },
            onError: async (error) => {
                if (error.name === "TimeoutError") {
                    console.error("Bot task timed out");
                }
            },
            onExit: async () => {
                log.info(`Cleaning up...`);

                // Close Browser
                await browser.close();

                // Stop xvfb
                xvfb.stop();
            }
        }
    }).catch(async (error) => {
        log.error(`Failed to run bot (${error.name}: ${error.message})`);
    });
}

main()
    .catch(console.error)
