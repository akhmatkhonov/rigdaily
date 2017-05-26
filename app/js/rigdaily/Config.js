var config = {
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
var configTblIdxs = {};
configTblIdxs[config.holeDesignAndVolumeTT] = 'hd';
configTblIdxs[config.labTestingTT] = 'lt';
configTblIdxs[config.apiScreenSizeTT] = 'ass';
configTblIdxs[config.fieldTestingTT] = ['ftam', 'ftpm'];
configTblIdxs[config.retortsTT] = 'rtrs';
configTblIdxs[config.wasteHaulOffUsageTT] = ['whou1', 'whou2', 'whou3'];
configTblIdxs[config.consumablesUsageTT] = 'cu';
configTblIdxs[config.binderUsageTT] = ['bu', 'blu1', 'blu2', 'blu3', 'blu4'];
configTblIdxs[config.equipmentUsageTT] = 'equ';
configTblIdxs[config.techniciansUsageTT] = 'tecu';
configTblIdxs[config.supplyRequestTT] = 'sr';
configTblIdxs[config.projectManagementTT] = 'pm';
