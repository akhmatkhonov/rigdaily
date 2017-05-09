'use strict';

ApiClient.endpoint = 'https://energy.onevizion.com';

var config = {
    rigDailyReportTT: 'Rig_Daily_Report',
    rigMonthReportTT: 'Rig_Month_Report',
    rigYearReportTT: 'Rig_Year_Report',
    rigSiteTT: 'Rig_Site',
    clientsTT: 'Clients',
    workersTT: 'Workers',
    contractorsTT: 'Contractors',
    holeDesignAndVolumeTT: 'Hole_Design_And_Volume',
    labTestingTT: 'Lab_Testing',
    apiScreenSizeTT: 'Api_Screen_Size',
    fieldTestingTT: 'Field_Testing',
    retortsTT: 'Retorts',
    wasteHaulOffTT: 'Waste_Haul_Off',
    wasteHaulOffUsageTT: 'Waste_Haul_Off_Usage',
    consumablesUsageTT: 'Consumables_Usage',
    consumablesTT: 'Consumables',
    binderTT: 'Binder',
    binderUsageTT: 'Binder_Usage',
    binderLbsUsedTT: 'Binder_Lbs_Used',
    equipmentTT: 'Equipment',
    equipmentUsageTT: 'Equipment_Usage',
    techniciansUsageTT: 'Technicians_Usage',
    supplyRequestTT: 'Supply_Request',
    projectTT: 'Project',
    projectManagementTT: 'Project_Management',

    // For dynamic calculations
    dynTT: 'Dynamic'
};
var configTblIdxs = {};
configTblIdxs[config.holeDesignAndVolumeTT] = 'hd';
configTblIdxs[config.labTestingTT] = 'lt';
configTblIdxs[config.apiScreenSizeTT] = 'ass';
configTblIdxs[config.fieldTestingTT] = ['ftam', 'ftpm'];
configTblIdxs[config.retortsTT] = 'rtrs';
configTblIdxs[config.wasteHaulOffUsageTT] = ['whou1', 'whou2', 'whou3'];
configTblIdxs[config.consumablesUsageTT] = 'cu';
configTblIdxs[config.binderUsageTT] = 'bu';
configTblIdxs[config.binderLbsUsedTT] = ['blu1', 'blu2', 'blu3', 'blu4'];
configTblIdxs[config.equipmentUsageTT] = 'equ';
configTblIdxs[config.techniciansUsageTT] = 'tecu';
configTblIdxs[config.supplyRequestTT] = 'sr';
configTblIdxs[config.projectManagementTT] = 'pm';

var loseDataMessage = 'You will lose any unsaved data. Continue?';

var isReportEdited = false;
var tids = {};
var locks = {};

function getRigMonthIndex(name) {
    switch (name) {
        case 'January':
            return 1;
        case 'February':
            return 2;
        case 'March':
            return 3;
        case 'April':
            return 4;
        case 'May':
            return 5;
        case 'June':
            return 6;
        case 'July':
            return 7;
        case 'August':
            return 8;
        case 'September':
            return 9;
        case 'October':
            return 10;
        case 'November':
            return 11;
        case 'December':
            return 12;
    }
}

function RequiredFieldsNotPresentException(focusObj) {
    this.message = 'Required fields not present!';
    this.focusObj = focusObj;
}

function FieldValidateFailedException(message, name, tid, tblIdx) {
    this.message = message;
    this.focusObj = findCf(name, tid, tblIdx).children('div[contenteditable]');
}

// Dynamic calculating cells
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
};

dynCalculations[config.rigMonthReportTT + '.RMR_TOTAL_TONNAGE_WASTE_HAUL'] = function () {
    var number = getCfValue(config.rigMonthReportTT + '.RMR_TOTAL_TONNAGE_WASTE_HAUL') -
        getCfValue(config.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE');
    setCfValue(config.dynTT + '.PREV_WHL_TOTAL_TONNAGE', number);
};

dynCalculations[config.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE'] = function () {
    var number = getCfValue(config.dynTT + '.PREV_WHL_TOTAL_TONNAGE') +
        getCfValue(config.rigDailyReportTT + '.RDR_WHOU_DAILY_TOTAL_TONNAGE');
    setCfValue(config.dynTT + '.WHL_TOTAL_TONNAGE', number);
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

    $.each(configTblIdxs[config.binderLbsUsedTT], function (idx, tblIdx) {
        var tblIdxTid = baseRowData['tid_' + tblIdx];
        if (getCfValue(config.binderLbsUsedTT + '.' + config.binderTT + '.TRACKOR_KEY', tblIdxTid, tblIdx) === key) {
            binderLbsUsedTid = tblIdxTid;
            binderLbsUsedTblIdx = tblIdx;
            return false;
        }
    });

    if (binderLbsUsedTid && binderLbsUsedTblIdx) {
        setCfValue(config.binderLbsUsedTT + '.BLU_UNIT', unit, binderLbsUsedTid, binderLbsUsedTblIdx);
        setCfValue(config.binderLbsUsedTT + '.BLU_USED', used, binderLbsUsedTid, binderLbsUsedTblIdx);
    }
};
dynCalculations[config.binderUsageTT + '.BU_DAILY'] = function (tid, tblIdx) {
    var summ = 0;
    $.each(tids[config.binderUsageTT], function (idx, tid) {
        summ += getCfValue(config.binderUsageTT + '.BU_DAILY', tid, tblIdx);
    });
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL', summ);
};

// binderLbsUsedTT
dynCalculations[config.binderLbsUsedTT + '.BLU_UNIT'] = function (tid, tblIdx) {
    var number = getCfValue(config.binderLbsUsedTT + '.BLU_UNIT', tid, tblIdx) +
        getCfValue(config.binderLbsUsedTT + '.BLU_USED', tid, tblIdx);
    setCfValue(config.dynTT + '.BLU_USED_UNIT', number, tid, tblIdx);
};
dynCalculations[config.binderLbsUsedTT + '.BLU_USED'] = dynCalculations[config.binderLbsUsedTT + '.BLU_UNIT'];

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
dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_CONSUMABLES'] = function () {
    var number = getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_CONSUMABLES') -
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES');
    setCfValue(config.dynTT + '.RT_PREV_CONSUMABLES', number);

    number = (getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_CONSUMABLES') + getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_BINDER')) -
        (getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL'));
    setCfValue(config.dynTT + '.PREV', number);

    dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES']();
};
dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_BINDER'] = function () {
    var number = getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_BINDER') -
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL');
    setCfValue(config.dynTT + '.RT_PREV_BINDER', number);

    number = (getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_CONSUMABLES') + getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_BINDER')) -
        (getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL'));
    setCfValue(config.dynTT + '.PREV', number);

    dynCalculations[config.rigDailyReportTT + '.RDR_DAILY_TOTAL_CONSUMABLES']();
};

dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_BINDER_LBS'] = function () {
    var number = checkInfinity(getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_BINDER_LBS') /
        getCfValue(config.rigMonthReportTT + '.RMR_TOTAL_TONNAGE_WASTE_HAUL'));
    setCfValue(config.rigMonthReportTT + '.RMR_LBS__TONS', number);
};

dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_EQUIPMENT'] = function () {
    var number = getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_EQUIPMENT') + getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_TECHNICIANS');
    setCfValue(config.dynTT + '.RT_TOTAL_EQTECH', number);

    number -= getCfValue(config.dynTT + '.RT_DAILY_EQTECH');
    setCfValue(config.dynTT + '.RT_PREV_EQTECH', number);
};
dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_TECHNICIANS'] = dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_EQUIPMENT'];

dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_WASTE_HAUL'] = function () {
    var number = getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_WASTE_HAUL') -
        getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL');
    setCfValue(config.dynTT + '.RT_PREV_WHLOFF', number);
};

dynCalculations[config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_RUNNING_TOTAL'] = function () {
    var number = getCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_RUNNING_TOTAL') -
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
    var number = getCfValue(config.dynTT + '.RT_PREV_WHLOFF') + getCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL_WASTE_HAUL');
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
    setCfValue(config.rigMonthReportTT + '.RMR_TOTAL_EST_COST__FT', number);
};
//

// Field validators
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
//

function checkInfinity(number) {
    return number === Number.POSITIVE_INFINITY || number === Number.NEGATIVE_INFINITY ? 0 : number;
}

function findCf(name, tid, tblIdx) {
    var cfs = $('[data-cf="' + name + '"]');
    if (typeof tid !== 'undefined' && typeof tblIdx !== 'undefined') {
        cfs = cfs.filter(function () {
            var cf = $(this);
            return (typeof cf.data('tidx') === 'undefined' || cf.data('tidx') === tblIdx) && cf.closest('tr').data('tid_' + tblIdx) === tid;
        });
    }
    return cfs;
}

function getCfValue(name, tid, tblIdx) {
    var cfs = findCf(name, tid, tblIdx);

    if (cfs.length === 0) {
        return null;
    } else if (cfs.length > 1) {
        cfs = cfs.first();
    }

    var dataType = cfs.data('t');
    var value = cfs[0].innerText.trim();
    return dataType === 'number' ? parseFloat(value) : value;
}

function setCfValue(name, value, tid, tblIdx) {
    var cfs = findCf(name, tid, tblIdx);

    var dataType = cfs.data('t');
    if (dataType === 'number') {
        if (typeof value !== 'number') {
            value = parseFloat(value);
        }
        value = value.toFixed(2);
        if (value % 1 === 0) {
            value = parseInt(value);
        }

        if (isNaN(value)) {
            value = '0';
        }
    }

    var editDiv = cfs.find('div[contenteditable]');
    if (editDiv.length !== 0) {
        editDiv.empty().text(value);
        editDiv.trigger('change');
    } else {
        cfs.empty().text(value).trigger('change');
    }
}

function saveTid(ttName, tid, isSingle) {
    if (isSingle) {
        tids[ttName] = tid;
    } else {
        if (tids.hasOwnProperty(ttName)) {
            tids[ttName].push(tid);
        } else {
            tids[ttName] = [tid];
        }
    }
}

function getConfigFields(ttName, parent, tblIdx, prependTtName) {
    var cfs = {};
    $('[data-cf^="' + ttName + '."]' + (typeof tblIdx !== 'undefined' ? '[data-tIdx="' + tblIdx + '"]' : ''), parent).each(function (idx, elem) {
        var obj = $(elem);
        var shortCfName = obj.data('cf').split('.').splice(1).join('.');
        var cfName = (prependTtName ? obj.data('cf') : shortCfName);

        if (!cfs[cfName]) {
            cfs[cfName] = [];
        }

        cfs[cfName].push({
            'tt': ttName,
            'name': shortCfName,
            'obj': obj,
            'tIdx': tblIdx,
            'orig_data': obj.data('orig_data'),
            'reload': obj.data('reload') + '' === 'true',
            'forceSubmit': obj.data('submit') + '' === 'true',
            'required': obj.data('required') + '' === 'true',
            'lockable': obj.data('lockable') + '' === 'true', 'type': obj.data('t'),
            'editable': obj.data('ed') + '' === 'true' || typeof obj.data('ed') === 'undefined',
            'editable_style': obj.data('ed-style')
        });
    });
    return cfs;
}

function isCfLocked(cf) {
    if (!cf.lockable) {
        return false;
    }

    var tr = cf.obj.closest('tr');
    var tblIdx = cf.tIdx !== undefined ? cf.tIdx : configTblIdxs[cf.tt];
    var tid = tr.hasClass('subtable') ? tr.data('tid_' + tblIdx) : undefined;

    if (!$.isArray(locks[cf.tt])) {
        return false;
    }

    var lockVal = $.isArray(locks[cf.tt][tid]) ? locks[cf.tt][tid][cf.name] : undefined;
    return lockVal !== undefined ? lockVal : false;
}

function fillCf(cf, value) {
    if (cf.type === 'number') {
        value = parseFloat(value).toFixed(2);
        if (value % 1 === 0) {
            value = parseInt(value);
        }

        if (isNaN(value)) {
            value = 0;
        }

        cf.obj.text(value);
    } else if (cf.type === 'memo') {
        cf.obj.html(value !== null ? value.replace("\n", '<br>') : '');
    } else {
        cf.obj.text(value);
    }

    var subscribeObj = cf.obj;
    if (cf.editable) {
        var isLocked = isCfLocked(cf);
        var div = $('<div contenteditable="' + (isLocked ? 'false' : 'true') + '"></div>');
        subscribeObj = div;

        div.html(cf.obj.html());

        if (cf.editable_style) {
            div.attr('style', cf.editable_style);
        }

        if (isLocked) {
            div.tooltip({
                items: 'div',
                content: 'Locked'
            });
            cf.obj.empty().append(div);
        } else {
            cf.obj.empty().append(div);

            // Init editable
            div.on('blur keyup paste', function () {
                if (!isReportEdited && cf.orig_data !== div.text()) {
                    isReportEdited = true;

                    $(window).on('beforeunload', function () {
                        return loseDataMessage;
                    });
                }

                var triggerChange = true;
                if (div.text().trim().length === 0) {
                    if (cf.type === 'number') {
                        div.text('0');
                    } else if (cf.required) {
                        cf.obj.addClass('required_error');
                        triggerChange = false;
                    }
                } else {
                    cf.obj.removeClass('required_error');
                }

                if (triggerChange) {
                    div.trigger('change');
                }
            });

            if (cf.type !== 'memo') {
                div.keypress(function (e) {
                    // Prevent to create new lines
                    return e.which !== 13;
                });
            }

            switch (cf.type) {
                case 'number': {
                    // Deny input not number chars
                    // http://stackoverflow.com/a/995193
                    div.keydown(function (e) {
                        // Allow: backspace, delete, tab, escape, enter and .
                        if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
                            // Allow: Ctrl+A, Command+A
                            (e.keyCode === 65 && (e.ctrlKey === true || e.metaKey === true)) ||
                            // Allow: home, end, left, right, down, up
                            (e.keyCode >= 35 && e.keyCode <= 40)) {
                            // let it happen, don't do anything
                            return;
                        }
                        // Ensure that it is a number and stop the keypress
                        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
                            e.preventDefault();
                        }
                    });
                    if (value === null || value === '') {
                        div.text('0');
                    }
                    break;
                }
                case 'memo': {
                    cf.obj.css('vertical-align', 'middle');
                    break;
                }
                case 'date': {
                    var input = $('<input />');
                    input
                        .attr('type', 'hidden')
                        .datepicker({
                            dateFormat: 'mm/dd/yy',
                            onSelect: function (dateText) {
                                div.empty().text(dateText);
                            }
                        });
                    input.insertAfter(div);
                    div.prop('contenteditable', false).text(fromRemoteDate(div.text()));
                    cf.obj.unbind('click').click(function () {
                        input.datepicker('show');
                    });
                    break;
                }
            }
        }

        cf.obj.data('orig_data', div.text());
    }

    // Subscribe events
    if (dynCalculations.hasOwnProperty(cf.tt + '.' + cf.name)) {
        subscribeObj.change(function () {
            var tr = cf.obj.closest('tr');
            var tblIdx = cf.tIdx !== undefined ? cf.tIdx : configTblIdxs[cf.tt];
            var tid = tr.hasClass('subtable') ? tr.data('tid_' + tblIdx) : undefined;
            dynCalculations[cf.tt + '.' + cf.name](tid, tblIdx);
        }).trigger('change');
    }
}

function subscribeChangeDynCfs() {
    var cfs = getConfigFields(config.dynTT);
    $.each(cfs, function (cfName, cfArr) {
        $.each(cfArr, function (idx, cf) {
            if (dynCalculations.hasOwnProperty(cf.tt + '.' + cf.name)) {
                cf.obj.change(function () {
                    var tr = cf.obj.closest('tr');
                    var tblIdx = cf.tIdx !== undefined ? cf.tIdx : configTblIdxs[cf.tt];
                    var tid = tr.hasClass('subtable') ? tr.data('tid_' + tblIdx) : undefined;
                    dynCalculations[cf.tt + '.' + cf.name](tid, tblIdx);
                }).trigger('change');
            }
        });
    });
}

function fillCfs(cfs, response) {
    $.each(cfs, function (cfName, cfArr) {
        if (response.hasOwnProperty(cfName)) {
            $.each(cfArr, function (idx, cf) {
                fillCf(cf, response[cfName]);
            });
        }
    });
}

function init() {
    ApiClient.authSuccessCallback = function (un) {
        $('span.loggedin').empty().text(un);
    };

    var selectReportDialog = initSelectReportDialog();
    startSelectReport(selectReportDialog);

    $('#submitReportData').button().click(function () {
        startSubmitReport();
    });

    var changeReport = function () {
        tids = {};

        isReportEdited = false;
        $(window).off('beforeunload');

        // Clear content
        $('tr.subtable:not(.baseRow):not(.staticRow)').remove();
        $('tr.subtable.baseRow, tr.subtable.staticRow').removeClass(function (index, classNames) {
            var classes = classNames.split(' ');
            var result = [];
            $.each(classes, function (idx, className) {
                if (className.indexOf('subtable') === 0) {
                    result.push(className);
                }
            });
            return result.join(' ');
        }).each(function (idx, elem) {
            var tr = $(elem);
            $.each(tr.data(), function (key) {
                if (key.indexOf('tid_') === 0) {
                    tr.removeData(key);
                }
            })
        });
        $('[data-cf]').empty();
        $('#content').hide();

        ArrowNavigation.currentRow = 2;
        ArrowNavigation.currentCell = 1;
        ArrowNavigation.updateCell();

        selectReportLoadPage(selectReportDialog, 1);
    };
    $('#changeReport').button().click(function () {
        if (isReportEdited) {
            confirmDialog(loseDataMessage, changeReport);
        } else {
            changeReport();
        }
    });
    $('#print').button({
        icon: 'ui-icon-print'
    }).click(function () {
        window.print();
    });
}

function isEmptyRange(colStartIdx, colEndIdx, row) {
    var count = colEndIdx - colStartIdx;
    var result = false;
    row.children('td').each(function (idx, elem) {
        if (idx + 1 >= count) {
            result = $(elem).hasClass('emptycols') && parseInt($(elem).attr('colspan')) === count;
            return false;
        }
    });
    return result;
}

function copyRange(colStartIdx, colEndIdx, fromRow, toRow) {
    var insertAfter = deleteRange(colStartIdx, colEndIdx, toRow);
    var count = 0;
    var tds = [];

    fromRow.children('td').each(function (idx, elem) {
        var td = $(elem);
        if (td.is('[colspan]')) {
            count += parseInt(td.attr('colspan'));
        } else {
            count++;
        }

        if (count >= colStartIdx && count <= colEndIdx) {
            tds.push(td);
        }
    });
    $.each(tds.reverse(), function (idx, td) {
        td.clone().insertAfter(insertAfter);
    });
}

function deleteRange(colStartIdx, colEndIdx, row) {
    var count = 0;
    var startTd = null;
    row.children('td').each(function (idx, elem) {
        var td = $(elem);
        if (td.is('[colspan]')) {
            count += parseInt(td.attr('colspan'));
        } else {
            count++;
        }

        if (startTd === null && count >= colStartIdx) {
            startTd = td.prev();
        }
        if (count >= colStartIdx && count <= colEndIdx) {
            td.remove();
        }
    });
    return startTd;
}

function colsCount(row) {
    var result = 0;
    row.children('td').each(function (idx, elem) {
        if ($(elem).is('[colspan]')) {
            result += parseInt($(elem).attr('colspan'));
        } else {
            result++;
        }
    });
    return result;
}

function appendSubtableRow(tblIdx, colStartIdx, colEndIdx, baseRow, tid) {
    var row = baseRow;
    var prevRow = baseRow;
    while (row.length !== 0 && row.hasClass('subtable') && row.hasClass('subtable_' + tblIdx) && !isEmptyRange(colStartIdx, colEndIdx, row)) {
        prevRow = row;
        row = row.next('tr.subtable, tr.staticRow');
    }

    if (row.length === 0) {
        // Clone baseRow
        row = baseRow.clone();

        // Fill outside ranges with empty white space
        var newTd = function (colspan) {
            return $('<td></td>').addClass('xl97 emptycols')
                .attr('colspan', colspan)
                .css('border-right', '1.0pt solid black')
                .css('border-left', '1.0pt solid black')
                .css('border-bottom', '1.0pt solid black')
                .css('border-top', '1.0pt solid black');
        };

        if (colStartIdx > 2) {
            // We have range before colStartIdx
            deleteRange(2, colStartIdx - 1, row);
            newTd(colStartIdx - 2).insertAfter(row.find('td:first'));
        }

        var lastColIdx = colsCount(row);
        if (colEndIdx < lastColIdx - 1) {
            // We have range after colEndIdx
            deleteRange(colEndIdx + 1, lastColIdx, row);
            row.append(newTd(lastColIdx - colEndIdx));
        }

        row.removeClass('baseRow').insertAfter(prevRow);
    } else if (row !== baseRow && !row.hasClass('staticRow')) {
        // Copy cols from baseRow
        copyRange(colStartIdx, colEndIdx, baseRow, row);
        row.addClass('subtable_' + tblIdx);
    } else {
        row.addClass('subtable subtable_' + tblIdx);
    }

    if (tid) {
        row.data('tid_' + tblIdx, tid);
    }

    ArrowNavigation.initCells(row.find('td'));
    return row;
}

function toRemoteDate(dateStr) {
    if (dateStr === null || dateStr.length === 0) {
        return null;
    }

    var parts = dateStr.split('/');
    return $.datepicker.formatDate('yy-mm-dd', new Date(parts[2], parts[0] - 1, parts[1]));
}

function fromRemoteDate(dateStr) {
    if (dateStr === null || dateStr.length === 0) {
        return '';
    }

    var parts = dateStr.split('-');
    return $.datepicker.formatDate('mm/dd/yy', new Date(parts[0], parts[1] - 1, parts[2]));
}

function convertEditableCfsToDataObject(cfs, tid, tblIdx) {
    var result = {};
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            if (cf.editable && !isCfLocked(cf)) {
                var val = cf.obj.children('div[contenteditable]')[0].innerText;
                if (cf.required && val.length === 0) {
                    var focusObj = cf.obj.addClass('required_error').children('div[contenteditable]');
                    throw new RequiredFieldsNotPresentException(focusObj);
                }

                if (typeof fieldValidators[cf.tt + '.' + cf.name] === 'function') {
                    fieldValidators[cf.tt + '.' + cf.name](tid, tblIdx);
                }

                if (cf.orig_data !== val) {
                    if (cf.type === 'date') {
                        // Reformat date
                        val = toRemoteDate(val);
                    }

                    result[cf.name] = val;
                }
            } else if (cf.forceSubmit) {
                result[cf.name] = cf.obj.text();
            }
        });
    });
    return result;
}

function startSubmitReport() {
    var requestQueue = [];
    var makeRequests = function (tid, data, cfs) {
        if (Object.keys(data).length === 0) {
            return;
        }

        requestQueue.push({
            type: 'PUT',
            contentType: 'application/json',
            url: '/api/v3/trackors/' + encodeURIComponent(tid),
            data: JSON.stringify(data),
            dataType: 'json',
            processData: false,
            successCode: 200,
            success: function () {
                var fields = [];
                $.each(cfs, function (idx, cfObj) {
                    $.each(cfObj, function (idx, cf) {
                        if (cf.reload) {
                            fields.push(cf.name);
                        }
                    });
                });

                if (fields.length !== 0) {
                    requestQueue.push({
                        type: 'GET',
                        contentType: 'application/json',
                        url: '/api/v3/trackors/' + encodeURIComponent(tid) + '?fields=' + encodeURIComponent(fields.join(',')),
                        successCode: 200,
                        success: function (response) {
                            fillCfs(cfs, response);
                        }
                    });
                }
            }
        });
    };

    try {
        $.each(tids, function (ttName, tidObj) {
            if (ttName === config.dynTT) {
                return;
            }

            if (typeof tidObj === 'object') {
                // Find subtable objects
                $.each(tidObj, function (idx, tid) {
                    var isTblIdxObject = typeof configTblIdxs[ttName] === 'object';
                    $.each(isTblIdxObject ? configTblIdxs[ttName] : [configTblIdxs[ttName]], function (idx, tblIdx) {
                        var parent = $('tr.subtable.subtable_' + tblIdx).filter(function () {
                            return $(this).data('tid_' + tblIdx) === tid;
                        });
                        if (parent.length !== 0) {
                            var cfs = getConfigFields(ttName, parent, isTblIdxObject ? tblIdx : undefined);
                            var data = convertEditableCfsToDataObject(cfs, tid, isTblIdxObject ? tblIdx : undefined);
                            makeRequests(tid, data, cfs);
                        }
                    });
                });
            } else {
                var cfs = getConfigFields(ttName);
                var data = convertEditableCfsToDataObject(cfs);
                makeRequests(tidObj, data, cfs);
            }
        });
    } catch (e) {
        if (e instanceof RequiredFieldsNotPresentException || e instanceof FieldValidateFailedException) {
            ArrowNavigation.setActiveCellRowTo(e.focusObj.closest('td'));
            e.focusObj.focus().tooltip({
                items: 'div',
                content: e.message,
                open: function (event, ui) {
                    $(ui.tooltip).mousemove(function () {
                        e.focusObj.tooltip('close');
                    });
                },
                close: function () {
                    e.focusObj.tooltip('destroy');
                }
            }).trigger('mouseover');
            return;
        } else {
            throw e;
        }
    }

    if (requestQueue.length !== 0) {
        ApiClient.startRequestQueueWork(requestQueue, requestQueue.length, 'Submitting report data...', function () {
            isReportEdited = false;
            // TODO: When submit completed, we should update orig_data values
        });
    } else {
        alertDialog('Nothing to submit');
    }
}

function loadReport(tid) {
    saveTid(config.rigDailyReportTT, tid, true);

    var requestQueue = [];
    var key;
    var rigSiteKey;
    var clientKey;
    var managerKey;
    var contractorKey;
    var projectKey;

    // rigDaily
    var rigDailyCfs = getConfigFields(config.rigDailyReportTT);
    var rigMonthCfs = getConfigFields(config.rigMonthReportTT, undefined, undefined, true);
    var rigYearCfs = getConfigFields(config.rigYearReportTT, undefined, undefined, true);
    var fields = [
        'TRACKOR_KEY',
        config.rigSiteTT + '.TRACKOR_KEY',
        config.projectTT + '.TRACKOR_KEY'
    ];
    fields = fields.concat(Object.keys(rigDailyCfs));
    fields = fields.concat(Object.keys(rigMonthCfs));
    fields = fields.concat(Object.keys(rigYearCfs));

    requestQueue.push({
        url: '/api/v3/trackors/' + tid + '?fields=' + encodeURIComponent(fields.join(',')),
        successCode: 200,
        success: function (response) {
            key = response['TRACKOR_KEY'];
            rigSiteKey = response[config.rigSiteTT + '.TRACKOR_KEY'];
            projectKey = response[config.projectTT + '.TRACKOR_KEY'];

            fillCfs(rigDailyCfs, response);
            fillCfs(rigMonthCfs, response);
            fillCfs(rigYearCfs, response);

            dynCalculations[config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH']();
            dynCalculations[config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH']();

            pushRigSiteLoad();
            pushOtherLoad();
            pushProjectManagementLoad();
        }
    });

    // projectManagement
    var pushProjectManagementLoad = function () {
        var contactInformationProjectManagementBaseRow = $('tr.contactInformationProjectManagementBaseRow').first();
        var contactInformationProjectManagementBaseRowCfs = getConfigFields(config.projectManagementTT, contactInformationProjectManagementBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(contactInformationProjectManagementBaseRowCfs);
                return '/api/v3/trackor_types/' + config.projectManagementTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.projectTT + '.TRACKOR_KEY=' + encodeURIComponent(projectKey);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(config.projectManagementTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.projectManagementTT], 1, 6, contactInformationProjectManagementBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.projectManagementTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        });
    };

    // rigSite
    var pushRigSiteLoad = function () {
        var rigSiteCfs = getConfigFields(config.rigSiteTT);
        requestQueue.push({
            url: function () {
                var fields = [
                    'RS_CLIENT',
                    'RS_RIG_MANAGER',
                    'RS_RIG_CONTRACTOR'
                ];
                fields = fields.concat(Object.keys(rigSiteCfs));

                return '/api/v3/trackor_types/' + config.rigSiteTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&TRACKOR_KEY=' + encodeURIComponent(rigSiteKey);
            },
            successCode: 200,
            success: function (response) {
                response = response[0];
                clientKey = response['RS_CLIENT'];
                managerKey = response['RS_RIG_MANAGER'];
                contractorKey = response['RS_RIG_CONTRACTOR'];
                fillCfs(rigSiteCfs, response);

                pushClientLoad();
                pushManagerLoad();
                pushContractorLoad();
            }
        });
    };

    // client
    var pushClientLoad = function () {
        var clientsCfs = getConfigFields(config.clientsTT);
        requestQueue.push({
            url: function () {
                var fields = Object.keys(clientsCfs);

                return '/api/v3/trackor_types/' + config.clientsTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&TRACKOR_KEY=' + encodeURIComponent(clientKey);
            },
            successCode: 200,
            success: function (response) {
                response = response[0];
                fillCfs(clientsCfs, response);
            }
        });
    };

    // manager
    var pushManagerLoad = function () {
        var workersCfs = getConfigFields(config.workersTT);
        requestQueue.push({
            url: function () {
                var fields = Object.keys(workersCfs);
                return '/api/v3/trackor_types/' + config.workersTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&TRACKOR_KEY=' + encodeURIComponent(managerKey);
            },
            successCode: 200,
            success: function (response) {
                response = response[0];
                fillCfs(workersCfs, response);
            }
        });
    };

    // contractor
    var pushContractorLoad = function () {
        var contractorCfs = getConfigFields(config.contractorsTT);
        requestQueue.push({
            url: function () {
                var fields = Object.keys(contractorCfs);
                return '/api/v3/trackor_types/' + config.contractorsTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&TRACKOR_KEY=' + encodeURIComponent(contractorKey);
            },
            successCode: 200,
            success: function (response) {
                response = response[0];
                fillCfs(contractorCfs, response);
            }
        });
    };

    var pushOtherLoad = function () {
        // holeDesignAndVolume
        var holeDesignAndVolumeBaseRow = $('tr.holeDesignAndVolumeBaseRow');
        var holeDesignAndVolumeCfs = getConfigFields(config.holeDesignAndVolumeTT, holeDesignAndVolumeBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(holeDesignAndVolumeCfs);
                return '/api/v3/trackor_types/' + config.holeDesignAndVolumeTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(config.holeDesignAndVolumeTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.holeDesignAndVolumeTT], 2, 6, holeDesignAndVolumeBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.holeDesignAndVolumeTT, row);
                    fillCfs(rowCfs, elem);
                });

                dynCalculations[config.holeDesignAndVolumeTT + '.HDV_HOLE'](undefined, configTblIdxs[config.holeDesignAndVolumeTT]);
            }
        });

        // labTesting
        var labTestingBaseRow = $('tr.labTestingBaseRow');
        var labTestingBaseRowCfs = getConfigFields(config.labTestingTT, labTestingBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(labTestingBaseRowCfs);
                return '/api/v3/trackor_types/' + config.labTestingTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(config.labTestingTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.labTestingTT], 7, 11, labTestingBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.labTestingTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        });

        // apiScreenSize
        var apiScreenSizeBaseRow = $('tr.apiScreenSizeBaseRow');
        var apiScreenSizeBaseRowCfs = getConfigFields(config.apiScreenSizeTT, apiScreenSizeBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(apiScreenSizeBaseRowCfs);
                return '/api/v3/trackor_types/' + config.apiScreenSizeTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                var startIdx = 7;
                var endIdx = 11;

                $.each(response.splice(0, 3), function (idx, elem) {
                    saveTid(config.apiScreenSizeTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.apiScreenSizeTT], startIdx, endIdx, apiScreenSizeBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.apiScreenSizeTT, row);
                    fillCfs(rowCfs, elem);

                    if (startIdx === 7) {
                        startIdx = 6;
                        endIdx = 10;
                    }
                });
            }
        });

        // fieldTesting
        var fieldTestingBaseRow = $('tr.fieldTestingBaseRow');
        var fieldTestingBaseRowCfs = getConfigFields(config.fieldTestingTT, fieldTestingBaseRow, configTblIdxs[config.fieldTestingTT][0]);

        requestQueue.push({
            url: function () {
                var fields = [
                    'FT_SHIFT'
                ];
                fields = fields.concat(Object.keys(fieldTestingBaseRowCfs));

                return '/api/v3/trackor_types/' + config.fieldTestingTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                var groups = {};

                // Group by FT_TESTING_NAME
                $.each(response, function (idx, elem) {
                    if (elem['FT_SHIFT'].length === 0) {
                        return true;
                    }

                    saveTid(config.fieldTestingTT, elem['TRACKOR_ID'], false);
                    if (typeof groups[elem['FT_TESTING_NAME']] === 'undefined') {
                        groups[elem['FT_TESTING_NAME']] = [];
                    }
                    groups[elem['FT_TESTING_NAME']].push(elem);
                });

                // Sort by FT_SHIFT
                $.each(groups, function (groupName, elem) {
                    var sortedGroup = elem.sort(function (a, b) {
                        return a['FT_SHIFT'].localeCompare(b['FT_SHIFT']);
                    });

                    var grepAM = $.grep(sortedGroup, function (elem) {
                        return elem['FT_SHIFT'] === 'AM';
                    });
                    var grepPM = $.grep(sortedGroup, function (elem) {
                        return elem['FT_SHIFT'] === 'PM';
                    });
                    if (grepAM.length === 0) {
                        sortedGroup.unshift({
                            'FT_TESTING_NAME': groupName,
                            'FT_SHIFT': 'AM'
                        });
                    }
                    if (grepPM.length === 0) {
                        sortedGroup.push({
                            'FT_SHIFT': 'PM'
                        });
                    }

                    $.each(sortedGroup, function (idx, elem) {
                        var tblIdxIdx = elem['FT_SHIFT'] === 'AM' ? 0 : 1;
                        var startIdx = tblIdxIdx === 0 ? 4 : 8;
                        var endIdx = tblIdxIdx === 0 ? 7 : 11;

                        var row = appendSubtableRow(configTblIdxs[config.fieldTestingTT][tblIdxIdx],
                            startIdx, endIdx, fieldTestingBaseRow, elem['TRACKOR_ID']);
                        var rowCfs = getConfigFields(config.fieldTestingTT, row, configTblIdxs[config.fieldTestingTT][tblIdxIdx]);
                        fillCfs(rowCfs, elem);
                    });
                });
            }
        });

        // retorts
        var retortsBaseRow = $('tr.retortsBaseRow');
        var retortsBaseRowCfs = getConfigFields(config.retortsTT, retortsBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(retortsBaseRowCfs);
                return '/api/v3/trackor_types/' + config.retortsTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response, function (idx, elem) {
                    saveTid(config.retortsTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.retortsTT], 4, 11, retortsBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.retortsTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        });

        // wasteHaulOffUsage
        var wasteHaulOffUsageBaseRow = $('tr.wasteHaulOffUsageBaseRow');
        var wasteHaulOffUsageBaseRowCfs = getConfigFields(config.wasteHaulOffUsageTT, wasteHaulOffUsageBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(wasteHaulOffUsageBaseRowCfs);
                return '/api/v3/trackor_types/' + config.wasteHaulOffUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response, function (idx, elem) {
                    saveTid(config.wasteHaulOffUsageTT, elem['TRACKOR_ID'], false);

                    var tblIdxIdx;
                    var startIdx;
                    var endIdx;

                    if (idx >= 0 && idx <= 6) {
                        tblIdxIdx = 0;
                        startIdx = 4;
                        endIdx = 5;
                    } else if (idx >= 7 && idx <= 14) {
                        tblIdxIdx = 1;
                        startIdx = 6;
                        endIdx = 7;
                    } else {
                        tblIdxIdx = 2;
                        startIdx = 8;
                        endIdx = 9;
                    }

                    var row = appendSubtableRow(configTblIdxs[config.wasteHaulOffUsageTT][tblIdxIdx], startIdx, endIdx,
                        wasteHaulOffUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.wasteHaulOffUsageTT, row, configTblIdxs[config.wasteHaulOffUsageTT][tblIdxIdx]);
                    fillCfs(rowCfs, elem);
                });

                dynCalculations[config.wasteHaulOffUsageTT + '.WHOU_TONS']();
            }
        });

        // consumablesUsageTT
        var consumablesUsageBaseRow = $('tr.consumablesUsageBaseRow');
        var consumablesUsageBaseRowCfs = getConfigFields(config.consumablesUsageTT, consumablesUsageBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(consumablesUsageBaseRowCfs);
                return '/api/v3/trackor_types/' + config.consumablesUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response, function (idx, elem) {
                    saveTid(config.consumablesUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.consumablesUsageTT], 1, 10, consumablesUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.consumablesUsageTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        });

        // binderUsageTT
        var binderUsageBaseRow = $('tr.binderUsageBaseRow');
        var binderUsageBaseRowCfs = getConfigFields(config.binderUsageTT, binderUsageBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(binderUsageBaseRowCfs);
                return '/api/v3/trackor_types/' + config.binderUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response, function (idx, elem) {
                    saveTid(config.binderUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.binderUsageTT], 1, 10, binderUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.binderUsageTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        });

        // binderUsageTT
        // binderLbsUsedTT
        var binderLbsUsedBaseRow = $('tr.binderLbsUsedBaseRow');
        var binderLbsUsedBaseRowCfs = getConfigFields(config.binderLbsUsedTT, binderLbsUsedBaseRow.parent(), configTblIdxs[config.binderLbsUsedTT][0]);
        var binderLbsUsedUnitBaseRow = $('tr.binderLbsUsedUnitBaseRow');
        var binderLbsUsedUnitBaseRowCfs = getConfigFields(config.binderLbsUsedTT, binderLbsUsedUnitBaseRow, configTblIdxs[config.binderLbsUsedTT][0]);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(binderLbsUsedBaseRowCfs).concat(Object.keys(binderLbsUsedUnitBaseRowCfs));
                return '/api/v3/trackor_types/' + config.binderLbsUsedTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(config.binderLbsUsedTT, elem['TRACKOR_ID'], false);
                    saveTid(config.dynTT, elem['TRACKOR_ID'], false);

                    var tblIdx = configTblIdxs[config.binderLbsUsedTT][idx];
                    var tdIdxs = 2 + idx;

                    var row1 = appendSubtableRow(tblIdx, tdIdxs, tdIdxs, binderLbsUsedBaseRow, elem['TRACKOR_ID']);
                    var row2 = appendSubtableRow(tblIdx, tdIdxs, tdIdxs, binderLbsUsedUnitBaseRow, elem['TRACKOR_ID']);
                    var row1Cfs = getConfigFields(config.binderLbsUsedTT, row1, tblIdx);
                    var row2Cfs = getConfigFields(config.binderLbsUsedTT, row2, tblIdx);

                    fillCfs(row1Cfs, elem);
                    fillCfs(row2Cfs, elem);
                });
            }
        });

        // equipmentUsageTT
        var equipmentUsageBaseRow = $('tr.equipmentUsageBaseRow');
        var equipmentUsageBaseRowCfs = getConfigFields(config.equipmentUsageTT, equipmentUsageBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(equipmentUsageBaseRowCfs);
                return '/api/v3/trackor_types/' + config.equipmentUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 9), function (idx, elem) {
                    saveTid(config.equipmentUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.equipmentUsageTT], 1, 4, equipmentUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.equipmentUsageTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        });

        // techniciansUsageTT, contactInformation
        var techniciansUsageBaseRow = $('tr.techniciansUsageBaseRow');
        var techniciansUsageBaseRowCfs = getConfigFields(config.techniciansUsageTT, techniciansUsageBaseRow);
        var contactInformationBaseRow = $('tr.contactInformationBaseRow');
        var contactInformationBaseRowCfs = getConfigFields(config.techniciansUsageTT, contactInformationBaseRow);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(techniciansUsageBaseRowCfs).concat(Object.keys(contactInformationBaseRowCfs));
                return '/api/v3/trackor_types/' + config.techniciansUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 3), function (idx, elem) {
                    saveTid(config.techniciansUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.techniciansUsageTT], 1, 4, techniciansUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.techniciansUsageTT, row);
                    fillCfs(rowCfs, elem);

                    row = appendSubtableRow(configTblIdxs[config.techniciansUsageTT], 1, 6, contactInformationBaseRow, elem['TRACKOR_ID']);
                    rowCfs = getConfigFields(config.techniciansUsageTT, row);
                    fillCfs(rowCfs, elem);
                });

                pushSupplyRequestLoad();
            }
        });

        var pushSupplyRequestLoad = function () {
            // supplyRequestTT
            var supplyRequestBaseRow = $('tr.supplyRequestBaseRow').first();
            var supplyRequestBaseRowCfs = getConfigFields(config.supplyRequestTT, supplyRequestBaseRow);

            requestQueue.push({
                url: function () {
                    var fields = Object.keys(supplyRequestBaseRowCfs);
                    return '/api/v3/trackor_types/' + config.supplyRequestTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                        '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
                },
                successCode: 200,
                success: function (response) {
                    $.each(response, function (idx, elem) {
                        saveTid(config.supplyRequestTT, elem['TRACKOR_ID'], false);

                        var row = appendSubtableRow(configTblIdxs[config.supplyRequestTT], 7, 11, supplyRequestBaseRow, elem['TRACKOR_ID']);
                        var rowCfs = getConfigFields(config.supplyRequestTT, row);
                        fillCfs(rowCfs, elem);
                    });
                }
            });
        };
    };

    ApiClient.startRequestQueueWork(requestQueue, 18, 'Loading report data...', function () {
        ApiClient.concurrentLimit = 1;

        subscribeChangeDynCfs();
        $('#content').show();
    });
}

function selectReportLoadPage(selectReportDialog, page) {
    var fields = [
        'TRACKOR_KEY',
        config.rigSiteTT + '.TRACKOR_KEY',
        'RDR_REPORT_DAY',
        config.rigMonthReportTT + '.RMR_REPORT_MONTH',
        config.rigYearReportTT + '.RYR_REPORT_YEAR'
    ];
    var sort = [
        config.rigSiteTT + '.TRACKOR_KEY:desc',
        config.rigYearReportTT + '.RYR_REPORT_YEAR:desc',
        config.rigMonthReportTT + '.RMR_REPORT_MONTH:desc',
        'RDR_REPORT_DAY:desc'
    ];

    var siteFilter = selectReportDialog.find('select.site');
    var filter = {};

    if (siteFilter.val() !== '') {
        var key = config.rigSiteTT + '.TRACKOR_KEY';
        filter[key] = siteFilter.val();
    }

    ApiClient.doRequest({
        modalLoadingMessage: 'Loading reports...',
        url: '/api/v3/trackor_types/' + config.rigDailyReportTT + '/trackors?fields=' + encodeURIComponent(fields.join(','))
        + '&page=' + page + '&per_page=15&sort=' + encodeURIComponent(sort.join(',')) + '&' + $.param(filter),
        successCode: 200,
        success: function (response) {
            var buttonPrev = selectReportDialog.find('button.reportsPrev');
            var buttonNext = selectReportDialog.find('button.reportsNext');

            buttonPrev.button('option', 'disabled', page === 1);
            buttonPrev.data('page', page - 1);
            buttonNext.button('option', 'disabled', response.length === 0);
            buttonNext.data('page', page + 1);

            var table = selectReportDialog.find('table.reports tbody').empty();
            $.each(response, function (idx, obj) {
                var tid = obj['TRACKOR_ID'];
                var tr = $('<tr></tr>');
                tr.click(function () {
                    $('span.site').empty().text(obj[config.rigSiteTT + '.TRACKOR_KEY']);

                    setCfValue(config.dynTT + '.REPORT_DATE',
                        getRigMonthIndex(obj[config.rigMonthReportTT + '.RMR_REPORT_MONTH']) + '/' +
                        obj['RDR_REPORT_DAY'] + '/' +
                        obj[config.rigYearReportTT + '.RYR_REPORT_YEAR']);

                    selectReportDialog.dialog('close');
                    loadReport(tid);
                });

                $('<td></td>').text(obj[config.rigSiteTT + '.TRACKOR_KEY']).appendTo(tr);
                $('<td></td>').text(obj['RDR_REPORT_DAY']).appendTo(tr);
                $('<td></td>').text(obj[config.rigMonthReportTT + '.RMR_REPORT_MONTH']).appendTo(tr);
                $('<td></td>').text(obj[config.rigYearReportTT + '.RYR_REPORT_YEAR']).appendTo(tr);

                var link = $('<a>Open</a>').attr('href', 'javascript:void(0)');
                $('<td></td>').append(link).appendTo(tr);

                table.append(tr);
            });
            if (response.length === 0) {
                var tr = $('<tr></tr>').addClass('nodata');
                $('<td colspan="5"></td>').text('No reports').appendTo(tr);

                table.append(tr);
            }

            // Selectmenu z-index bug fix
            var siteFilter = selectReportDialog.find('select.site');
            if (siteFilter.is(':ui-selectmenu')) {
                siteFilter.selectmenu('destroy');
            }
            siteFilter.selectmenu();

            selectReportDialog.dialog('open');
        }
    });
}

function startSelectReport(selectReportDialog) {
    var siteFilter = selectReportDialog.find('select.site');

    // Load sites
    var fields = [
        'TRACKOR_KEY'
    ];
    var sort = [
        'TRACKOR_KEY'
    ];

    var appendOpt = function (value, text) {
        $('<option></option>').attr('value', value).text(text).appendTo(siteFilter);
    };

    siteFilter.empty();
    appendOpt('', '-- Any site --');

    ApiClient.doRequest({
        modalLoadingMessage: 'Loading sites...',
        url: '/api/v3/trackor_types/' + config.rigSiteTT + '/trackors?fields=' + encodeURIComponent(fields.join(','))
        + '&sort=' + encodeURIComponent(sort.join(',')),
        successCode: 200,
        success: function (response) {
            $.each(response, function (idx, obj) {
                appendOpt(obj['TRACKOR_KEY'], obj['TRACKOR_KEY']);
            });
            selectReportLoadPage(selectReportDialog, 1);
        }
    });
}

function initSelectReportDialog() {
    var selectReportDialog = $('#selectReportDialog');
    selectReportDialog.dialog({
        width: 'auto',
        height: 'auto',
        modal: true,
        autoOpen: false,
        resizable: false,
        draggable: false,
        closeOnEscape: false,
        open: function (event, ui) {
            $(".ui-dialog-titlebar-close", ui.dialog | ui).hide();
        }
    });

    selectReportDialog.find('select.site').selectmenu().on('selectmenuchange', function () {
        selectReportDialog.dialog('close');
        selectReportLoadPage(selectReportDialog, 1);
    });

    selectReportDialog.find('button.reportsPrev, button.reportsNext').button().click(function () {
        selectReportDialog.dialog('close');
        selectReportLoadPage(selectReportDialog, $(this).data('page'));
    });

    return selectReportDialog;
}

function alertDialog(message, callback, title) {
    if (typeof(title) !== 'string') {
        title = 'Information';
    }

    var div = $('<div></div>');
    div.html(message).dialog({
        title: title,
        resizable: false,
        modal: true,
        buttons: {
            'OK': function () {
                $(this).dialog('close');
            }
        },
        close: function () {
            div.remove();
            if (typeof(callback) === 'function') {
                callback();
            }
        }
    });
}

function confirmDialog(message, callback, title) {
    if (typeof(title) !== 'string') {
        title = 'Confirm';
    }

    var div = $('<div></div>');
    div.html(message).dialog({
        title: title,
        resizable: false,
        modal: true,
        buttons: {
            'OK': function () {
                $(this).dialog('close');
                callback();
            },
            'Cancel': function () {
                $(this).dialog('close');
            }
        },
        close: function () {
            div.remove();
        }
    });
}

// Arrow navigation related
var ArrowNavigation = {
    currentRow: 2,
    currentCell: 1,
    isCtrlPressed: false,

    updateCell: function (direction) {
        $('td.active').removeClass('active').find('div[contenteditable]').blur();

        var rows = $('#content').find('tr');
        if (this.currentRow > rows.length - 1) {
            this.currentRow = rows.length - 1;
        }

        var tableRow = rows.eq(this.currentRow);
        var cellCount = tableRow.children().length;
        if (this.currentCell > cellCount - 1) {
            this.currentCell = cellCount - 1;
        }

        var tableCell = tableRow.children(':eq(' + this.currentCell + ')');
        tableCell.focus();
        tableCell.addClass('active');
    },
    setActiveCellRowTo: function (td) {
        if (td.index() === 0) {
            return;
        }

        var row = $('#content').find('tr').index(td.closest('tr'));
        if (row === 0) {
            return;
        }

        ArrowNavigation.currentRow = row;
        ArrowNavigation.currentCell = td.index();
        ArrowNavigation.updateCell();
    },
    initCells: function (td) {
        td.unbind('mousedown').mousedown(function () {
            ArrowNavigation.setActiveCellRowTo($(this));
        }).unbind('dblclick').dblclick(function () {
            var div = $(this).find('div[contenteditable]:first');
            if (div.length !== 0) {
                div.focus();
            }
        });
    },
    init: function () {
        ArrowNavigation.updateCell();

        this.initCells($('#content').find('td'));

        $(document).keydown(function (e) {
            if (e.which === 17) {
                ArrowNavigation.isCtrlPressed = true;
            }

            var focusedDiv = $('div[contenteditable]:focus');

            if (e.shiftKey || ArrowNavigation.isCtrlPressed ||
                $('#content').is(':hidden') || focusedDiv.length !== 0) {

                if (e.keyCode === 27 && focusedDiv.length !== 0) {
                    focusedDiv.blur();
                }
                return true;
            }

            if (e.keyCode === 37) {
                if (ArrowNavigation.currentCell === 1) {
                    return false;
                }
                ArrowNavigation.currentCell--;
                ArrowNavigation.updateCell('left');
                return false;
            } else if (e.keyCode === 38) {
                if (ArrowNavigation.currentRow === 2) {
                    return false;
                }
                ArrowNavigation.currentRow--;
                ArrowNavigation.updateCell('up');
                return false;
            } else if (e.keyCode === 39) {
                ArrowNavigation.currentCell++;
                ArrowNavigation.updateCell('right');
                return false;
            } else if (e.keyCode === 40 || e.keyCode === 13) {
                ArrowNavigation.currentRow++;
                ArrowNavigation.updateCell('down');
                return false;
            }
        }).keyup(function (e) {
            if (e.which === 17) {
                ArrowNavigation.isCtrlPressed = false;
            } else if (e.which === 8 || e.which === 46) {
                var tableCell = $('td.active');
                tableCell.find('div[contenteditable]:not(:focus)').empty().trigger('blur');
            }
        });
    }
};

$(function () {
    // http://stackoverflow.com/a/24693866
    $.datepicker._findPos = function (obj) {
        var position;
        if (obj.type === 'hidden') {
            obj = $(obj).closest('td');
        }
        position = $(obj).offset();
        return [position.left, position.top];
    };

    ApiClient.init();
    ArrowNavigation.init();
    init();
});
