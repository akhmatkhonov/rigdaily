function ApiClient(endpoint) {
    this.loadingUi = new ApiClientLoadingUI();
    this.authUi = new ApiClientAuthUI(this, (function (username, password) {
        this.setCredentials(username, password);
    }).bind(this), endpoint);
    this.errorQueueUi = new ApiClientErrorQueueUI(this);
    this.credentials = {
        username: null,
        encoded: null
    };
    this.userSettings = null;
    this.authSuccessCallback = null;
    this.endpoint = endpoint;
}
ApiClient.prototype.authSuccess = function (authSuccessCallback) {
    this.authSuccessCallback = authSuccessCallback;
    return this;
};
ApiClient.prototype.setCredentials = function (username, password) {
    this.credentials.username = username;
    this.credentials.encoded = btoa(username + ':' + password);
};
ApiClient.prototype.resetCredentials = function () {
    this.credentials.username = null;
    this.credentials.encoded = null;
};
ApiClient.prototype.isEmptyCredentials = function () {
    return this.credentials.username === null;
};
ApiClient.prototype.request = function (options) {
    if (this.isEmptyCredentials()) {
        this.handleUnauthorized(options);
        return;
    }
    var responseData, exOptions = $.extend({}, options.getProperties(), {
        url: this.endpoint + options.getUrl(),
        async: true,
        beforeSend: (function (jqXHR) {
            jqXHR.setRequestHeader('Authorization', 'Basic ' + this.credentials.encoded);

            if (options.autoModalLoadingControl) {
                this.loadingUi.showLoading(options.modalLoadingMessage);
            }
        }).bind(this),
        success: function (data) {
            responseData = data;
        },
        complete: (function () {
            if (options.autoModalLoadingControl) {
                this.loadingUi.hideLoading();
            }

            if (!this.handleUnauthorized(options) && !this.handleNotSuccessCode(options)) {
                options.requestSuccess(responseData);
            }

            if (typeof options.complete === 'function') {
                options.complete();
            }
        }).bind(this)
    });

    var xhr = $.ajax(exOptions);
    options.setXHR(xhr);
    return xhr;
};
ApiClient.prototype.handleUnauthorized = function (options) {
    if (this.authUi.canShow && (options.getXHR() === null ||
        options.getXHR().status === 401 || options.getXHR().status === 0)) {
        this.resetCredentials();

        this.authUi.push(options);
        this.authUi.show();
        return true;
    }
    return false;
};
ApiClient.prototype.handleNotSuccessCode = function (options) {
    if (options.successCode !== options.getXHR().status) {
        this.errorQueueUi.push(options);
        return true;
    }
    return false;
};
