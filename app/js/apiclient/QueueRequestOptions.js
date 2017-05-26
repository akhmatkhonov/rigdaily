function ApiClientQueueRequestOptions(initial) {
    var newOptions = {
        autoModalLoadingControl: false,
        modalLoadingMessage: undefined
    };
    ApiClientRequestOptions.apply(this, [$.extend({}, initial, newOptions)]);
}
ApiClientQueueRequestOptions.prototype = Object.create(ApiClientRequestOptions.prototype);
