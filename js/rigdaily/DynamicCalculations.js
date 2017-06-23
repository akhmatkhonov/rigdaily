var dynCalculations = {};

// rigDailyReportTT
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_REPORT_DATE'] = function () {
    var reportDateStr = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_REPORT_DATE');
    var reportDate = dateUtils.localDateToObj(reportDateStr);
    setCfValue(trackorTypes.dynTT + '.REPORT_ID', reportDate.getDate());
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED',
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH') -
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_PREVIOUS_MEASURED_DEPTH'));

    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH',
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'));
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED',
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH') -
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH'));

    dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_TOTAL_RUNNING_TOTAL']();
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED'] = function () {
    dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL']();
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED'] = function () {
    dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL']();
};

// rigDailyReportTT/Rig pumps
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PUMP_1_GPM_PM'] = function () {
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_EQUIP_TOTAL_GPM',
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PUMP_1_GPM_PM') +
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PUMP_2_GPM_PM'));
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PUMP_2_GPM_PM'] = dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PUMP_1_GPM_PM'];

// labTestingTT
dynCalculations[trackorTypes.labTestingTT + '.LABT_WATER'] = function (tid, tblIdx) {
    var water = getCfValue(trackorTypes.labTestingTT + '.LABT_WATER', tid, tblIdx);
    var oil = getCfValue(trackorTypes.labTestingTT + '.LABT_OIL', tid, tblIdx);
    setCfValue(trackorTypes.labTestingTT + '.LABT_SOLIDS', (100 - water - oil), tid, tblIdx);
};
dynCalculations[trackorTypes.labTestingTT + '.LABT_OIL'] = dynCalculations[trackorTypes.labTestingTT + '.LABT_WATER'];

// holeDesignAndVolumeTT
dynCalculations[trackorTypes.holeDesignAndVolumeTT + '.HDV_GAUGE_BBL'] = function (tid, tblIdx) {
    var newVal = 0;
    $.each(tids[trackorTypes.holeDesignAndVolumeTT], function (idx, tid) {
        newVal += getCfValue(trackorTypes.holeDesignAndVolumeTT + '.HDV_GAUGE_BBL', tid, tblIdx);
    });
    setCfValue(trackorTypes.rigSiteTT + '.RS_GAUGE_HOLE_TOTAL', newVal);
};
dynCalculations[trackorTypes.holeDesignAndVolumeTT + '.HDV_HOLE'] = function (tid, tblIdx) {
    var prevDepth;
    $.each(tids[trackorTypes.holeDesignAndVolumeTT], function (idx, tid) {
        var hole = getCfValue(trackorTypes.holeDesignAndVolumeTT + '.HDV_HOLE', tid, tblIdx);
        var depth = getCfValue(trackorTypes.holeDesignAndVolumeTT + '.HDV_DEPTH', tid, tblIdx);

        var gaugeBbl = Math.pow(hole, 2) * 0.000972;
        gaugeBbl *= typeof prevDepth !== 'undefined' ? depth - prevDepth : depth;
        prevDepth = depth;

        setCfValue(trackorTypes.holeDesignAndVolumeTT + '.HDV_GAUGE_BBL', gaugeBbl, tid, tblIdx);
    });
};
dynCalculations[trackorTypes.holeDesignAndVolumeTT + '.HDV_DEPTH'] = dynCalculations[trackorTypes.holeDesignAndVolumeTT + '.HDV_HOLE'];


// fieldTestingTT
dynCalculations[trackorTypes.fieldTestingTT + '.FT_TESTING_NAME'] = function (tid, tblIdx) {
    var originalName = getOriginalCfValue(trackorTypes.fieldTestingTT + '.FT_TESTING_NAME', tid, tblIdx);
    var otherTblIdx = tblIdx === 'ftam' ? 'ftpm' : 'ftam';
    var otherTid = null;

    $.each(tids[trackorTypes.fieldTestingTT], function (idx, tid) {
        if (originalName === getOriginalCfValue(trackorTypes.fieldTestingTT + '.FT_TESTING_NAME', tid, otherTblIdx, true)) {
            otherTid = tid;
            return false;
        }
    });

    if (otherTid !== null) {
        var otherName = getCfValue(trackorTypes.fieldTestingTT + '.FT_TESTING_NAME', otherTid, otherTblIdx);
        var otherCf = findCf(trackorTypes.fieldTestingTT + '.FT_TESTING_NAME', otherTid, otherTblIdx);
        var name = getCfValue(trackorTypes.fieldTestingTT + '.FT_TESTING_NAME', tid, tblIdx);
        var isNameChanged = name !== otherName;
        var isOtherLocked = otherCf.find('div.locked[contenteditable=false]').length !== 0;

        if (isNameChanged && isOtherLocked) {
            setCfValue(trackorTypes.fieldTestingTT + '.FT_TESTING_NAME', originalName, tid, tblIdx);
        } else if (isNameChanged && !isOtherLocked) {
            setCfValue(trackorTypes.fieldTestingTT + '.FT_TESTING_NAME', name, otherTid, otherTblIdx);
        }
    }
};

// retortsTT
dynCalculations[trackorTypes.retortsTT + '.RET_NAME'] = function (tid, tblIdx, div) {
    var td = div.closest('td');
    var cfs = findCf(trackorTypes.retortsTT + '.RET_NAME', tid, tblIdx);
    cfs.find('div[contenteditable=true]').filter(function () {
        var cIdx = $(this).closest('td').data('cidx');
        return cIdx !== td.data('cidx');
    }).empty().text(div.text());
};
dynCalculations[trackorTypes.retortsTT + '.RET_AM_OIL'] = function (tid, tblIdx) {
    var water = getCfValue(trackorTypes.retortsTT + '.RET_AM_WATER', tid, tblIdx);
    var oil = getCfValue(trackorTypes.retortsTT + '.RET_AM_OIL', tid, tblIdx);
    setCfValue(trackorTypes.retortsTT + '.RET_AM_SOLIDS', (100 - water - oil), tid, tblIdx);
};
dynCalculations[trackorTypes.retortsTT + '.RET_AM_WATER'] = dynCalculations[trackorTypes.retortsTT + '.RET_AM_OIL'];
dynCalculations[trackorTypes.retortsTT + '.RET_PM_OIL'] = function (tid, tblIdx) {
    var water = getCfValue(trackorTypes.retortsTT + '.RET_PM_WATER', tid, tblIdx);
    var oil = getCfValue(trackorTypes.retortsTT + '.RET_PM_OIL', tid, tblIdx);
    setCfValue(trackorTypes.retortsTT + '.RET_PM_SOLIDS', (100 - water - oil), tid, tblIdx);
};
dynCalculations[trackorTypes.retortsTT + '.RET_PM_WATER'] = dynCalculations[trackorTypes.retortsTT + '.RET_PM_OIL'];

// wasteHaulOffUsageTT
dynCalculations[trackorTypes.wasteHaulOffUsageTT + '.WHOU_TONS'] = function () {
    var newValue = 0;
    $.each(tids[trackorTypes.wasteHaulOffUsageTT], function (idx, tid) {
        $.each(tableIndexes[trackorTypes.wasteHaulOffUsageTT], function (idx, tblIdx) {
            var val = getCfValue(trackorTypes.wasteHaulOffUsageTT + '.WHOU_TONS', tid, tblIdx, true);
            if (val !== null) {
                newValue += val;
                return false;
            }
        });
    });

    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE', newValue);
    newValue *= getCfValue(trackorTypes.rigDailyReportTT + '.RDR_WHOU_COST_TON');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL', newValue);
};

dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_WHOU_COST_TON'] = dynCalculations[trackorTypes.wasteHaulOffUsageTT + '.WHOU_TONS'];

dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE'] = function () {
    var number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_CUMULATIVE_TOTAL_WASTE_HAUL') +
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_WHOU_TOTAL_LOADS_TO_DATE', number);
};

// consumablesUsageTT
dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_INITIAL'] = function (tid, tblIdx) {
    var newValue = getCfValue(trackorTypes.consumablesUsageTT + '.CONU_INITIAL', tid, tblIdx) +
        getCfValue(trackorTypes.consumablesUsageTT + '.CONU_DELIVERED', tid, tblIdx);
    setCfValue(trackorTypes.consumablesUsageTT + '.CONU_TOTAL_DELIVERED', newValue, tid, tblIdx);
};
dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_DELIVERED'] = dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_INITIAL'];
dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_TOTAL_DELIVERED'] = function (tid, tblIdx) {
    var used = getCfValue(trackorTypes.consumablesUsageTT + '.CONU_USED', tid, tblIdx);
    var totalDelivered = getCfValue(trackorTypes.consumablesUsageTT + '.CONU_TOTAL_DELIVERED', tid, tblIdx);
    setCfValue(trackorTypes.consumablesUsageTT + '.CONU_BALANCE', totalDelivered - used, tid, tblIdx);
};
dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_BALANCE'] = function (tid, tblIdx) {
    var cost = getCfValue(trackorTypes.consumablesUsageTT + '.' + trackorTypes.consumablesTT + '.CONS_COST', tid, tblIdx);
    var totalDelivered = getCfValue(trackorTypes.consumablesUsageTT + '.CONU_TOTAL_DELIVERED', tid, tblIdx);
    var balance = getCfValue(trackorTypes.consumablesUsageTT + '.CONU_BALANCE', tid, tblIdx);
    setCfValue(trackorTypes.consumablesUsageTT + '.CONU_TOTAL', (totalDelivered - balance) * cost, tid, tblIdx);
};
dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_USED'] = function (tid, tblIdx) {
    dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_TOTAL_DELIVERED'](tid, tblIdx);

    var cost = getCfValue(trackorTypes.consumablesUsageTT + '.' + trackorTypes.consumablesTT + '.CONS_COST', tid, tblIdx);
    var used = getCfValue(trackorTypes.consumablesUsageTT + '.CONU_USED', tid, tblIdx);
    setCfValue(trackorTypes.consumablesUsageTT + '.CONU_DAILY', cost * used, tid, tblIdx);
};
dynCalculations[trackorTypes.consumablesUsageTT + '.CONU_DAILY'] = function (tid, tblIdx) {
    var summ = 0;
    $.each(tids[trackorTypes.consumablesUsageTT], function (idx, tid) {
        summ += getCfValue(trackorTypes.consumablesUsageTT + '.CONU_DAILY', tid, tblIdx);
    });
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES', summ);
};

// binderUsageTT
dynCalculations[trackorTypes.binderUsageTT + '.BU_INITIAL'] = function (tid, tblIdx) {
    var newValue = getCfValue(trackorTypes.binderUsageTT + '.BU_INITIAL', tid, tblIdx) +
        getCfValue(trackorTypes.binderUsageTT + '.BU_DELIVERED', tid, tblIdx);
    setCfValue(trackorTypes.binderUsageTT + '.BU_TOTAL_DELIVERED', newValue, tid, tblIdx);
};
dynCalculations[trackorTypes.binderUsageTT + '.BU_DELIVERED'] = dynCalculations[trackorTypes.binderUsageTT + '.BU_INITIAL'];
dynCalculations[trackorTypes.binderUsageTT + '.BU_TOTAL_DELIVERED'] = function (tid, tblIdx) {
    var used = getCfValue(trackorTypes.binderUsageTT + '.BU_USED', tid, tblIdx);
    var totalDelivered = getCfValue(trackorTypes.binderUsageTT + '.BU_TOTAL_DELIVERED', tid, tblIdx);
    setCfValue(trackorTypes.binderUsageTT + '.BU_BALANCE', totalDelivered - used, tid, tblIdx);
};
dynCalculations[trackorTypes.binderUsageTT + '.BU_BALANCE'] = function (tid, tblIdx) {
    var cost = getCfValue(trackorTypes.binderUsageTT + '.' + trackorTypes.binderTT + '.BIND_COST', tid, tblIdx);
    var totalDelivered = getCfValue(trackorTypes.binderUsageTT + '.BU_TOTAL_DELIVERED', tid, tblIdx);
    var balance = getCfValue(trackorTypes.binderUsageTT + '.BU_BALANCE', tid, tblIdx);
    setCfValue(trackorTypes.binderUsageTT + '.BU_TOTAL', (totalDelivered - balance) * cost, tid, tblIdx);
};
dynCalculations[trackorTypes.binderUsageTT + '.BU_USED'] = function (tid, tblIdx) {
    dynCalculations[trackorTypes.binderUsageTT + '.BU_TOTAL_DELIVERED'](tid, tblIdx);
    dynCalculations[trackorTypes.binderUsageTT + '.BU_UNIT'](tid, tblIdx);
};
dynCalculations[trackorTypes.binderUsageTT + '.BU_UNIT'] = function (tid, tblIdx) {
    var key = getCfValue(trackorTypes.binderUsageTT + '.' + trackorTypes.binderTT + '.TRACKOR_KEY', tid, tblIdx);
    var cost = getCfValue(trackorTypes.binderUsageTT + '.' + trackorTypes.binderTT + '.BIND_COST', tid, tblIdx);
    var used = getCfValue(trackorTypes.binderUsageTT + '.BU_USED', tid, tblIdx);
    var unit = getCfValue(trackorTypes.binderUsageTT + '.BU_UNIT', tid, tblIdx);

    setCfValue(trackorTypes.binderUsageTT + '.BU_DAILY', cost * used, tid, tblIdx);

    var baseRowData = $('tr.binderLbsUsedUnitBaseRow').data();
    var binderLbsUsedTid;
    var binderLbsUsedTblIdx;

    $.each(tableIndexes[trackorTypes.binderUsageTT].slice(1), function (idx, tblIdx) {
        var tblIdxTid = baseRowData['tid_' + tblIdx];
        if (getCfValue(trackorTypes.binderUsageTT + '.' + trackorTypes.binderTT + '.TRACKOR_KEY', tblIdxTid, tblIdx) === key) {
            binderLbsUsedTid = tblIdxTid;
            binderLbsUsedTblIdx = tblIdx;
            return false;
        }
    });

    if (binderLbsUsedTid && binderLbsUsedTblIdx) {
        var number = used * unit;
        setCfValue(trackorTypes.binderUsageTT + '.BU_BINDER_LBS_USED', number, binderLbsUsedTid, binderLbsUsedTblIdx);
    }
};
dynCalculations[trackorTypes.binderUsageTT + '.BU_DAILY'] = function () {
    var summ = 0;
    $.each(tids[trackorTypes.binderUsageTT], function (idx, tid) {
        summ += getCfValue(trackorTypes.binderUsageTT + '.BU_DAILY', tid, tableIndexes[trackorTypes.binderUsageTT][0]);
    });
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL', summ);
};
dynCalculations[trackorTypes.binderUsageTT + '.BU_BINDER_LBS_USED'] = function () {
    var summ = 0;
    var baseRowData = $('tr.binderLbsUsedUnitBaseRow').data();
    var tblIdxs = tableIndexes[trackorTypes.binderUsageTT].slice(1);

    $.each(tids[trackorTypes.binderUsageTT], function (idx, tid) {
        var key = getCfValue(trackorTypes.binderUsageTT + '.' + trackorTypes.binderTT + '.TRACKOR_KEY', tid,
            tableIndexes[trackorTypes.binderUsageTT][0]);

        $.each(tblIdxs, function (idx, tblIdx) {
            var tblIdxTid = baseRowData['tid_' + tblIdx];
            if (getCfValue(trackorTypes.binderUsageTT + '.' + trackorTypes.binderTT + '.TRACKOR_KEY', tblIdxTid, tblIdx) === key) {
                summ += getCfValue(trackorTypes.binderUsageTT + '.BU_BINDER_LBS_USED', tid, tblIdx);
                return false;
            }
        });
    });
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_LBS_USED', summ);
};

// equipmentUsageTT
dynCalculations[trackorTypes.equipmentUsageTT + '.EQU_QUANTITY'] = function (tid, tblIdx) {
    var number = getCfValue(trackorTypes.equipmentUsageTT + '.EQU_QUANTITY', tid, tblIdx) *
        getCfValue(trackorTypes.equipmentUsageTT + '.' + trackorTypes.equipmentTT + '.EQ_DAILY_COST', tid, tblIdx);
    setCfValue(trackorTypes.equipmentUsageTT + '.EQU_TOTAL', number, tid, tblIdx);
};
dynCalculations[trackorTypes.equipmentUsageTT + '.EQU_TOTAL'] = function () {
    // Daily Total All In
    var dailyTotalEquip = 0;
    $.each(tids[trackorTypes.equipmentUsageTT], function (idx, tid) {
        dailyTotalEquip += getCfValue(trackorTypes.equipmentUsageTT + '.EQU_TOTAL', tid, tableIndexes[trackorTypes.equipmentUsageTT]);
    });

    var dailyTotalTech = 0;
    $.each(tids[trackorTypes.techniciansUsageTT], function (idx, tid) {
        dailyTotalTech += getCfValue(trackorTypes.techniciansUsageTT + '.TECU_TOTAL', tid, tableIndexes[trackorTypes.techniciansUsageTT]);
    });

    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_EQUIPMENT', dailyTotalEquip);
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_TECHNICIANS', dailyTotalTech);
    setCfValue(trackorTypes.dynTT + '.RT_DAILY_EQTECH', dailyTotalEquip + dailyTotalTech);
};

// techniciansUsageTT
dynCalculations[trackorTypes.techniciansUsageTT + '.TECU_QUANTITY'] = function (tid, tblIdx) {
    var number = getCfValue(trackorTypes.techniciansUsageTT + '.TECU_QUANTITY', tid, tblIdx) *
        getCfValue(trackorTypes.techniciansUsageTT + '.' + trackorTypes.workersTT + '.WOR_DAILY_COST', tid, tblIdx);
    setCfValue(trackorTypes.techniciansUsageTT + '.TECU_TOTAL', number, tid, tblIdx);
};
dynCalculations[trackorTypes.techniciansUsageTT + '.TECU_TOTAL'] = dynCalculations[trackorTypes.equipmentUsageTT + '.EQU_TOTAL'];

// Running totals
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_LBS_USED'] = function () {
    var number = checkInfinity(getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_LBS_USED') /
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_CUMULATIVE_TOTAL_WASTE_HAUL'));
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_LBS__TONS', number);
};

dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_EQUIPMENT'] = function () {
    var number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_EQUIPMENT') + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_TECHNICIANS');
    setCfValue(trackorTypes.dynTT + '.RT_PREV_EQTECH', number);
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_TECHNICIANS'] = dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_EQUIPMENT'];

dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_CONSUMABLES'] = function () {
    var number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_CONSUMABLES') + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_BINDER');
    setCfValue(trackorTypes.dynTT + '.RT_PREV_CONS_BINDER', number);
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_BINDER'] = dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_CONSUMABLES'];

// Daily running totals
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES'] = function () {
    var number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(trackorTypes.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);

    number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_CONSUMABLES') + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_TOTAL_CONSUMABLES', number);

    number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL') +
        getCfValue(trackorTypes.dynTT + '.RT_PREV_CONS_BINDER');
    setCfValue(trackorTypes.dynTT + '.RT_CUMULATIVE_TOTAL_CONS_BINDER', number);
};
dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL'] = function () { // Binder
    var number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_BINDER') + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_TOTAL_BINDER', number);

    number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(trackorTypes.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);

    dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES']();
};

dynCalculations[trackorTypes.dynTT + '.RT_DAILY_EQTECH'] = function () {
    var number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(trackorTypes.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);

    number = getCfValue(trackorTypes.dynTT + '.RT_PREV_EQTECH') + getCfValue(trackorTypes.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(trackorTypes.dynTT + '.RT_TOTAL_EQTECH', number);
};

dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL'] = function () {
    var number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL');
    setCfValue(trackorTypes.dynTT + '.WHL_DAILY_TOTAL', number);

    number += getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_WASTE_HAUL');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_TOTAL_WASTE_HAUL', number);

    number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(trackorTypes.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);
};

dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL'] = function () {
    var number = checkInfinity(getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL') /
        (getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED') + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED')));
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_EST_COST__FT', number);

    number = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PREVIOUS_TOTAL_RUNNING_TOTAL') + getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL');
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_TOTAL_RUNNING_TOTAL', number);
};

dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_TOTAL_RUNNING_TOTAL'] = function () {
    var number = checkInfinity(getCfValue(trackorTypes.rigDailyReportTT + '.RDR_TOTAL_RUNNING_TOTAL') /
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'));
    setCfValue(trackorTypes.projectTT + '.PR_TOTAL_EST_COST__FT', number);

    number = checkInfinity(getCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL') /
        (getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED') +
        getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED')));
    setCfValue(trackorTypes.rigDailyReportTT + '.RDR_DAILY_EST_COST__FT', number);
};
