'use strict';

var ApiClient = {
    endpoint: null,

    credentials: {
        current: null,
        currentUn: null,
        create: function (username, password) {
            ApiClient.credentials.current = btoa(username + ':' + password);
            ApiClient.credentials.currentUn = username;
        },
        reset: function () {
            ApiClient.credentials.current = null;
            ApiClient.credentials.currentUn = null;
        }
    },

    modalLoading: {
        handle: null,
        show: function (message) {
            $('body').addClass('loading');
            if (typeof message === 'undefined') {
                message = 'Please wait...';
            }

            ApiClient.modalLoading.handle.children('span').empty().append(message);
            ApiClient.modalLoading.recalcPosition();
        },
        hide: function () {
            $('body').removeClass('loading');
        },
        recalcPosition: function () {
            ApiClient.modalLoading.handle.children('span').css('top', (Math.round(ApiClient.modalLoading.handle.height() / 2) + 30) + 'px');
        },
        setMessage: function (message) {
            ApiClient.modalLoading.handle.children('span').html(message);
        }
    },

    authDialog: null,
    showAuthError: function (message) {
        ApiClient.authDialog.find('span.error').html(message).closest('div.ui-widget').show();
        ApiClient.authDialog.dialog('option', 'position', {
            my: 'center',
            at: 'center',
            of: window
        });
    },
    hideAuthError: function () {
        ApiClient.authDialog.find('span.error').closest('div.ui-widget').hide();
    },

    errorDialog: null,
    canUserCancelOnError: false,
    showRequestError: function (message, url, code, requiredCode) {
        var table = this.errorDialog.find('table.error_requests tbody');
        if (table.children().length === 0) {
            ApiClient.errorDialog.dialog('open');
            ApiClient.errorDialog.dialog('option', 'position', {
                my: 'center',
                at: 'center',
                of: window
            });
        }

        var urlQueryStringPos = url.indexOf('?');
        var tr = $('<tr />');
        tr.append($('<td />').text(table.children().length + 1));
        tr.append($('<td />').text(urlQueryStringPos !== -1 ? url.substring(0, urlQueryStringPos) : url));
        tr.append($('<td />').text(code + (typeof requiredCode !== 'undefined' ? ' (required ' + requiredCode + ')' : '')));
        tr.append($('<td />').text(message));
        table.append(tr);
    },

    // Args: username
    authSuccessCallback: null,
    authLoggedIn: false,

    queueProcessing: false,
    concurrentLimit: 1,
    startRequestQueueWork: function (requestQueue, message, completeCallback) {
        // Process queue
        var requestTotalCount = requestQueue.length;
        var requestLeft = requestQueue.length;
        var currentRequest = -1;
        var callNextRequest = function () {
            if (requestLeft !== requestQueue.length) {
                var diff = requestQueue.length - requestLeft;
                requestLeft += diff;
                requestTotalCount += diff;
            }

            var reqOptions = requestQueue.shift();
            requestLeft--;
            
            if (typeof reqOptions === 'undefined') {
                if (typeof completeCallback === 'function') {
                    completeCallback();
                }
                return;
            }

            var newOptions = {};
            if (typeof reqOptions['url'] === 'function') {
                newOptions['url'] = reqOptions['url']();
            }
            newOptions['success'] = function (response, textStatus, jqXHR) {
                if (typeof reqOptions['success'] === 'function') {
                    reqOptions['success'](response, textStatus, jqXHR);
                }
                callNextRequest();
            };
            newOptions['modalLoadingMessage'] = message + ' ' + parseInt(100 * ++currentRequest / requestTotalCount) + '%';

            ApiClient.doRequest($.extend({}, reqOptions, newOptions));
        };
        callNextRequest();
    },

    /*
     * options args: [
     * url,
     * method,
     * success,
     * successCode,
     * complete,
     * isShowModalLoading,
     * isHideModalLoading,
     * modalLoadingMessage
     * ]
     */
    doRequest: function (options) {
        if (this.credentials.current === null) {
            this.authDialog.dialog('open');
            this.authDialog.data('replayOptions', options);
            return;
        }

        var isEvalCompleteCallback = true;
        var isHideModalLoading = typeof options['isHideModalLoading'] !== 'undefined' ? options['isHideModalLoading'] : true;
        var isShowModalLoading = typeof options['isShowModalLoading'] !== 'undefined' ? options['isShowModalLoading'] : true;
        if (isShowModalLoading) {
            this.modalLoading.show(typeof options['modalLoadingMessage'] !== 'undefined' ? options['modalLoadingMessage'] : undefined);
        }

        var exOptions = $.extend({}, options, {
            url: this.endpoint + options['url'],
            beforeSend: function (jqXHR) {
                jqXHR.setRequestHeader('Authorization', 'Basic ' + ApiClient.credentials.current);
            },
            complete: function (jqXHR, textStatus) {
                if (ApiClient.authLoggedIn && typeof options['successCode'] !== 'undefined' && jqXHR.status !== options['successCode']) {
                    var msg = 'Resolved ' + jqXHR.status + ' status code, required ' + options['successCode'];
                    if (typeof options['error'] === 'function') {
                        options['error'](jqXHR, null, msg);
                    }

                    ApiClient.showRequestError(msg, options['url']);
                    ApiClient.errorDialog.data('replayOptions', options);
                    return;
                }

                if (isEvalCompleteCallback && typeof options['complete'] === 'function') {
                    options['complete'](jqXHR, textStatus);
                }
            },
            success: function (response, textStatus, jqXHR) {
                if (options['url'] === '/api/v2/authorize') {
                    ApiClient.authLoggedIn = true;

                    if (typeof ApiClient.authSuccessCallback === 'function') {
                        ApiClient.authSuccessCallback(ApiClient.credentials.currentUn);
                    }
                }

                if (typeof options['replayWithOptions'] !== 'undefined') {
                    isEvalCompleteCallback = false;
                    isHideModalLoading = false;
                    if (typeof options['replayWithOptions']['beforeReSend'] === 'function') {
                        options['replayWithOptions']['beforeReSend']();
                    }
                    ApiClient.doRequest(options['replayWithOptions']);
                } else if (isHideModalLoading) {
                    ApiClient.modalLoading.hide();
                }

                if (typeof options['success'] === 'function') {
                    options['success'](response, textStatus, jqXHR);
                }
            },
            error: function (jqXHR, ajaxOptions, thrownError) {
                if (isHideModalLoading) {
                    ApiClient.modalLoading.hide();
                }

                if (jqXHR.status === 401) {
                    isHideModalLoading = false;

                    ApiClient.showAuthError(jqXHR.responseText);
                    ApiClient.credentials.reset();
                    ApiClient.authLoggedIn = false;
                    ApiClient.doRequest(options);
                } else if (jqXHR.status === 0) {
                    var msg = '(' + jqXHR.status + ') ' + (thrownError !== '' ? thrownError : 'Unknown error, maybe system not allow Origin from this page');
                    if (ApiClient.authLoggedIn) {
                        ApiClient.showRequestError(msg, options['url']);
                        ApiClient.errorDialog.data('replayOptions', options);
                    } else {
                        ApiClient.showAuthError('<strong>Request error </strong> ' + msg);
                        ApiClient.authDialog.dialog('open');
                        ApiClient.authDialog.data('replayOptions', options);
                    }
                } else if (typeof options['error'] === 'function') {
                    options['error'](jqXHR, ajaxOptions, thrownError);
                }
            }
        });
        $.ajax(exOptions);
    },

    authEndpoint: '/api/v2/authorize',
    init: function () {
        $(window).resize(function () {
            ApiClient.modalLoading.recalcPosition();

            $('.ui-dialog-content:visible').each(function () {
                var dialog = $(this).data('uiDialog');
                dialog.option('position', dialog.options.position);
            });
        });
        ApiClient.modalLoading.handle = $('.apiClientModalLoading');

        var dlgOptsNoClosable = {
            width: 'auto',
            height: 'auto',
            modal: true,
            autoOpen: false,
            resizable: false,
            draggable: false,
            closeOnEscape: false,
            open: function (event, ui) {
                $(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
                $(event.target).dialog('option', 'position', {
                    my: 'center',
                    at: 'center',
                    of: window
                });
            }
        };

        ApiClient.authDialog = $('#apiClientAuthDialog');
        ApiClient.authDialog.find('input[name="username"], input[name="password"]').keypress(function (event) {
            if (event.which === 13 || event.keyCode === 13) {
                ApiClient.authDialog.find('button.authorize').trigger('click');
            }
        });
        ApiClient.authDialog.dialog(dlgOptsNoClosable);
        ApiClient.authDialog.find('span.endpoint').text(ApiClient.endpoint);
        ApiClient.authDialog.find('button.authorize').button().click(function () {
            var username = ApiClient.authDialog.find('input[name="username"]').val();
            var password = ApiClient.authDialog.find('input[name="password"]').val();

            if (username === '' || password === '') {
                ApiClient.showAuthError('Fill all fields!');
                return;
            }

            ApiClient.hideAuthError();
            try {
                ApiClient.credentials.create(username, password);
            } catch (e) {
                ApiClient.showAuthError(e.message);
                return;
            }

            ApiClient.authDialog.find('input:password').val('');
            ApiClient.authDialog.dialog('close');

            var replayOptions = ApiClient.authDialog.data('replayOptions');
            if (typeof replayOptions['replayWithOptions'] !== 'undefined') {
                replayOptions = replayOptions['replayWithOptions'];
            }

            ApiClient.doRequest({
                modalLoadingMessage: 'Authorizing...',
                url: ApiClient.authEndpoint,
                success: function () {
                    if (typeof(ApiClient.authSuccessCallback) === 'function') {
                        ApiClient.authSuccessCallback(username);
                    }
                },
                replayWithOptions: replayOptions
            })
        });

        ApiClient.errorDialog = $('#apiClientErrorDialog');
        ApiClient.errorDialog.dialog(dlgOptsNoClosable);
        ApiClient.errorDialog.find('button.retry').button().click(function () {
            ApiClient.errorDialog.dialog('close');
            ApiClient.doRequest(ApiClient.errorDialog.data('replayOptions'));
        });
    }
};
