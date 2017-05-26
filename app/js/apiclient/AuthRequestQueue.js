function ApiClientAuthRequestQueue(client) {
    ApiClientRequestQueue.apply(this, [client, 'Authorizing...', 2, false]);

    this.push(new ApiClientQueueRequestOptions({
        url: '/v3/user_settings',
        queue: this
    })).success((function (data) {
        client.setUserSettings(data);
    }).bind(this));
}
ApiClientAuthRequestQueue.prototype = Object.create(ApiClientRequestQueue.prototype);
