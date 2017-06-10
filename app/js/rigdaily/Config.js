var trackorTypes = {
    rigDailyReportTT: 'Rig_Daily_Report',
    rigSiteTT: 'Rig_Site',
    clientsTT: 'Clients',
    workersTT: 'Workers',
    contractorsTT: 'Contractors',
    holeDesignAndVolumeTT: 'Hole_Design_And_Volume',
    labTestingTT: 'Lab_Testing',
    apiScreenSizeTT: 'Api_Screen_Size',
    fieldTestingTT: 'Field_Testing',
    retortsTT: 'Retorts',
    wasteHaulOffUsageTT: 'Waste_Haul_Off_Usage',
    consumablesUsageTT: 'Consumables_Usage',
    consumablesTT: 'Consumables',
    binderTT: 'Binder',
    binderUsageTT: 'Binder_Usage',
    equipmentTT: 'Equipment',
    equipmentUsageTT: 'Equipment_Usage',
    techniciansUsageTT: 'Technicians_Usage',
    supplyRequestTT: 'Supply_Request',
    projectTT: 'Project',
    projectManagementTT: 'Project_Management',

    // For dynamic calculations
    dynTT: 'Dynamic'
};

var tableIndexes = {};
tableIndexes[trackorTypes.holeDesignAndVolumeTT] = 'hd';
tableIndexes[trackorTypes.labTestingTT] = 'lt';
tableIndexes[trackorTypes.apiScreenSizeTT] = 'ass';
tableIndexes[trackorTypes.fieldTestingTT] = ['ftam', 'ftpm'];
tableIndexes[trackorTypes.retortsTT] = 'rtrs';
tableIndexes[trackorTypes.wasteHaulOffUsageTT] = ['whou1', 'whou2', 'whou3'];
tableIndexes[trackorTypes.consumablesUsageTT] = 'cu';
tableIndexes[trackorTypes.binderUsageTT] = ['bu', 'blu1', 'blu2', 'blu3', 'blu4'];
tableIndexes[trackorTypes.equipmentUsageTT] = 'equ';
tableIndexes[trackorTypes.techniciansUsageTT] = 'tecu';
tableIndexes[trackorTypes.supplyRequestTT] = 'sr';
tableIndexes[trackorTypes.projectManagementTT] = 'pm';

var relations = {};
relations[trackorTypes.wasteHaulOffUsageTT] = function () {
    var obj = {};
    obj[trackorTypes.rigDailyReportTT] = {
        'TRACKOR_KEY': getCfValue(trackorTypes.rigDailyReportTT + '.TRACKOR_KEY')
    };
    return obj;
};
relations[trackorTypes.supplyRequestTT] = function () {
    var obj = {};
    obj[trackorTypes.rigDailyReportTT] = {
        'TRACKOR_KEY': getCfValue(trackorTypes.rigDailyReportTT + '.TRACKOR_KEY')
    };
    return obj;
};
