const {getEnv} = require("./utils");

const config = {
    "timeout": parseInt(getEnv("TIMEOUT", 30000)),
    "queue": {
        "port": parseInt(getEnv("RABBITMQ_PORT", 5672)),
        "host": getEnv("RABBITMQ_HOST", "queue"),
        "name": getEnv("QUEUE_NAME", "queue"),
        "username": getEnv("RABBITMQ_USERNAME", "guest"),
        "password": getEnv("RABBITMQ_PASSWORD", "guest"),
        "prefetch": 1,
        "maxLength": 1,
    },
    "extend": {
        "init": async () => {
            console.log(`[+] Initializing...`);
        },
        "example": async () => {
            console.log(`Example extend function`);
        },
    },
    "allowed_actions": [
        "extend.example",
    ],
}

module.exports = config;
