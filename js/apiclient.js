'use strict';

var ApiClient = {
    endpoint: null,

    credentials: null,
    credentialsUn: null,
    createCredentials: function (username, password) {
        ApiClient.credentials = btoa(username + ':' + password);
        ApiClient.credentialsUn = username;
    },
    resetCredentials: function () {
        ApiClient.credentials = null;
        ApiClient.credentialsUn = null;
    },

    modalLoading: null,
    showModalLoading: function (message) {
        $('body').addClass('loading');

        if (typeof message !== 'undefined') {
            ApiClient.modalLoading.children('span').empty().append(message);
        } else {
            ApiClient.modalLoading.children('span').html('Please wait...');
        }
        ApiClient.recalcModalDiv();
    },
    hideModalLoading: function () {
        $('body').removeClass('loading');
    },
    recalcModalDiv: function () {
        ApiClient.modalLoading.children('span').css('top', (Math.round(ApiClient.modalLoading.height() / 2) + 30) + 'px');
    },
    setProgressMessage: function (message, percent) {
        var modalSpan = ApiClient.modalLoading.children('span');

        if (typeof message === 'undefined') {
            message = 'Progress: ' + percent + '%';
        }
        modalSpan.html(message);
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
    showRequestError: function (message, url) {
        ApiClient.errorDialog.find('span.error').empty().text(message).prepend('<strong>Request error: </strong>');

        var urlQueryStringPos = url.indexOf('?');
        ApiClient.errorDialog.find('span.url').empty().text(urlQueryStringPos !== -1 ? url.substring(0, urlQueryStringPos) : url);
        ApiClient.errorDialog.dialog('open');
        ApiClient.errorDialog.dialog('option', 'position', {
            my: 'center',
            at: 'center',
            of: window
        });
    },

    // Args: username
    authSuccessCallback: null,
    authLoggedIn: false,

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
        if (ApiClient.credentials === null) {
            ApiClient.authDialog.dialog('open');
            ApiClient.authDialog.data('replayOptions', options);
            return;
        }

        var isEvalCompleteCallback = true;
        var isHideModalLoading = typeof options['isHideModalLoading'] !== 'undefined' ? options['isHideModalLoading'] : true;
        var isShowModalLoading = typeof options['isShowModalLoading'] !== 'undefined' ? options['isShowModalLoading'] : true;
        if (isShowModalLoading) {
            ApiClient.showModalLoading(typeof options['modalLoadingMessage'] !== 'undefined' ? options['modalLoadingMessage'] : undefined);
        }

        var exOptions = $.extend({}, options, {
            url: ApiClient.endpoint + options['url'],
            beforeSend: function (jqXHR) {
                jqXHR.setRequestHeader('Authorization', 'Basic ' + ApiClient.credentials);
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
                        ApiClient.authSuccessCallback(ApiClient.credentialsUn);
                    }
                }

                if (typeof options['replayWithOptions'] !== 'undefined') {
                    isEvalCompleteCallback = false;
                    isHideModalLoading = false;
                    ApiClient.doRequest(options['replayWithOptions']);
                } else if (isHideModalLoading) {
                    ApiClient.hideModalLoading();
                }

                if (typeof options['success'] === 'function') {
                    options['success'](response, textStatus, jqXHR);
                }
            },
            error: function (jqXHR, ajaxOptions, thrownError) {
                if (isHideModalLoading) {
                    ApiClient.hideModalLoading();
                }

                if (jqXHR.status === 401) {
                    isEvalCompleteCallback = false;
                    isHideModalLoading = false;

                    ApiClient.showAuthError(jqXHR.responseText);
                    ApiClient.resetCredentials();
                    ApiClient.authLoggedIn = false;
                    ApiClient.doRequest(options);
                } else if (jqXHR.status === 0) {
                    isEvalCompleteCallback = false;

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

    init: function () {
        $(window).resize(function () {
            ApiClient.recalcModalDiv();
        });

        ApiClient.modalLoading = $('.apiClientModalLoading');

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
                ApiClient.createCredentials(username, password);
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
                url: '/api/v2/authorize',
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
