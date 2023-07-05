#!/usr/bin/env node

const amqplib = require("amqplib");

const bot = require("./bot");
const {logger} = require("./log");
const {sleep, getKey} = require("./utils");

async function main(options = {}) {
    const config = getKey(options, "config", require("./config"));

    let connection = null;
    while (!connection) {
        try {
            connection = await amqplib.connect({
                protocol: "amqp",
                maxLength: config.queue.maxLength,
                port: config.queue.port,
                hostname: config.queue.host,
                username: config.queue.username,
                password: config.queue.password,
            });
        } catch (error) {
            console.error(error);
            await sleep();
        }
    }

    config?.extend?.init?.(options?.context, options?.config);
    const channel = await connection.createChannel();
    await channel.assertQueue(config.queue.name, {
        durable: false
    });
    await channel.prefetch(config.queue.prefetch);
    await channel.consume(config.queue.name, async function (msg) {
        logger.info(`Received: ${msg.content.toString().length} bytes`);
        try {
            const data = JSON.parse(msg.content.toString());
            await bot.run(data, options);
        } catch (error) {
            logger.error(`${error.name}: ${error.message}`);
        }
        return channel.ackAll();
    });
}

module.exports = {
    main,
}