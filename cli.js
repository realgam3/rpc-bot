#!/usr/bin/env node

const {parseArgs} = require("./parsers");


require(".")
    .main({
        args: parseArgs(),
    })
    .catch(console.error);
