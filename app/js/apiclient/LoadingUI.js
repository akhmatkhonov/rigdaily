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
