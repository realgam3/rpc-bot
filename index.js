#!/usr/bin/env node

const path = require("path");
const axios = require("axios");
const amqplib = require("amqplib");
const {promises: fs} = require("fs");
const stringify = require('json-stringify-safe');

const {log} = require("./logs");
const Context = require("./context");
const {parseYaml} = require("./parsers");
const defaultConfig = require("./config");
const {sleep, getKey, atExit, deepMerge, popKey} = require("./utils");

async function main(options = {}) {
    let config = popKey(options, "config", defaultConfig);
    const args = getKey(options, "args", {});
    if (args?.config) {
        switch (path.extname(args.config)) {
            case undefined:
                break;
            case ".json":
            case ".yaml":
                let data = await fs.readFile(path.resolve(args.config));
                config = deepMerge(config, parseYaml(data.toString()));
                break;
            case ".js":
                config = deepMerge(config, require(path.resolve(args.config)));
                break;
            default:
                throw new Error(`Unsupported config file type: ${path.extname(args.config)}`);
        }
    }
    if (args?.debug) {
        log.level = "debug";
    }
    const context = new Context(config, options);

    const tries = parseInt(getKey(context.options, "tries", 15));
    const delay = parseInt(getKey(context.options, "delay", 2000));
    let connection = null;
    for (let i = 0; i < tries; i++) {
        try {
            connection = await amqplib.connect(config.queue.url);
            break;
        } catch (error) {
            log.error(`Failed to connect to queue (${error.name}: ${error.message})`);
            await sleep(delay);
        }
    }

    if (!connection) {
        throw new Error(`Failed to connect to queue after ${tries} tries`);
    }

    await context.onInit();
    await atExit(context.onExit);
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

            let res = await context.run(data);
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