const axios = require("axios");
const {minimatch} = require('minimatch')
const stringify = require('json-stringify-safe');

const {log} = require("./logs");
const defaultConfig = require("./config");
const {getKey, trimLongStrings} = require("./utils");
const {TimeOutError, MethodNotAllowedError} = require("./errors");

function bot(data, context, config = defaultConfig) {
    let timedOut = false;
    return Promise.race([
        new Promise(async (resolve, reject) => {
            for (let {action, args = []} of data.actions || []) {
                try {
                    if (timedOut) {
                        return reject(new TimeOutError());
                    }

                    if (!config?.allowed_actions?.some((pattern) => minimatch(action, pattern))) {
                        return reject(new MethodNotAllowedError(`The action ${action} was not allowed`));
                    }

                    let actionArgs = trimLongStrings(args);
                    log.info(`Executing: ${action}(${actionArgs.map(JSON.stringify).join(", ")})`);

                    const [objectName, funcName] = action.split(".");
                    const object = context[objectName];
                    const func = object[funcName];
                    if (objectName === "extend") {
                        args = [context, ...args];
                    }
                    context.result = await func.apply(object, args);
                    context.results.push({
                        "action": action,
                        "result": context.result,
                    });
                } catch (error) {
                    log.error(`Failed to run action ${action} (${error.name}: ${error.message})`);
                    context.error = error;
                    context.results.push({
                        "action": action,
                        "error": {
                            "name": error.name,
                            "message": error.message,
                        }
                    });
                    return reject(error);
                }
            }
            resolve();
        }),
        new Promise((resolve, reject) => {
            setTimeout(() => {
                timedOut = true;
                reject(new TimeOutError());
            }, config.timeout);
        })
    ])
}

async function run(data = {}, options = {}) {
    const config = getKey(options, "config", defaultConfig);
    const callbacks = getKey(options, "callbacks", {});
    // Bot Context
    const context = {
        // Extend the context with the data
        ...options?.context || {},
        // Save the result for the next function (if needed)
        result: null,
        results: [],
        error: null,
        // Extend with custom functions
        extend: config?.extend || {},
    };

    // Setup Events
    await config?.events?.onTaskStart?.(context);

    // Run Bot
    try {
        await bot(data, context, config);
    } catch (error) {
        log.error(`Failed to run bot (${error.name}: ${error.message})`);
        context.error = error;
        await config?.events?.onTaskError?.(error, context);
    }

    // Report Results
    if (data?.webhook) {
        axios.post(data.webhook, stringify({
            "status": context?.error ? "fail" : "ok",
            "result": context?.results.pop(),
            "error": (context?.error ? {
                "name": context.error.name,
                "message": context.error.message,
            } : undefined),
        }), {
            headers: {
                "Content-Type": "application/json",
            }
        }).catch((error) => {
            log.error(`Failed to send webhook (${error.name}: ${error.message})`);
        });
    }

    // Cleanup
    await config?.events?.onTaskComplete?.(context);
}

module.exports = {
    run
};
