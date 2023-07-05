#!/usr/bin/env node

const amqplib = require("amqplib");

const bot = require("./bot");
const {log} = require("./logs");
const {sleep, getKey} = require("./utils");

async function main(options = {}) {
    const config = getKey(options, "config", require("./config"));

    let connection = null;
    while (!connection) {
        try {
            connection = await amqplib.connect({
                protocol: "amqp",
                port: config.queue.port,
                hostname: config.queue.host,
                username: config.queue.username,
                password: config.queue.password,
            });
        } catch (error) {
            log.error(`Failed to connect to queue (${error.name}: ${error.message})`);
            await sleep();
        }
    }

    config?.init?.(options?.context);
    const channel = await connection.createChannel();
    await channel.assertQueue(config.queue.name, {
        durable: false,
    });
    await channel.prefetch(config.queue.prefetch);
    await channel.consume(config.queue.name, async function (msg) {
        log.info(`Received: ${msg.content.toString().length} bytes`);
        log.debug(`Data Received: ${msg.content.toString()}`);
        try {
            const data = JSON.parse(msg.content.toString());
            await bot.run(data, options);
        } catch (error) {
            log.error(`Failed to run task (${error.name}: ${error.message})`);
        }
        return channel.ackAll();
    });
}

module.exports = {
    main,
}