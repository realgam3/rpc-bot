const {log} = require("./logs");
const defaultConfig = require("./config");
const {getKey, trimLongStrings, isAllowedAction, getObjectAttribute} = require("./utils");
const {TimeOutError, MethodNotAllowedError} = require("./errors");

function bot(data, context, config = defaultConfig) {
    let timedOut = false;
    return Promise.race([
        new Promise(async (resolve, reject) => {
            let actions = Array.from(new Set(data.actions.map((action) => {
                return action.action;
            })));
            let disAllowedActions = actions.map((action) => {
                if (!isAllowedAction(action, config)) {
                    return action;
                }
            }).filter(value => value);
            if (disAllowedActions.length > 0) {
                return reject(new MethodNotAllowedError(`Methods not allowed: ${disAllowedActions.join(", ")}`));
            }

            for (let {action, args = []} of data.actions || []) {
                try {
                    if (timedOut) {
                        return reject(new TimeOutError());
                    }

                    let actionArgs = trimLongStrings(args);
                    log.info(`Executing: ${action}(${actionArgs.map(JSON.stringify).join(", ")})`);

                    const [obj, func] = getObjectAttribute(context, action);
                    if (action.split(".", 1)[0] === "extend") {
                        args = [context, ...args];
                    }
                    context.result = await func.apply(obj, args);
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
    let res = {
        "status": context?.error ? "fail" : "ok",
        "result": context?.results.pop(),
        "error": (context?.error ? {
            "name": context.error.name,
            "message": context.error.message,
        } : undefined),
    };

    // Cleanup
    await config?.events?.onTaskComplete?.(context);

    return res;
}

module.exports = {
    run
};
