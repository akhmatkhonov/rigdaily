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
