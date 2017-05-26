var dynCalculations = {};

// rigDailyReportTT
dynCalculations[config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    setCfValue(config.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED',
        getCfValue(config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH') -
        getCfValue(config.rigDailyReportTT + '.RDR_AM_PREVIOUS_MEASURED_DEPTH'));

    setCfValue(config.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH',
        getCfValue(config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'));
};
dynCalculations[config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    setCfValue(config.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED',
        getCfValue(config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH') -
        getCfValue(config.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH'));

    dynCalculations[config.dynTT + '.RT_TOTAL']();
};
dynCalculations[config.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED'] = function () {
    dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL']();
};
dynCalculations[config.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED'] = function () {
    dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL']();
};

// Rig pumps
dynCalculations[config.rigDailyReportTT + '.RDR_PUMP_1_GPM_PM'] = function () {
    setCfValue(config.rigDailyReportTT + '.RDR_EQUIP_TOTAL_GPM',
        getCfValue(config.rigDailyReportTT + '.RDR_PUMP_1_GPM_PM') +
        getCfValue(config.rigDailyReportTT + '.RDR_PUMP_2_GPM_PM'));
};
dynCalculations[config.rigDailyReportTT + '.RDR_PUMP_2_GPM_PM'] = dynCalculations[config.rigDailyReportTT + '.RDR_PUMP_1_GPM_PM'];

// labTestingTT
dynCalculations[config.labTestingTT + '.LABT_WATER'] = function (tid, tblIdx) {
    var water = getCfValue(config.labTestingTT + '.LABT_WATER', tid, tblIdx);
    var oil = getCfValue(config.labTestingTT + '.LABT_OIL', tid, tblIdx);
    setCfValue(config.labTestingTT + '.LABT_SOLIDS', (100 - water - oil), tid, tblIdx);
};
dynCalculations[config.labTestingTT + '.LABT_OIL'] = dynCalculations[config.labTestingTT + '.LABT_WATER'];

// holeDesignAndVolumeTT
dynCalculations[config.holeDesignAndVolumeTT + '.HDV_GAUGE_BBL'] = function (tid, tblIdx) {
    var newVal = 0;
    $.each(tids[config.holeDesignAndVolumeTT], function (idx, tid) {
        newVal += getCfValue(config.holeDesignAndVolumeTT + '.HDV_GAUGE_BBL', tid, tblIdx);
    });
    setCfValue(config.rigSiteTT + '.RS_GAUGE_HOLE_TOTAL', newVal);
};
dynCalculations[config.holeDesignAndVolumeTT + '.HDV_HOLE'] = function (tid, tblIdx) {
    var prevDepth;
    $.each(tids[config.holeDesignAndVolumeTT], function (idx, tid) {
        var hole = getCfValue(config.holeDesignAndVolumeTT + '.HDV_HOLE', tid, tblIdx);
        var depth = getCfValue(config.holeDesignAndVolumeTT + '.HDV_DEPTH', tid, tblIdx);

        var gaugeBbl = Math.pow(hole, 2) * 0.000972;
        gaugeBbl *= typeof prevDepth !== 'undefined' ? depth - prevDepth : depth;
        prevDepth = depth;

        setCfValue(config.holeDesignAndVolumeTT + '.HDV_GAUGE_BBL', gaugeBbl, tid, tblIdx);
    });
};
dynCalculations[config.holeDesignAndVolumeTT + '.HDV_DEPTH'] = dynCalculations[config.holeDesignAndVolumeTT + '.HDV_HOLE'];

// retortsTT
dynCalculations[config.retortsTT + '.RET_AM_OIL'] = function (tid, tblIdx) {
    var water = getCfValue(config.retortsTT + '.RET_AM_WATER', tid, tblIdx);
    var oil = getCfValue(config.retortsTT + '.RET_AM_OIL', tid, tblIdx);
    setCfValue(config.retortsTT + '.RET_AM_SOLIDS', (100 - water - oil), tid, tblIdx);
};
dynCalculations[config.retortsTT + '.RET_AM_WATER'] = dynCalculations[config.retortsTT + '.RET_AM_OIL'];
dynCalculations[config.retortsTT + '.RET_PM_OIL'] = function (tid, tblIdx) {
    var water = getCfValue(config.retortsTT + '.RET_PM_WATER', tid, tblIdx);
    var oil = getCfValue(config.retortsTT + '.RET_PM_OIL', tid, tblIdx);
    setCfValue(config.retortsTT + '.RET_PM_SOLIDS', (100 - water - oil), tid, tblIdx);
};
dynCalculations[config.retortsTT + '.RET_PM_WATER'] = dynCalculations[config.retortsTT + '.RET_PM_OIL'];

// wasteHaulOffUsageTT
dynCalculations[config.wasteHaulOffUsageTT + '.WHOU_TONS'] = function () {
    var newValue = 0;
    $.each(tids[config.wasteHaulOffUsageTT], function (idx, tid) {
        $.each(configTblIdxs[config.wasteHaulOffUsageTT], function (idx, tblIdx) {
            var val = getCfValue(config.wasteHaulOffUsageTT + '.WHOU_TONS', tid, tblIdx);
            if (val !== null) {
                newValue += val;
            }
        });
    });

    setCfValue(config.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE', newValue);
    newValue *= getCfValue(config.rigDailyReportTT + '.RDR_WHOU_COST_TON');
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL', newValue);
};

dynCalculations[config.rigDailyReportTT + '.RDR_WHOU_COST_TON'] = dynCalculations[config.wasteHaulOffUsageTT + '.WHOU_TONS'];

dynCalculations[config.projectTT + '.PR_TOTAL_TONNAGE_WASTE_HAUL'] = function () {
    var number = getCfValue(config.projectTT + '.PR_TOTAL_TONNAGE_WASTE_HAUL') -
        getCfValue(config.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE');
    setCfValue(config.dynTT + '.PREV_WHL_TOTAL_TONNAGE', number);
};

dynCalculations[config.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE'] = function () {
    var number = getCfValue(config.dynTT + '.PREV_WHL_TOTAL_TONNAGE') +
        getCfValue(config.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE');
    setCfValue(config.rigDailyReportTT + '.RDR_WHOU_TOTAL_LOADS_TO_DATE', number);
};

// consumablesUsageTT
dynCalculations[config.consumablesUsageTT + '.CONU_INITIAL'] = function (tid, tblIdx) {
    var newValue = getCfValue(config.consumablesUsageTT + '.CONU_INITIAL', tid, tblIdx) +
        getCfValue(config.consumablesUsageTT + '.CONU_DELIVERED', tid, tblIdx);
    setCfValue(config.consumablesUsageTT + '.CONU_TOTAL_DELIVERED', newValue, tid, tblIdx);
};
dynCalculations[config.consumablesUsageTT + '.CONU_DELIVERED'] = dynCalculations[config.consumablesUsageTT + '.CONU_INITIAL'];
dynCalculations[config.consumablesUsageTT + '.CONU_TOTAL_DELIVERED'] = function (tid, tblIdx) {
    var used = getCfValue(config.consumablesUsageTT + '.CONU_USED', tid, tblIdx);
    var totalDelivered = getCfValue(config.consumablesUsageTT + '.CONU_TOTAL_DELIVERED', tid, tblIdx);
    setCfValue(config.consumablesUsageTT + '.CONU_BALANCE', totalDelivered - used, tid, tblIdx);
};
dynCalculations[config.consumablesUsageTT + '.CONU_BALANCE'] = function (tid, tblIdx) {
    var cost = getCfValue(config.consumablesUsageTT + '.' + config.consumablesTT + '.CONS_COST', tid, tblIdx);
    var totalDelivered = getCfValue(config.consumablesUsageTT + '.CONU_TOTAL_DELIVERED', tid, tblIdx);
    var balance = getCfValue(config.consumablesUsageTT + '.CONU_BALANCE', tid, tblIdx);
    setCfValue(config.consumablesUsageTT + '.CONU_TOTAL', (totalDelivered - balance) * cost, tid, tblIdx);
};
dynCalculations[config.consumablesUsageTT + '.CONU_USED'] = function (tid, tblIdx) {
    dynCalculations[config.consumablesUsageTT + '.CONU_TOTAL_DELIVERED'](tid, tblIdx);

    var cost = getCfValue(config.consumablesUsageTT + '.' + config.consumablesTT + '.CONS_COST', tid, tblIdx);
    var used = getCfValue(config.consumablesUsageTT + '.CONU_USED', tid, tblIdx);
    setCfValue(config.consumablesUsageTT + '.CONU_DAILY', cost * used, tid, tblIdx);
};
dynCalculations[config.consumablesUsageTT + '.CONU_DAILY'] = function (tid, tblIdx) {
    var summ = 0;
    $.each(tids[config.consumablesUsageTT], function (idx, tid) {
        summ += getCfValue(config.consumablesUsageTT + '.CONU_DAILY', tid, tblIdx);
    });
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES', summ);
};

// binderUsageTT
dynCalculations[config.binderUsageTT + '.BU_INITIAL'] = function (tid, tblIdx) {
    var newValue = getCfValue(config.binderUsageTT + '.BU_INITIAL', tid, tblIdx) +
        getCfValue(config.binderUsageTT + '.BU_DELIVERED', tid, tblIdx);
    setCfValue(config.binderUsageTT + '.BU_TOTAL_DELIVERED', newValue, tid, tblIdx);
};
dynCalculations[config.binderUsageTT + '.BU_DELIVERED'] = dynCalculations[config.binderUsageTT + '.BU_INITIAL'];
dynCalculations[config.binderUsageTT + '.BU_TOTAL_DELIVERED'] = function (tid, tblIdx) {
    var used = getCfValue(config.binderUsageTT + '.BU_USED', tid, tblIdx);
    var totalDelivered = getCfValue(config.binderUsageTT + '.BU_TOTAL_DELIVERED', tid, tblIdx);
    setCfValue(config.binderUsageTT + '.BU_BALANCE', totalDelivered - used, tid, tblIdx);
};
dynCalculations[config.binderUsageTT + '.BU_BALANCE'] = function (tid, tblIdx) {
    var cost = getCfValue(config.binderUsageTT + '.' + config.binderTT + '.BIND_COST', tid, tblIdx);
    var totalDelivered = getCfValue(config.binderUsageTT + '.BU_TOTAL_DELIVERED', tid, tblIdx);
    var balance = getCfValue(config.binderUsageTT + '.BU_BALANCE', tid, tblIdx);
    setCfValue(config.binderUsageTT + '.BU_TOTAL', (totalDelivered - balance) * cost, tid, tblIdx);
};
dynCalculations[config.binderUsageTT + '.BU_USED'] = function (tid, tblIdx) {
    dynCalculations[config.binderUsageTT + '.BU_TOTAL_DELIVERED'](tid, tblIdx);

    var cost = getCfValue(config.binderUsageTT + '.' + config.binderTT + '.BIND_COST', tid, tblIdx);
    var used = getCfValue(config.binderUsageTT + '.BU_USED', tid, tblIdx);
    setCfValue(config.binderUsageTT + '.BU_DAILY', cost * used, tid, tblIdx);

    dynCalculations[config.binderUsageTT + '.BU_UNIT'](tid, tblIdx);
};
dynCalculations[config.binderUsageTT + '.BU_UNIT'] = function (tid, tblIdx) {
    var key = getCfValue(config.binderUsageTT + '.' + config.binderTT + '.TRACKOR_KEY', tid, tblIdx);
    var used = getCfValue(config.binderUsageTT + '.BU_USED', tid, tblIdx);
    var unit = getCfValue(config.binderUsageTT + '.BU_UNIT', tid, tblIdx);

    var baseRowData = $('tr.binderLbsUsedUnitBaseRow').data();
    var binderLbsUsedTid;
    var binderLbsUsedTblIdx;

    $.each(configTblIdxs[config.binderUsageTT].slice(1), function (idx, tblIdx) {
        var tblIdxTid = baseRowData['tid_' + tblIdx];
        if (getCfValue(config.binderUsageTT + '.' + config.binderTT + '.TRACKOR_KEY', tblIdxTid, tblIdx) === key) {
            binderLbsUsedTid = tblIdxTid;
            binderLbsUsedTblIdx = tblIdx;
            return false;
        }
    });

    if (binderLbsUsedTid && binderLbsUsedTblIdx) {
        var number = used * unit;
        setCfValue(config.binderUsageTT + '.BU_BINDER_LBS_USED', number, binderLbsUsedTid, binderLbsUsedTblIdx);
    }
};
dynCalculations[config.binderUsageTT + '.BU_DAILY'] = function (tid, tblIdx) {
    var summ = 0;
    $.each(tids[config.binderUsageTT], function (idx, tid) {
        summ += getCfValue(config.binderUsageTT + '.BU_DAILY', tid, tblIdx);
    });
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL', summ);
};

// equipmentUsageTT
dynCalculations[config.equipmentUsageTT + '.EQU_QUANTITY'] = function (tid, tblIdx) {
    var number = getCfValue(config.equipmentUsageTT + '.EQU_QUANTITY', tid, tblIdx) *
        getCfValue(config.equipmentUsageTT + '.' + config.equipmentTT + '.EQ_DAILY_COST', tid, tblIdx);
    setCfValue(config.equipmentUsageTT + '.EQU_TOTAL', number, tid, tblIdx);
};
dynCalculations[config.equipmentUsageTT + '.EQU_TOTAL'] = function () {
    // Daily Total All In
    var dailyTotalEquip = 0;
    $.each(tids[config.equipmentUsageTT], function (idx, tid) {
        dailyTotalEquip += getCfValue(config.equipmentUsageTT + '.EQU_TOTAL', tid, configTblIdxs[config.equipmentUsageTT]);
    });

    var dailyTotalTech = 0;
    $.each(tids[config.techniciansUsageTT], function (idx, tid) {
        dailyTotalTech += getCfValue(config.techniciansUsageTT + '.TECU_TOTAL', tid, configTblIdxs[config.techniciansUsageTT]);
    });

    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_EQUIPMENT', dailyTotalEquip);
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_TECHNICIANS', dailyTotalTech);
    setCfValue(config.dynTT + '.RT_DAILY_EQTECH', dailyTotalEquip + dailyTotalTech);
};

// techniciansUsageTT
dynCalculations[config.techniciansUsageTT + '.TECU_QUANTITY'] = function (tid, tblIdx) {
    var number = getCfValue(config.techniciansUsageTT + '.TECU_QUANTITY', tid, tblIdx) *
        getCfValue(config.techniciansUsageTT + '.' + config.workersTT + '.WOR_DAILY_COST', tid, tblIdx);
    setCfValue(config.techniciansUsageTT + '.TECU_TOTAL', number, tid, tblIdx);
};
dynCalculations[config.techniciansUsageTT + '.TECU_TOTAL'] = dynCalculations[config.equipmentUsageTT + '.EQU_TOTAL'];

// Running totals
dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_CONSUMABLES'] = function () {
    var number = getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_CONSUMABLES') -
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES');
    setCfValue(config.dynTT + '.RT_PREV_CONSUMABLES', number);

    number = (getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_CONSUMABLES') + getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_BINDER')) -
        (getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL'));
    setCfValue(config.dynTT + '.PREV', number);

    dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES']();
};
dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_BINDER'] = function () {
    var number = getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_BINDER') -
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL');
    setCfValue(config.dynTT + '.RT_PREV_BINDER', number);

    number = (getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_CONSUMABLES') + getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_BINDER')) -
        (getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL'));
    setCfValue(config.dynTT + '.PREV', number);

    dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES']();
};

dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_BINDER_LBS'] = function () {
    var number = checkInfinity(getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_BINDER_LBS') /
        getCfValue(config.projectTT + '.PR_TOTAL_TONNAGE_WASTE_HAUL'));
    setCfValue(config.projectTT + '.PR_LBS__TONS', number);
};

dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_EQUIPMENT'] = function () {
    var number = getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_EQUIPMENT') + getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_TECHNICIANS');
    setCfValue(config.dynTT + '.RT_TOTAL_EQTECH', number);

    number -= getCfValue(config.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(config.dynTT + '.RT_PREV_EQTECH', number);
};
dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_TECHNICIANS'] = dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_EQUIPMENT'];

dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_WASTE_HAUL'] = function () {
    var number = getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_WASTE_HAUL') -
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL');
    setCfValue(config.dynTT + '.RT_PREV_WHLOFF', number);
};

dynCalculations[config.projectTT + '.PR_CUMULATIVE_TOTAL_RUNNING_TOTAL'] = function () {
    var number = getCfValue(config.projectTT + '.PR_CUMULATIVE_TOTAL_RUNNING_TOTAL') -
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL');
    setCfValue(config.dynTT + '.RT_PREV', number);
};

// Daily running totals
dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES'] = function () {
    var number = getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(config.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);

    number = getCfValue(config.dynTT + '.RT_PREV_CONSUMABLES') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES');
    setCfValue(config.dynTT + '.RT_TOTAL_CONSUMABLES', number);

    number = getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES') +
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL');
    setCfValue(config.dynTT + '.CUMULATIVE_TOTAL', number);
};
dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL'] = function () { // Binder
    var number = getCfValue(config.dynTT + '.RT_PREV_BINDER') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL');
    setCfValue(config.dynTT + '.RT_TOTAL_BINDER', number);

    number = getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(config.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);

    dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES']();
};

dynCalculations[config.dynTT + '.RT_DAILY_EQTECH'] = function () {
    var number = getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(config.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);

    number = getCfValue(config.dynTT + '.RT_PREV_EQTECH') + getCfValue(config.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(config.dynTT + '.RT_TOTAL_EQTECH', number);
};

dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL'] = function () {
    var number = getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL');
    setCfValue(config.dynTT + '.WHL_DAILY_TOTAL', number);

    number += getCfValue(config.dynTT + '.RT_PREV_WHLOFF');
    setCfValue(config.dynTT + '.RT_TOTAL_WHLOFF', number);

    number = getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL')
        + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL')
        + getCfValue(config.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL', number);
};

dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL'] = function () {
    var number = checkInfinity(getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL') /
        (getCfValue(config.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED') + getCfValue(config.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED')));
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_EST_COST__FT', number);

    number = getCfValue(config.dynTT + '.RT_PREV') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_RUNNING_TOTAL');
    setCfValue(config.dynTT + '.RT_TOTAL', number);
};

dynCalculations[config.dynTT + '.RT_TOTAL'] = function () {
    var number = checkInfinity(getCfValue(config.dynTT + '.RT_TOTAL') /
        getCfValue(config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'));
    setCfValue(config.projectTT + '.PR_TOTAL_EST_COST__FT', number);
};