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
            xvfb: xvfb,
            browser: browser,
        },
        config: config,
    }).catch(async (error) => {
        log.error(`Failed to run bot (${error.name}: ${error.message})`);
    });
}

main()
    .catch(console.error)
