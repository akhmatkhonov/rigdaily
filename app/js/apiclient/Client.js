function ApiClient(endpoint) {
    this.loadingUi = new ApiClientLoadingUI();
    this.authUi = new ApiClientAuthUI(this, this.setCredentials, endpoint);
    this.errorQueueUi = new ApiClientErrorQueueUI();
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
ApiClient.prototype.request = function (options) {
    if (this.credentials.username === null) {
        this.handleUnauthorized(options);
        return;
    }
    var exOptions = $.extend({}, options.getProperties(), {
        url: this.endpoint + options.getUrl(),
        beforeSend: (function (jqXHR) {
            jqXHR.setRequestHeader('Authorization', 'Basic ' + this.credentials.encoded);

            if (options.autoModalLoadingControl) {
                this.loadingUi.showLoading(options.modalLoadingMessage);
            }
        }).bind(this),
        complete: (function () {
            if (options.autoModalLoadingControl) {
                this.loadingUi.hideLoading();
            }
            if (!this.handleUnauthorized(options) && !this.handleNotSuccessCode(options)) {
                options.requestSuccess();
            }
        }).bind(this)
    });
    options.setXHR($.ajax(exOptions));
};
ApiClient.prototype.handleUnauthorized = function (options) {
    if (options.getXHR() === null || options.getXHR().status === 401) {
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
