function ApiClientErrorQueueUI(client) {
    // Init error dialog
    this.handle = $('#apiClientErrorDialog');
    this.handle.dialog(ApiClientAuthUI.dlgOptsNoClosable);
    this.cancelWaitingDiv = this.handle.find('div.cancelWaiting');
    this.retryButton = this.handle.find('button.retry').button().click((function () {
        this.cancelButton.button('option', 'disabled', true);
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
    this.cancelButton = this.handle.find('button.cancel').button().click((function () {
        this.cancelling = true;
        this.cancelWaitingDiv.show();
        this.retryButton.button('option', 'disabled', true);
        this.cancelButton.button('option', 'disabled', true);

        // Cancel all queues and subscribe to cancel
        var subscribedQueueRefs = [];
        this.tbodyHandle.children().each((function (idx, tr) {
            var options = $(tr).data('requestOptions');
            if (typeof options === 'object' && options.queue !== null &&
                $.inArray(options.queue, subscribedQueueRefs) === -1) {
                subscribedQueueRefs.push(options.queue);
                options.queue.cancel((function () {
                    subscribedQueueRefs.splice(0, 1);
                    if (subscribedQueueRefs.length === 0) {
                        this.cancelling = false;

                        this.tbodyHandle.children().remove();
                        this.cancelWaitingDiv.hide();
                        this.retryButton.button('option', 'disabled', false);
                        this.cancelButton.button('option', 'disabled', true);
                        this.handle.dialog('close');
                    }
                }).bind(this));
            }
        }).bind(this));

        if (subscribedQueueRefs.length === 0) {
            this.cancelling = false;

            this.tbodyHandle.children().remove();
            this.cancelWaitingDiv.hide();
            this.retryButton.button('option', 'disabled', false);
            this.cancelButton.button('option', 'disabled', true);
            this.handle.dialog('close');
        }
    }).bind(this));
    this.cancelling = false;
    this.tbodyHandle = this.handle.find('table.error_requests tbody');
}
ApiClientErrorQueueUI.prototype.push = function (options) {
    if (this.cancelling) {
        return;
    }

    if (options.queue !== null) {
        options.queue.erroredRequests++;

        if (options.queue.allowCancel) {
            // Enable cancel button if queue is cancellable
            this.cancelButton.button('option', 'disabled', false);
        }
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
