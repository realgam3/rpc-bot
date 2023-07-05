const pino = require("pino");

const {getEnv} = require("./utils");

const logger = pino({
    level: getEnv("LOG_LEVEL", "info"),
    transport: {
        target: "pino-pretty"
    },
});

module.exports = {
    logger,
}