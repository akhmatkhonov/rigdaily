function ApiClientRequestOptions(initial) {
    this.propNames = [];
    this.initProperty('autoModalLoadingControl', initial.autoModalLoadingControl, true);
    this.initProperty('modalLoadingMessage', initial.modalLoadingMessage);
    this.initProperty('successCode', initial.successCode, 200);
    this.initProperty('success', initial.success, null);
    this.initProperty('url', initial.url, null);
    this.initProperty('queue', initial.queue, null);
    this.initProperty('data', initial.data, undefined);
    this.initProperty('type', initial.type, 'GET');
    this.initProperty('complete', initial.complete, undefined);
    this.initProperty('contentType', initial.contentType, undefined);
    this.initProperty('dataType', initial.dataType, undefined);
    this.initProperty('processData', initial.processData, undefined);
    this.initProperty('queueSuccessCallbackSet', undefined, false);

    this.xhr = null;
}
ApiClientRequestOptions.prototype.initProperty = function (name, value, defaultValue) {
    this.propNames.push(name);
    this[name] = typeof value !== 'undefined' ? value : defaultValue;
};
ApiClientRequestOptions.prototype.getUrl = function () {
    if (typeof this.url === 'function') {
        this.url = this.url();
    }
    return this.url;
};
ApiClientRequestOptions.prototype.requestSuccess = function (data) {
    if (typeof this.success === 'function') {
        this.success(data);
    }
};
ApiClientRequestOptions.prototype.getProperties = function () {
    this.getUrl();
    var obj = {};
    for (var key in this.propNames) {
        var name = this.propNames[key];
        if (typeof this[name] !== 'undefined') {
            obj[name] = this[name];
        }
    }
    return obj;
};
ApiClientRequestOptions.prototype.setXHR = function (xhr) {
    this.xhr = xhr;
};
ApiClientRequestOptions.prototype.getXHR = function () {
    return this.xhr;
};
