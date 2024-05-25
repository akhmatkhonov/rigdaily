var fieldValidators = {};

// rigDailyReportTT
fieldValidators[trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_AM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_AM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new ValidationFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_AM_CURRENT_MEASURED_DEPTH');
    }
};
fieldValidators[trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_PM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_PM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new ValidationFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.VHMRIGD_RDR_PM_CURRENT_MEASURED_DEPTH');
    }
};

// consumablesUsageTT
fieldValidators[trackorTypes.consumablesUsageTT + '.VHMRIGD_CONU_USED'] = function (tid, tblIdx) {
    var balance = getCfValue(trackorTypes.consumablesUsageTT + '.VHMRIGD_CONU_BALANCE', tid, tblIdx);
    if (balance < 0) {
        throw new ValidationFailedException('Incorrect Consumable balance', trackorTypes.consumablesUsageTT + '.VHMRIGD_CONU_USED', tid, tblIdx);
    }
};

// binderUsageTT
fieldValidators[trackorTypes.binderUsageTT + '.VHMRIGD_BU_USED'] = function (tid, tblIdx) {
    var balance = getCfValue(trackorTypes.binderUsageTT + '.VHMRIGD_BU_BALANCE', tid, tblIdx);
    if (balance < 0) {
        throw new ValidationFailedException('Incorrect Binder balance', trackorTypes.binderUsageTT + '.VHMRIGD_BU_USED', tid, tblIdx);
    }
};

var typeValidators = {
    'number': function (value, cfFullName, tid, tblIdx) {
        if (isNaN(parseFloat(value))) {
            throw new ValidationFailedException('Incorrect number value', cfFullName, tid, tblIdx);
        }
    }
};
