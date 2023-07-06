#!/usr/bin/env node

const path = require("path");
const axios = require("axios");
const amqplib = require("amqplib");
const {promises: fs} = require("fs");
const stringify = require('json-stringify-safe');

const bot = require("./bot");
const {log} = require("./logs");
const {loadYaml} = require("./parsers");
const defaultConfig = require("./config");
const {sleep, getKey, onExit, deepMerge} = require("./utils");

global.log = log;

async function main(options = {}) {
    const args = getKey(options, "args", {});
    options.config = getKey(options, "config", defaultConfig);
    if (args?.config) {
        switch (path.extname(args.config)) {
            case undefined:
                break;
            case ".json":
            case ".yaml":
                let data = await fs.readFile(path.resolve(args.config));
                options.config = deepMerge(options.config, loadYaml(data.toString()));
                break;
            case ".js":
                options.config = deepMerge(options.config, require(path.resolve(args.config)));
                break;
            default:
                throw new Error(`Unsupported config file type: ${path.extname(args.config)}`);
        }
    }
    if (args?.debug) {
        log.level = "debug";
    }
    const config = options.config;

    let connection = null;
    while (!connection) {
        try {
            connection = await amqplib.connect(config.queue.url);
        } catch (error) {
            log.error(`Failed to connect to queue (${error.name}: ${error.message})`);
            await sleep();
        }
    }

    await config?.events?.onInit?.(options?.context);
    await onExit(config?.events?.onExit?.bind?.(null, options?.context));
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

            let res = await bot.run(data, options);
            let resMsg = stringify(res);

            if (data?.webhook) {
                axios.post(data?.webhook, resMsg, {
                    headers: {
                        "Content-Type": "application/json",
                    }
                }).catch((error) => {
                    log.error(`Failed to send webhook (${error.name}: ${error.message})`);
                });
            }

            if (msg?.properties?.replyTo) {
                await channel.sendToQueue(msg.properties.replyTo, Buffer.from(resMsg), {
                    correlationId: msg.properties.correlationId,
                });
            }
        } catch (error) {
            log.error(`Failed to run task (${error.name}: ${error.message})`);
        }
        return channel.ackAll();
    });
}

module.exports = {
    main,
}