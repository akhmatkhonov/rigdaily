function ApiClientQueueRequestOptions(initial) {
    var newOptions = {
        autoModalLoadingControl: false,
        modalLoadingMessage: undefined
    };
    ApiClientRequestOptions.call(this, $.extend({}, initial, newOptions));
}
ApiClientQueueRequestOptions.prototype = Object.create(ApiClientRequestOptions.prototype);
