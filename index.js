#!/usr/bin/env node

const path = require("path");
const axios = require("axios");
const amqplib = require("amqplib");
const {promises: fs} = require("fs");
const stringify = require('json-stringify-safe');

const bot = require("./bot");
const {log} = require("./logs");
const utils = require("./utils");
const parsers = require("./parsers");
const defaultConfig = require("./config");

global.log = log;

async function main(options = {}) {
    const args = utils.getKey(options, "args", {});
    options.config = utils.getKey(options, "config", defaultConfig);
    if (args?.config) {
        switch (path.extname(args.config)) {
            case undefined:
                break;
            case ".json":
            case ".yaml":
                let data = await fs.readFile(path.resolve(args.config));
                options.config = utils.deepMerge(options.config, parsers.parseYaml(data.toString()));
                break;
            case ".js":
                options.config = utils.deepMerge(options.config, require(path.resolve(args.config)));
                break;
            default:
                throw new Error(`Unsupported config file type: ${path.extname(args.config)}`);
        }
    }
    if (args?.debug) {
        log.level = "debug";
    }
    const config = options.config;

    const tries = parseInt(utils.getKey(options, "tries", 15));
    const delay = parseInt(utils.getKey(options, "delay", 2000));
    let connection = null;
    for (let i = 0; i < tries; i++) {
        try {
            connection = await amqplib.connect(config.queue.url);
            break;
        } catch (error) {
            log.error(`Failed to connect to queue (${error.name}: ${error.message})`);
            await utils.sleep(delay);
        }
    }

    if (!connection) {
        throw new Error(`Failed to connect to queue after ${tries} tries`);
    }

    await config?.events?.onInit?.(options?.context);
    await utils.onExit(config?.events?.onExit?.bind?.(null, options?.context));
    const channel = await connection.createChannel();
    await channel.assertQueue(config.queue.name, {
        ...config?.queue?.options || {}
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
    log,
    main,
    utils,
    parsers,
}