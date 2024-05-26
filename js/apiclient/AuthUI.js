function ApiClientAuthUI(client, credentialsCallback, endpoint) {
    this.queue = [];
    this.credentialsCallback = credentialsCallback;
    this.client = client;
    this.canShow = true;

    // Init auth dialog
    this.handle = $('#apiClientAuthDialog');
    this.handle.find('input[name="username"], input[name="password"]').keypress((function (event) {
        if (event.which === 13 || event.keyCode === 13) {
            this.handle.find('button.authorize').trigger('click');
        }
    }).bind(this));
    this.handle.dialog(ApiClientAuthUI.dlgOptsNoClosable);
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
            this.setErrorMessage(e.message);
            return;
        }

        passwordField.val('');
        this.handle.dialog('close');

        new ApiClientAuthRequestQueue(client).success((function () {
            if (client.isEmptyCredentials()) {
                this.queue = [];
                return;
            }

            while (this.queue.length !== 0) {
                var options = this.queue.shift();
                if (options.queue !== null) {
                    if (options.queue instanceof ApiClientAuthRequestQueue) {
                        continue;
                    }

                    options.queue.push(options);
                    options.queue.erroredRequests--;
                    options.queue.processNext();
                } else {
                    client.request(options);
                }
            }
        }).bind(this)).start();
    }).bind(this));
}
ApiClientAuthUI.prototype.setErrorMessage = function (message) {
    this.handle.find('span.error_text').html(message.trim()).closest('div.error').show();
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
    if (options.queue !== null) {
        options.queue.erroredRequests++;
    }

    this.queue.push(options);
};
ApiClientAuthUI.prototype.show = function () {
    if (!this.handle.dialog('isOpen')) {
        this.handle.dialog('open');
        var xhr = this.queue.slice(-1)[0].getXHR();
        if (xhr !== null) {
            var message = xhr.responseText;
            if (typeof message === 'undefined') {
                message = 'Unknown error (code ' + xhr.status + ')';
            }
            this.setErrorMessage(message);
        } else {
            this.hideErrorMessage();
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
