// Error with the HTTP status the adapter should answer with.
class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.name = 'HttpError';
        this.status = status;
    }
}

module.exports = { HttpError };
