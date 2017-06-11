function ApiClientAuthRequestQueue(client) {
    ApiClientRequestQueue.call(this, client, 'Authorizing...', 1, false, 1);

    this.push(new ApiClientQueueRequestOptions({
        url: '/api/v3/user_settings',
        success: (function (data) {
            this.client.userSettings = data;
            this.client.authUi.canShow = false;
            if (typeof this.client.authSuccessCallback === 'function') {
                this.client.authSuccessCallback(this.client.credentials.username);
            }
        }).bind(this)
    }));
}
ApiClientAuthRequestQueue.prototype = Object.create(ApiClientRequestQueue.prototype);

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

function ApiClient(endpoint) {
    this.loadingUi = new ApiClientLoadingUI();
    this.authUi = new ApiClientAuthUI(this, (function (username, password) {
        this.setCredentials(username, password);
    }).bind(this), endpoint);
    this.errorQueueUi = new ApiClientErrorQueueUI(this);
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
ApiClient.prototype.isEmptyCredentials = function () {
    return this.credentials.username === null;
};
ApiClient.prototype.request = function (options) {
    if (this.isEmptyCredentials()) {
        this.handleUnauthorized(options);
        return;
    }
    var responseData, exOptions = $.extend({}, options.getProperties(), {
        url: this.endpoint + options.getUrl(),
        async: true,
        beforeSend: (function (jqXHR) {
            jqXHR.setRequestHeader('Authorization', 'Basic ' + this.credentials.encoded);

            if (options.autoModalLoadingControl) {
                this.loadingUi.showLoading(options.modalLoadingMessage);
            }
        }).bind(this),
        success: function (data) {
            responseData = data;
        },
        complete: (function () {
            if (options.autoModalLoadingControl) {
                this.loadingUi.hideLoading();
            }

            if (!this.handleUnauthorized(options) && !this.handleNotSuccessCode(options)) {
                options.requestSuccess(responseData);
            }

            if (typeof options.complete === 'function') {
                options.complete();
            }
        }).bind(this)
    });

    var xhr = $.ajax(exOptions);
    options.setXHR(xhr);
    return xhr;
};
ApiClient.prototype.handleUnauthorized = function (options) {
    if (this.authUi.canShow && (options.getXHR() === null ||
        options.getXHR().status === 401 || options.getXHR().status === 0)) {
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

function ApiClientLoadingUI() {
    $(window).resize((function () {
        this.recalcPosition();
    }).bind(this));
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
ApiClientLoadingUI.prototype.isShown = function () {
    return $('body').hasClass('loading');
};

function ApiClientQueueRequestOptions(initial) {
    var newOptions = {
        autoModalLoadingControl: false,
        modalLoadingMessage: undefined
    };
    ApiClientRequestOptions.call(this, $.extend({}, initial, newOptions));
}
ApiClientQueueRequestOptions.prototype = Object.create(ApiClientRequestOptions.prototype);

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

function ApiClientRequestQueue(client, message, totalRequests, showPercentComplete, concurrentLimit, allowCancel) {
    this.client = client;
    this.message = message;
    this.totalRequests = totalRequests;
    this.showPercentComplete = showPercentComplete;
    this.queue = [];
    this.inProgressRequests = 0;
    this.erroredRequests = 0;
    this.completeRequests = 0;
    this.successCallback = null;
    this.concurrentLimit = concurrentLimit;
    this.allowCancel = allowCancel || false;
    this.cancelled = false;
    this.cancelCallback = null;
    this.xhr = null;
}
ApiClientRequestQueue.prototype.cancel = function (callback) {
    if (this.allowCancel) {
        this.cancelled = true;
        this.cancelCallback = callback;
        this.client.loadingUi.hideLoading();

        if (this.inProgressRequests === 0 && typeof this.cancelCallback === 'function') {
            this.cancelCallback.call(this);
            this.cancelCallback = null;
        }
    }
};
ApiClientRequestQueue.prototype.success = function (successCallback) {
    this.successCallback = successCallback;
    return this;
};
ApiClientRequestQueue.prototype.push = function (options) {
    options.queue = this;
    this.queue.push(options);
    return this;
};
ApiClientRequestQueue.prototype.isEmpty = function () {
    return this.queue.length === 0;
};
ApiClientRequestQueue.prototype.start = function () {
    this.inProgressRequests = 0;
    this.erroredRequests = 0;
    this.completeRequests = 0;
    this.cancelled = false;
    this.processNext();
};
ApiClientRequestQueue.prototype.processNext = function () {
    if (this.cancelled) {
        if (this.inProgressRequests === 0 && typeof this.cancelCallback === 'function') {
            this.cancelCallback.call(this);
            this.cancelCallback = null;
        }
        return;
    }

    // Can be called from ErrorQueueUI or AuthUI
    if (this.inProgressRequests >= this.concurrentLimit) {
        return;
    }

    var options = this.queue.shift();
    if (typeof options === 'undefined') {
        if (this.inProgressRequests === 0 && this.erroredRequests === 0) {
            this.client.loadingUi.hideLoading();
            if (typeof this.successCallback === 'function') {
                try {
                    this.successCallback.call(this);
                } catch (e) {
                    console.error(e.message);
                }
            }
        }
        return;
    }

    this.inProgressRequests++;

    if (!this.client.errorQueueUi.isOpen() && !this.client.loadingUi.isShown()) {
        this.client.loadingUi.showLoading(this.message);
    }

    options.complete = (function () {
        if (this.erroredRequests !== 0) {
            this.client.loadingUi.hideLoading();
        }

        this.inProgressRequests--;
        this.processNext();
    }).bind(this);
    if (!options.queueSuccessCallbackSet) {
        options.queueSuccessCallbackSet = true;
        var successCallback = options.success;
        options.success = (function (data) {
            this.completeRequests++;
            if (this.showPercentComplete && this.client.loadingUi.isShown()) {
                var percent = parseInt(this.completeRequests / this.totalRequests * 100);
                if (percent > 100) {
                    percent = 100;
                }
                this.client.loadingUi.showLoading(this.message + ' ' + percent + '%');
            }
            console.log('Queued request success (' + this.completeRequests + ' of ' + this.totalRequests + ' assumed)');
            if (typeof successCallback === 'function') {
                successCallback.call(this, data);
            }
        }).bind(this);
    }

    this.client.request(options);

    if (this.inProgressRequests < this.concurrentLimit) {
        this.processNext();
    }
};

//# sourceMappingURL=../maps/js/apiclient.js.map
