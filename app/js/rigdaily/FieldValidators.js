var fieldValidators = {};

fieldValidators[trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new ValidationFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    }
};
fieldValidators[trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new ValidationFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    }
};

var typeValidators = {
    'number': function (value, cfFullName, tid, tblIdx) {
        if (isNaN(parseFloat(value))) {
            throw new ValidationFailedException('Incorrect number value', cfFullName, tid, tblIdx);
        }
    }
};
