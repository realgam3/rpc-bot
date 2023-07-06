#!/usr/bin/env node

const {Command} = require("commander");

const program = new Command();

program
    .name("rpc-bot")
    .description("RPC Bot Server - A sophisticated queue-driven bot designed to manage and execute procedures across multiple remote machines.")
    .version("0.1.0");

program
    .option("-d, --debug", "output extra debugging")
    .option("-c, --config <path>", "path to config.(js|yaml|json) file");

program.parse();

require(".")
    .main({
        args: program.opts()
    })
    .catch(console.error);
