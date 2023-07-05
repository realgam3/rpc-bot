const {log} = require("./logs");
const {getEnv} = require("./utils");

const config = {
    "timeout": parseInt(getEnv("TIMEOUT", 30000)),
    "queue": {
        "url": getEnv("RABBITMQ_URL", "amqp://guest:guest@queue:5672"),
        "name": getEnv("QUEUE_NAME", "queue"),
        "prefetch": parseInt(getEnv("PREFETCH", 1)),
    },
    "init": async () => {
        log.info(`Initializing...`);
    },
    "extend": {
        "example": async () => {
            log.info(`Example extend function`);
        },
    },
    "allowed_actions": [
        "extend.example",
    ],
}

module.exports = config;
