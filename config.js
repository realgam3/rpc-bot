const {getEnv} = require("./utils");

const config = {
    "timeout": parseInt(getEnv("TIMEOUT", 30000)),
    "queue": {
        "url": getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672"),
        "name": getEnv("QUEUE_NAME", "queue"),
        "prefetch": parseInt(getEnv("PREFETCH", 1)),
        "options": {
            "durable": false,
        }
    },
    "events": {
        "onInit": async function () {
            this.log.info(`Initializing...`);
        },
    },
    "extend": {
        "example": async function () {
            this.log.info(`Example extend function`);
        },
        "notAllowed": async function () {
            this.log.warn(`This function is not allowed`);
        }
    },
    "allowed_actions": [
        "extend.*",
    ],
    "disallowed_actions": [
        "extend.notAllowed",
    ],
    "disallowed_attributes": [
        "__proto__",
        "constructor",
        "prototype",
        "toString",
        "valueOf"
    ],
}

module.exports = config;
