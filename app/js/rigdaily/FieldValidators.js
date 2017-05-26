var fieldValidators = {};

fieldValidators[config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(config.rigDailyReportTT + '.RDR_AM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new FieldValidateFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    }
};
fieldValidators[config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(config.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new FieldValidateFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    }
};