var fieldValidators = {};

fieldValidators[trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new FieldValidateFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    }
};
fieldValidators[trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new FieldValidateFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    }
};