const yaml = require('js-yaml');
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


function loadYaml(input, options = {}) {
    const preprocessedInput = input.replace(ENV_VAR_PATTERN, replaceEnvVars);
    return yaml.load(preprocessedInput, {...options, schema});
}

module.exports = {
    loadYaml,
}