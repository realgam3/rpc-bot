const pino = require("pino");

const {getEnv} = require("./utils");

const log = pino({
    level: getEnv("LOG_LEVEL", "info").toLowerCase(),
    transport: {
        target: "pino-pretty"
    },
});

module.exports = {
    log,
}