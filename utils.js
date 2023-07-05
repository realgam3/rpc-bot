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


module.exports = {
    sleep,
    getKey,
    popKey,
    getEnv,
    trimLongStrings,
}