function ApiClientErrorQueueUI() {
    this.queue = [];

    // TODO: move to other class for prevent duplicates
    $(window).resize(function () {
        $('.ui-dialog-content:visible').each(function () {
            var dialog = $(this).data('uiDialog');
            dialog.option('position', dialog.options.position);
        });
    });

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
ApiClientErrorQueueUI.prototype.push = function (jqXHR, options) {
    this.queue.push(options);
    // TODO: show dialog and append to table (status code and text give from jqXHR)

    if (!this.handle.dialog('isOpen')) {
        this.handle.dialog('open');
    }
};
ApiClientErrorQueueUI.prototype.isOpen = function () {
    return this.handle.dialog('isOpen');
};
