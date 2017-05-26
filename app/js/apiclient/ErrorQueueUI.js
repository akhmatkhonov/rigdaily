function ApiClientErrorQueueUI() {
    this.queue = [];

    // Init error dialog
    this.handle = $('#apiClientErrorDialog');
    this.handle.dialog(ApiClientAuthUI.dlgOptsNoClosable);
    this.handle.find('button.retry').button().click((function () {
        this.handle.dialog('close');
        this.tbodyHandle.children().each(function (idx, tr) {
            // TODO: replay all
            //$(tr).data('requestOptions')
        });
        this.tbodyHandle.empty();
    }).bind(this));
    this.tbodyHandle = this.handle.find('table.error_requests tbody');
    this.progressHandle = this.handle.find('span.progress');
}
ApiClientErrorQueueUI.prototype.push = function (options) {
    this.queue.push(options);

    var fullUrl = options.getUrl();
    var shortUrlPos = fullUrl.indexOf('?');
    var shortUrl = shortUrlPos !== -1 ? fullUrl.substring(0, shortUrlPos) : fullUrl;

    var tr = $('<tr />');
    tr.data('requestOptions', options);
    tr.append($('<td />').text(this.tbodyHandle.children().length + 1));
    var span = $('<span></span>').text(shortUrl);
    span.tooltip({
        items: 'span',
        content: 'Full URL: ' + fullUrl
    });
    tr.append($('<td />').append(span));
    tr.append($('<td />').text(options.getXHR().status));

    var message = 'Resolved ' + options.getXHR().status + ' code, required ' + options.successCode;
    var messageSpan = $('<span></span>').text(message);
    messageSpan.tooltip({
        items: 'span',
        content: options.getXHR().responseText
    });
    tr.append($('<td />').text(messageSpan));
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
