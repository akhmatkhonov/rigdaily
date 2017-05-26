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
