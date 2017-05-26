function ApiClient(endpoint) {
    this.loadingUi = new ApiClientLoadingUI();
    this.authUi = new ApiClientAuthUI(this.setCredentials, endpoint);
    this.errorQueueUi = new ApiClientErrorQueueUI();
    this.credentials = {
        username: null,
        encoded: null
    };
    this.userSettings = null;
    this.endpoint = endpoint;
}
ApiClient.prototype.setUserSettings = function (userSettings) {
    this.userSettings = userSettings;
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
    var exOptions = $.extend({}, options.getProperties(), {
        url: this.endpoint + options.getUrl(),
        beforeSend: (function (jqXHR) {
            jqXHR.setRequestHeader('Authorization', 'Basic ' + this.credentials.encoded);

            if (options.autoModalLoadingControl) {
                this.loadingUi.showLoading(options.modalLoadingMessage);
            }
        }).bind(this),
        complete: (function (jqXHR) {
            if (options.autoModalLoadingControl) {
                this.loadingUi.hideLoading();
            }
            if (!this.handleUnauthorized(jqXHR, options) && !this.handleNotSuccessCode(jqXHR, options)) {
                options.requestSuccess();
            }
        }).bind(this)
    });
    options.setXHR($.ajax(exOptions));
};
ApiClient.prototype.handleUnauthorized = function (jqXHR, options) {
    if (jqXHR.status === 401) {
        this.resetCredentials();

        this.authUi.push(jqXHR, options);
        this.authUi.show();
        return true;
    }
    return false;
};
ApiClient.prototype.handleNotSuccessCode = function (jqXHR, options) {
    if (options.successCode !== jqXHR.status) {
        this.errorQueueUi.push(jqXHR, options);
        return true;
    }
    return false;
};
