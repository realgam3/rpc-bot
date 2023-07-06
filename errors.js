class TimeOutError extends Error {
    constructor(message = "Timeout exceeded") {
        super(message);
        this.name = "TimeOutError";
    }
}

class MethodNotAllowedError extends Error {
    constructor(message = "Method not allowed") {
        super(message);
        this.name = "MethodNotAllowedError";
    }
}

module.exports = {
    TimeOutError,
    MethodNotAllowedError,
}