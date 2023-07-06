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

class MethodNotExistError extends Error {
    constructor(message = "Method not Exist") {
        super(message);
        this.name = "MethodNotExistError";
    }
}


module.exports = {
    TimeOutError,
    MethodNotExistError,
    MethodNotAllowedError,
}