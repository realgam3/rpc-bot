class TimeOutError extends Error {
    constructor(message = "Timeout exceeded") {
        super(message);
        this.name = "TimeOutError";
    }
}

module.exports = {
    TimeOutError,
}