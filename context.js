const {log} = require("./logs");
const defaultConfig = require("./config");
const {MethodNotAllowedError, TimeOutError} = require("./errors");
const {getKey, isAllowedAction, trimLongStrings, getObjectAttribute} = require("./utils");

const emptyFunction = function () {
}


class Extend {
    constructor(context) {
        this.log = log;
        this.context = context;
        this.config = this.context.config;
        for (let [key, value] of Object.entries(this?.config?.extend || {})) {
            this[key] = value;
        }
    }
}

class Context {
    constructor(config = defaultConfig, options = {}) {
        this.log = log;
        this.options = options || {};
        for (let [key, value] of Object.entries(this.options.context || {})) {
            this[key] = value;
        }
        this.config = Object.freeze(config);
        this.onInit = config?.events?.onInit || emptyFunction;
        this.onExit = config?.events?.onExit || emptyFunction;
        this.onTaskStart = config?.events?.onTaskStart || emptyFunction;
        this.onTaskComplete = config?.events?.onTaskComplete || emptyFunction;
        this.onTaskError = config?.events?.onTaskError || emptyFunction;
        this.extend = new Extend(this);
    }

    _bot(data = {}, context = {timeout: false, error: null, result: null, results: []}) {
        return new Promise(async (resolve, reject) => {
            let actions = Array.from(new Set(data.actions.map((action) => {
                return action.action;
            })));
            let disAllowedActions = actions.map((action) => {
                if (!isAllowedAction(action, this.config)) {
                    return action;
                }
            }).filter(value => value);
            if (disAllowedActions.length > 0) {
                return reject(new MethodNotAllowedError(`Methods not allowed: ${disAllowedActions.join(", ")}`));
            }

            for (let {action, args = []} of data.actions || []) {
                try {
                    if (context.timeout) {
                        return reject(new TimeOutError());
                    }

                    let actionArgs = trimLongStrings(args);
                    this.log.info(`Executing: ${action}(${actionArgs.map(JSON.stringify).join(", ")})`);

                    let [obj, func] = getObjectAttribute(this, action);
                    context.result = await func.apply(obj, args);
                    context.results.push({
                        "action": action,
                        "result": context.result,
                    });
                } catch (error) {
                    this.log.error(`Failed to run action ${action} (${error.name}: ${error.message})`);
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
        });
    }

    bot(data = {}, context = {timeout: false, error: null, result: null, results: []}) {
        let timeout = data.timeout ?? getKey(this.config, "timeout", 30000);
        if (!timeout) {
            return this._bot(data, context);
        }

        return Promise.race([
            this._bot(data, context),
            new Promise((resolve, reject) => {
                setTimeout(() => {
                    context.timeout = true;
                    reject(new TimeOutError());
                }, timeout);
            })
        ]);
    }

    async run(data = {}) {
        // Setup Events
        await this.onTaskStart();

        // Init Context
        const context = {
            timeout: false,
            error: null,
            result: null,
            results: []
        }

        // Run Bot
        try {
            await this.bot(data, context);
        } catch (error) {
            this.log.error(`Failed to run bot (${error.name}: ${error.message})`);
            context.error = error;
            await this.onTaskError(error);
        }

        // Report Results
        let res = {
            "status": context?.error ? "fail" : "ok",
            "result": context?.results[context?.results.at(-1)],
            "error": (context?.error ? {
                "name": context.error.name,
                "message": context.error.message,
            } : undefined),
        };
        if (res?.error && !res?.result?.error) {
            res.result = undefined;
        }

        // Cleanup
        await this.onTaskComplete();

        return res;
    }
}


module.exports = Context;