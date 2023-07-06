function sleep(ms = 1000) {
    return new Promise(r => setTimeout(r, ms));
}

function getKey(obj, key, defaultValue = undefined) {
    if (obj[key] === undefined) {
        return defaultValue;
    }
    return obj[key];
}

function getEnv(key, defaultValue = undefined) {
    if (process.env[key] === undefined) {
        return defaultValue;
    }
    return process.env[key];
}

function popKey(obj, key, defaultValue = undefined) {
    const res = getKey(obj, key, defaultValue);
    if (obj[key] !== undefined) {
        delete obj[key];
    }
    return res;
}

function trimLongStrings(obj, maxLen = 48) {
    if (typeof obj === 'string') {
        return obj.length > maxLen ? `${obj.substring(0, maxLen)}...` : obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => trimLongStrings(item, maxLen));
    }

    if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj).reduce((acc, key) => {
            acc[key] = trimLongStrings(obj[key], maxLen);
            return acc;
        }, {});
    }

    return obj;
}

function onExit(callback) {
    if (!callback) {
        return;
    }
    process.on("exit", callback);
    process.on("SIGINT", callback);
    process.on("SIGTERM", callback);
    process.on("uncaughtException", callback);
}

function deepMerge(...objects) {
    const output = {};

    for (let obj of objects) {
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (Array.isArray(obj[key])) {
                    output[key] = [...obj[key]];
                } else if (typeof obj[key] === 'object' && obj[key] !== null && output[key]) {
                    output[key] = deepMerge(output[key], obj[key]);
                } else {
                    output[key] = obj[key];
                }
            }
        }
    }

    return output;
}


module.exports = {
    sleep,
    getKey,
    popKey,
    getEnv,
    onExit,
    deepMerge,
    trimLongStrings,
}