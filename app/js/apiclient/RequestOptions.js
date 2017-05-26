function ApiClientRequestOptions(initial) {
    this.propNames = [];
    this.initProperty('autoModalLoadingControl', initial.autoModalLoadingControl || true);
    this.initProperty('modalLoadingMessage', initial.modalLoadingMessage);
    this.initProperty('successCode', initial.successCode || 200);
    this.initProperty('success', initial.success || null);
    this.initProperty('url', initial.url || null);

    this.urlCallback = initial.urlCallback || null;
    this.xhr = null;
}
ApiClientRequestOptions.prototype.initProperty = function (name, value) {
    this.propNames.push(name);
    this[name] = value;
};
ApiClientRequestOptions.prototype.getUrl = function () {
    if (typeof this.urlCallback === 'function') {
        this.url = this.urlCallback();
    }
    return this.url;
};
ApiClientRequestOptions.prototype.requestSuccess = function () {
    if (typeof this.success === 'function') {
        this.success();
    }
};
ApiClientRequestOptions.prototype.getProperties = function () {
    var obj = {};
    for (var key in this.propNames) {
        var name = this.propNames[key];
        obj[name] = this[name];
    }
    return obj;
};
ApiClientRequestOptions.prototype.setXHR = function (xhr) {
    this.xhr = xhr;
};
ApiClientRequestOptions.prototype.getXHR = function () {
    return this.xhr;
};
