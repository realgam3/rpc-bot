#!/usr/bin/env node

const {log} = require("./logs");
const {parseArgs} = require("./parsers");


require(".")
    .main({
        args: parseArgs(),
    })
    .catch((error) => {
        log.error(`Failed to run bot (${error.name}: ${error.message})`);
        process.exit(1);
    });
