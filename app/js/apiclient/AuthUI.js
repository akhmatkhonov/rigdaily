function ApiClientAuthUI(credentialsCallback, endpoint) {
    this.queue = [];
    this.credentialsCallback = credentialsCallback;
    this.firstRun = true;

    // TODO: move to other class for prevent duplicates
    $(window).resize((function () {
        $('.ui-dialog-content:visible').each(function () {
            var dialog = $(this).data('uiDialog');
            dialog.option('position', dialog.options.position);
        });
    }).bind(this));

    // Init auth dialog
    this.handle = $('#apiClientAuthDialog');
    this.handle.find('input[name="username"], input[name="password"]').keypress((function (event) {
        if (event.which === 13 || event.keyCode === 13) {
            this.handle.find('button.authorize').trigger('click');
        }
    }).bind(this));
    this.handle.dialog(ApiClientAuthUI.dlgOptsNoClosable).on('dialogclose', (function () {
        this.firstRun = false;
    }).bind(this));
    this.handle.find('span.endpoint').text(endpoint);

    this.handle.find('button.authorize').button().click((function () {
        var username = this.handle.find('input[name="username"]').val();
        var passwordField = this.handle.find('input[name="password"]');
        var password = passwordField.val();

        if (username === '' || password === '') {
            this.setErrorMessage('Fill all fields!');
            return;
        }

        this.hideErrorMessage();
        try {
            this.credentialsCallback(username, password);
        } catch (e) {
            this.hideErrorMessage(e.message);
            return;
        }

        passwordField.val('');
        this.handle.dialog('close');

        new ApiClientAuthRequestQueue().success().start();
    }).bind(this));
}
ApiClientAuthUI.prototype.setErrorMessage = function (message) {
    this.handle.find('span.error_text').html(message).closest('div.error').show();
    this.handle.dialog('option', 'position', {
        my: 'center',
        at: 'center',
        of: window
    });
};
ApiClientAuthUI.prototype.hideErrorMessage = function () {
    this.handle.find('div.error').hide();
};
ApiClientAuthUI.prototype.push = function (options) {
    this.queue.push(options);
};
ApiClientAuthUI.prototype.show = function () {
    if (!this.handle.dialog('isOpen')) {
        this.handle.dialog('open');
        if (this.firstRun) {
            this.hideErrorMessage();
        } else {
            var message = this.queue[0].getXHR().responseText.trim();
            this.setErrorMessage(message);
        }
    }
};
ApiClientAuthUI.dlgOptsNoClosable = {
    width: 'auto',
    height: 'auto',
    modal: true,
    autoOpen: false,
    resizable: false,
    draggable: false,
    closeOnEscape: false,
    open: function (event, ui) {
        $('.ui-dialog-titlebar-close', ui.dialog | ui).hide();
        $(event.target).dialog('option', 'position', {
            my: 'center',
            at: 'center',
            of: window
        });
    }
};
