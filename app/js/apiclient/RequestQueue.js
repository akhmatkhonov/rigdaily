function ApiClientRequestQueue(client, message, totalRequests, showPercentComplete, concurrentLimit, allowCancel) {
    this.client = client;
    this.message = message;
    this.totalRequests = totalRequests;
    this.showPercentComplete = showPercentComplete;
    this.queue = [];
    this.inProgressRequests = 0;
    this.erroredRequests = 0;
    this.completeRequests = 0;
    this.successCallback = null;
    this.concurrentLimit = concurrentLimit;
    this.allowCancel = allowCancel || false;
    this.cancelled = false;
    this.cancelCallback = null;
    this.xhr = null;
}
ApiClientRequestQueue.prototype.cancel = function (callback) {
    if (this.allowCancel) {
        this.cancelled = true;
        this.cancelCallback = callback;
        this.client.loadingUi.hideLoading();

        if (this.inProgressRequests === 0 && typeof this.cancelCallback === 'function') {
            this.cancelCallback.call(this);
            this.cancelCallback = null;
        }
    }
};
ApiClientRequestQueue.prototype.success = function (successCallback) {
    this.successCallback = successCallback;
    return this;
};
ApiClientRequestQueue.prototype.push = function (options) {
    options.queue = this;
    this.queue.push(options);
    return this;
};
ApiClientRequestQueue.prototype.isEmpty = function () {
    return this.queue.length === 0;
};
ApiClientRequestQueue.prototype.start = function () {
    this.inProgressRequests = 0;
    this.erroredRequests = 0;
    this.completeRequests = 0;
    this.cancelled = false;
    this.processNext();
};
ApiClientRequestQueue.prototype.processNext = function () {
    if (this.cancelled) {
        if (this.inProgressRequests === 0 && typeof this.cancelCallback === 'function') {
            this.cancelCallback.call(this);
            this.cancelCallback = null;
        }
        return;
    }

    // Can be called from ErrorQueueUI or AuthUI
    if (this.inProgressRequests >= this.concurrentLimit) {
        return;
    }

    var options = this.queue.shift();
    if (typeof options === 'undefined') {
        if (this.inProgressRequests === 0 && this.erroredRequests === 0) {
            this.client.loadingUi.hideLoading();
            if (typeof this.successCallback === 'function') {
                try {
                    this.successCallback.call(this);
                } catch (e) {
                    console.error(e.message);
                }
            }
        }
        return;
    }

    this.inProgressRequests++;

    if (!this.client.errorQueueUi.isOpen() && !this.client.loadingUi.isShown()) {
        this.client.loadingUi.showLoading(this.message);
    }

    options.complete = (function () {
        if (this.erroredRequests !== 0) {
            this.client.loadingUi.hideLoading();
        }

        this.inProgressRequests--;
        this.processNext();
    }).bind(this);
    if (!options.queueSuccessCallbackSet) {
        options.queueSuccessCallbackSet = true;
        var successCallback = options.success;
        options.success = (function (data) {
            this.completeRequests++;
            if (this.showPercentComplete && this.client.loadingUi.isShown()) {
                var percent = parseInt(this.completeRequests / this.totalRequests * 100);
                if (percent > 100) {
                    percent = 100;
                }
                this.client.loadingUi.showLoading(this.message + ' ' + percent + '%');
            }
            console.log('Queued request success (' + this.completeRequests + ' of ' + this.totalRequests + ' assumed)');
            if (typeof successCallback === 'function') {
                successCallback.call(this, data);
            }
        }).bind(this);
    }

    this.client.request(options);

    if (this.inProgressRequests < this.concurrentLimit) {
        this.processNext();
    }
};
