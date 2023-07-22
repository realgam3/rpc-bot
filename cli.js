#!/usr/bin/env node

const {log} = require("./logs");
const {parseArgs} = require("./parsers");


require(".")
    .main({
        args: parseArgs(),
    })
    .catch((error) => {
        log.error(error);
        process.exit(1);
    });
