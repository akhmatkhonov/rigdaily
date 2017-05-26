function ApiClientErrorQueueUI(client) {
    // Init error dialog
    this.handle = $('#apiClientErrorDialog');
    this.handle.dialog(ApiClientAuthUI.dlgOptsNoClosable);
    this.handle.find('button.retry').button().click((function () {
        this.handle.dialog('close');
        this.tbodyHandle.children().each(function (idx, tr) {
            var options = $(tr).data('requestOptions');
            if (options.queue !== null) {
                options.queue.push(options);
                options.queue.erroredRequests--;
                options.queue.processNext();
            } else {
                client.request(options);
            }
        });
        this.tbodyHandle.children().remove();
    }).bind(this));
    this.tbodyHandle = this.handle.find('table.error_requests tbody');
}
ApiClientErrorQueueUI.prototype.push = function (options) {
    if (options.queue !== null) {
        options.queue.erroredRequests++;
    }

    var fullUrl = options.getUrl();
    var shortUrlPos = fullUrl.indexOf('?');
    var shortUrl = shortUrlPos !== -1 ? fullUrl.substring(0, shortUrlPos) : fullUrl;

    var tr = $('<tr />');
    tr.data('requestOptions', options);
    tr.append($('<td />').text(this.tbodyHandle.children().length + 1));
    var span = $('<span></span>').text(shortUrl);
    span.tooltip({
        items: 'span',
        content: 'Full URL: ' + fullUrl,
        tooltipClass: 'errorTooltip'
    });
    tr.append($('<td />').append(span));
    tr.append($('<td />').text(options.getXHR().status));

    var xhrMessage = typeof options.getXHR().responseText !== 'undefined' ? options.getXHR().responseText : 'No content';
    var message = 'Resolved ' + options.getXHR().status + ' code, required ' + options.successCode;
    var messageSpan = $('<span></span>').text(message);
    messageSpan.tooltip({
        items: 'span',
        content: xhrMessage,
        tooltipClass: 'errorTooltip'
    });
    tr.append($('<td />').append(messageSpan));
    this.tbodyHandle.append(tr);

    if (!this.handle.dialog('isOpen')) {
        this.handle.dialog('open');
    }

    // Centering
    this.handle.dialog('option', 'position', {
        my: 'center',
        at: 'center',
        of: window
    });
};
ApiClientErrorQueueUI.prototype.isOpen = function () {
    return this.handle.dialog('isOpen');
};
