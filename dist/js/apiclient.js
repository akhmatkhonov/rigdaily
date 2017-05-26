function ApiClientAuthRequestQueue(client) {
    ApiClientRequestQueue.apply(this, [client, 'Authorizing...', 1, false, 1]);

    this.push(new ApiClientQueueRequestOptions({
        url: '/v3/user_settings',
        queue: this
    })).success((function (data) {
        this.client.userSettings = data;
        if (typeof this.client.authSuccessCallback === 'function') {
            this.client.authSuccessCallback(this.client.credentials.username);
        }
    }).bind(this));
}
ApiClientAuthRequestQueue.prototype = Object.create(ApiClientRequestQueue.prototype);

function ApiClientAuthUI(client, credentialsCallback, endpoint) {
    this.queue = [];
    this.credentialsCallback = credentialsCallback;
    this.firstRun = true;

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
            this.credentialsCallback.apply(client, [username, password]);
        } catch (e) {
            this.setErrorMessage(e.message);
            return;
        }

        passwordField.val('');
        this.handle.dialog('close');

        // TODO
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
            if (this.queue[0].getXHR() !== null) {
                var message = this.queue[0].getXHR().responseText.trim();
                this.setErrorMessage(message);
            } else {
                this.hideErrorMessage();
            }
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

function ApiClient(endpoint) {
    this.loadingUi = new ApiClientLoadingUI();
    this.authUi = new ApiClientAuthUI(this, this.setCredentials, endpoint);
    this.errorQueueUi = new ApiClientErrorQueueUI();
    this.credentials = {
        username: null,
        encoded: null
    };
    this.userSettings = null;
    this.authSuccessCallback = null;
    this.endpoint = endpoint;
}
ApiClient.prototype.authSuccess = function (authSuccessCallback) {
    this.authSuccessCallback = authSuccessCallback;
    return this;
};
ApiClient.prototype.setCredentials = function (username, password) {
    this.credentials.username = username;
    this.credentials.encoded = btoa(username + ':' + password);
};
ApiClient.prototype.resetCredentials = function () {
    this.credentials.username = null;
    this.credentials.encoded = null;
};
ApiClient.prototype.request = function (options) {
    if (this.credentials.username === null) {
        this.handleUnauthorized(options);
        return;
    }
    var exOptions = $.extend({}, options.getProperties(), {
        url: this.endpoint + options.getUrl(),
        beforeSend: (function (jqXHR) {
            jqXHR.setRequestHeader('Authorization', 'Basic ' + this.credentials.encoded);

            if (options.autoModalLoadingControl) {
                this.loadingUi.showLoading(options.modalLoadingMessage);
            }
        }).bind(this),
        complete: (function () {
            if (options.autoModalLoadingControl) {
                this.loadingUi.hideLoading();
            }
            if (!this.handleUnauthorized(options) && !this.handleNotSuccessCode(options)) {
                options.requestSuccess();
            }
        }).bind(this)
    });
    options.setXHR($.ajax(exOptions));
};
ApiClient.prototype.handleUnauthorized = function (options) {
    if (options.getXHR() === null || options.getXHR().status === 401) {
        this.resetCredentials();

        this.authUi.push(options);
        this.authUi.show();
        return true;
    }
    return false;
};
ApiClient.prototype.handleNotSuccessCode = function (options) {
    if (options.successCode !== options.getXHR().status) {
        this.errorQueueUi.push(options);
        return true;
    }
    return false;
};

function ApiDateUtils() {
    this.monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
}

ApiDateUtils.prototype.remoteDateToObj = function (remoteDateStr) {
    if (remoteDateStr === null || remoteDateStr.length === 0) {
        return null;
    }
    var parts = remoteDateStr.split('-');
    return new Date(parts[0], parts[1] - 1, parts[2]);
};
ApiDateUtils.prototype.remoteDateFormat = function (remoteDateStr) {
    var dateObj = this.remoteDateToObj(remoteDateStr);
    return this.formatDate(dateObj);
};
ApiDateUtils.prototype.localDateToObj = function (localDateStr) {
    if (localDateStr === null || localDateStr.length === 0) {
        return null;
    }
    var parts = localDateStr.split('/');
    return new Date(parts[2], parts[0] - 1, parts[1]);
};
ApiDateUtils.prototype.formatDate = function (dateObj) {
    return dateObj !== null ? $.datepicker.formatDate('mm/dd/yy', dateObj) : '';
};
ApiDateUtils.prototype.objToRemoteDate = function (dateObj) {
    if (dateObj === null) {
        return null;
    }
    return $.datepicker.formatDate('yy-mm-dd', dateObj);
};
ApiDateUtils.prototype.objGetMonthName = function (dateObj) {
    return this.monthNames[dateObj.getMonth()];
};

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

function ApiClientLoadingUI() {
    $(window).resize(this.recalcPosition);
    this.handle = $('.apiClientModalLoading');
}
ApiClientLoadingUI.prototype.hideLoading = function () {
    $('body').removeClass('loading');
};
ApiClientLoadingUI.prototype.showLoading = function (message) {
    $('body').addClass('loading');
    if (typeof message === 'undefined') {
        message = 'Please wait...';
    }

    this.handle.children('span').empty().append(message);
    this.recalcPosition();
};
ApiClientLoadingUI.prototype.recalcPosition = function () {
    this.handle.children('span').css('top', (Math.round(this.handle.height() / 2) + 30) + 'px');
};
ApiClientLoadingUI.prototype.setMessage = function (message) {
    this.handle.children('span').html(message);
};

function ApiClientQueueRequestOptions(initial) {
    var newOptions = {
        autoModalLoadingControl: false,
        modalLoadingMessage: undefined
    };
    ApiClientRequestOptions.apply(this, [$.extend({}, initial, newOptions)]);
}
ApiClientQueueRequestOptions.prototype = Object.create(ApiClientRequestOptions.prototype);

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

function ApiClientRequestQueue(client, message, totalRequests, showPercentComplete, concurrentLimit) {
    this.client = client;
    this.message = message;
    this.totalRequests = totalRequests;
    this.showPercentComplete = showPercentComplete;
    this.queue = [];
    this.inProgress = false;
    this.successCallback = null;
    this.concurrentLimit = concurrentLimit;
    this.xhr = null;
}
ApiClientRequestQueue.prototype.success = function (successCallback) {
    this.successCallback = successCallback;
    return this;
};
ApiClientRequestQueue.prototype.push = function (options) {
    this.queue.push(options);
    return this;
};
ApiClientRequestQueue.prototype.start = function () {
    // TODO: start processing queue
};

//# sourceMappingURL=../maps/js/apiclient.js.map
