const axios = require("axios");
const {minimatch} = require('minimatch')
const stringify = require('json-stringify-safe');

const {getKey} = require("./utils");
const defaultConfig = require("./config")
const {TimeOutError} = require("./exceptions");

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
                        console.warn(`[WARN] the action ${action} was not allowed`);
                        continue;
                    }

                    let actionArgs = JSON.parse(JSON.stringify(args));
                    if (config?.masks?.[action]) {
                        await config.masks[action].apply(this, actionArgs);
                    }
                    console.log(`[INFO] ${action}(${JSON.stringify(actionArgs).replace(/(^\[|]$)/g, "")})`);

                    const [objectName, funcName] = action.split(".");
                    const object = context[objectName];
                    const func = object[funcName];
                    context.result = await func.apply(object, args);
                    context.results.push({
                        "action": action,
                        "result": context.result,
                    });
                } catch (error) {
                    console.error(`[ERROR] failed to run action ${action}: ${error.name}`);
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
    global.context = context;

    // Setup Events
    await callbacks?.onStart?.(context, config);

    // Run Bot
    try {
        await bot(data, context, config);
    } catch (error) {
        console.error(`[ERROR] failed to run bot: ${error.name}`);
        context.error = error;
        await callbacks?.onError?.(error, context, config);
    }

    // Report Results
    if (data?.webhook) {
        axios.post(data.webhook, stringify({
            "status": context?.error ? "fail" : "ok",
            "result": context?.results.pop(),
            "error": (context?.error ? {
                "name": context.error.name,
                "message": context.error.message,
            } : {}),
        }), {
            headers: {
                "Content-Type": "application/json",
            }
        }).catch((e) => {
            console.error(`[ERROR] failed to send webhook: ${e.name}`);
        });
    }

    // Cleanup
    await callbacks?.onFinish?.(context, config);

    console.log("[INFO] bot finished");
}

module.exports = {
    run
};
