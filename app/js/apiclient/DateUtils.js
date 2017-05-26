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
