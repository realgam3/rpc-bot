const yaml = require('js-yaml');
const {Command} = require("commander");
const unsafe = require('js-yaml-js-types').all;

const schema = yaml.DEFAULT_SCHEMA.extend(unsafe);
const ENV_VAR_PATTERN = /(?<escape>\$)*\$(?:(?<variable_no_default>\w+\b)|\{(?<variable>\w+)(?::?(?<action>[\-?])(?<value>[^}]+))?})/g;

function replaceEnvVars(...match) {
    let groups = match.pop();

    let escape = groups['escape'] || '';
    if (escape.length % 2) {
        return match[0];
    }

    let variable = groups['variable_no_default'] || groups['variable'];
    let action_value = groups['value'] || '';

    if (!variable && groups['action'] === '?') {
        throw new Error(action_value);
    }

    return match[0].replace(
        match[0],
        process.env[variable] || action_value
    );
}


function parseYaml(input, options = {}) {
    const preprocessedInput = input.replace(ENV_VAR_PATTERN, replaceEnvVars);
    return yaml.load(preprocessedInput, {...options, schema});
}

function parseArgs(extendCallback) {
    const program = new Command();
    program
        .name("rpc-bot")
        .description(
            "RPC Bot Server - A sophisticated queue-driven bot " +
            "designed to manage and execute procedures across multiple remote machines."
        )
        .version("0.1.0");

    program
        .option("-d, --debug", "output extra debugging")
        .option("-c, --config <path>", "path to config.(js|yaml|json) file");

    extendCallback?.(program);

    program.parse();

    return program.opts();
}

module.exports = {
    parseYaml,
    parseArgs,
}