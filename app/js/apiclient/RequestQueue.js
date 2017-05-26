function ApiClientRequestQueue(client, message, totalRequests, showPercentComplete) {
    this.client = client;
    this.message = message;
    this.totalRequests = totalRequests;
    this.showPercentComplete = showPercentComplete;
    this.queue = [];
    this.inProgress = false;
    this.successCallback = null;
    this.xhr = null;
}
ApiClientRequestQueue.prototype.success = function (successCallback) {
    this.successCallback = successCallback;
    return this;
};
ApiClientRequestQueue.prototype.push = function (options) {
    this.queue.push(options);
    return this;
};
ApiClientRequestQueue.prototype.start = function () {
    // TODO: start processing queue
};
