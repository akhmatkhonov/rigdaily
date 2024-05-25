var trackorTypes = {
    rigDailyReportTT: 'VHMRIGD_Rig_Daily_Report',
    rigSiteTT: 'VHMRIGD_Rig_Site',
    clientsTT: 'VHMRIGD_Clients',
    workersTT: 'VHMRIGD_Workers',
    contractorsTT: 'VHMRIGD_Contractors',
    holeDesignAndVolumeTT: 'VHMRIGD_Hole_Design_And_Volume',
    labTestingTT: 'VHMRIGD_Lab_Testing',
    apiScreenSizeTT: 'VHMRIGD_Api_Screen_Size',
    fieldTestingTT: 'VHMRIGD_Field_Testing',
    retortsTT: 'VHMRIGD_Retorts',
    wasteHaulOffUsageTT: 'VHMRIGD_Waste_Haul_Off_Usage',
    consumablesUsageTT: 'VHMRIGD_Consumables_Usage',
    consumablesTT: 'VHMRIGD_Consumables',
    binderTT: 'VHMRIGD_Binder',
    binderUsageTT: 'VHMRIGD_Binder_Usage',
    equipmentTT: 'VHMRIGD_Equipment',
    equipmentUsageTT: 'VHMRIGD_Equipment_Usage',
    techniciansUsageTT: 'VHMRIGD_Technicians_Usage',
    supplyRequestTT: 'VHMRIGD_Supply_Request',
    projectTT: 'VHMRIGD_Project',
    projectManagementTT: 'VHMRIGD_Project_Management',

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
