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

module.exports = {
    sleep,
    getKey,
    popKey,
    getEnv,
}