function RigDaily() {
    this.client = new ApiClient('https://energy.onevizion.com');
    this.arrowNavigation = new ArrowNavigation();
    this.arrowNavigation.init();

    // http://stackoverflow.com/a/24693866
    $.datepicker._findPos = function (obj) {
        var position;
        if (obj.type === 'hidden') {
            obj = $(obj).closest('td');
        }
        position = $(obj).offset();
        return [position.left, position.top];
    };

    // TODO
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
RigDaily.prototype.startSubmitReport = function () {
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
};
RigDaily.prototype.loadReport = function (tid) {
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
    var fields = [
        'TRACKOR_KEY',
        config.rigSiteTT + '.TRACKOR_KEY',
        config.projectTT + '.TRACKOR_KEY'
    ];
    fields = fields.concat(Object.keys(rigDailyCfs));

    requestQueue.push({
        url: '/api/v3/trackors/' + tid + '?fields=' + encodeURIComponent(fields.join(',')),
        successCode: 200,
        success: function (response) {
            key = response['TRACKOR_KEY'];
            rigSiteKey = response[config.rigSiteTT + '.TRACKOR_KEY'];
            projectKey = response[config.projectTT + '.TRACKOR_KEY'];

            fillCfs(rigDailyCfs, response);

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
                    '&' + config.rigSiteTT + '.TRACKOR_KEY=' + encodeURIComponent(rigSiteKey);
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
                $.each(response.splice(0, 22), function (idx, elem) {
                    saveTid(config.wasteHaulOffUsageTT, elem['TRACKOR_ID'], false);

                    var tblIdxIdx;
                    var startIdx;
                    var endIdx;

                    if (idx >= 0 && idx <= 6) {
                        tblIdxIdx = 0;
                        startIdx = 4;
                        endIdx = 5;
                    } else if (idx >= 7 && idx <= 13) {
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
        var binderLbsUsedBaseRow = $('tr.binderLbsUsedBaseRow');
        var binderLbsUsedBaseRowCfs = getConfigFields(config.binderUsageTT, binderLbsUsedBaseRow.parent(), configTblIdxs[config.binderUsageTT][1]);
        var binderLbsUsedUnitBaseRow = $('tr.binderLbsUsedUnitBaseRow');
        var binderLbsUsedUnitBaseRowCfs = getConfigFields(config.binderUsageTT, binderLbsUsedUnitBaseRow, configTblIdxs[config.binderUsageTT][1]);

        requestQueue.push({
            url: function () {
                var fields = Object.keys(binderUsageBaseRowCfs);
                fields = fields.concat(Object.keys(binderLbsUsedBaseRowCfs));
                fields = fields.concat(Object.keys(binderLbsUsedUnitBaseRowCfs));

                return '/api/v3/trackor_types/' + config.binderUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + config.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(config.binderUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(configTblIdxs[config.binderUsageTT][0], 1, 10, binderUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(config.binderUsageTT, row);
                    fillCfs(rowCfs, elem);

                    // binderLbs
                    var tblIdx = configTblIdxs[config.binderUsageTT].slice(1)[idx];
                    var tdIdxs = 2 + idx;

                    var row1 = appendSubtableRow(tblIdx, tdIdxs, tdIdxs, binderLbsUsedBaseRow, elem['TRACKOR_ID']);
                    var row2 = appendSubtableRow(tblIdx, tdIdxs, tdIdxs, binderLbsUsedUnitBaseRow, elem['TRACKOR_ID']);
                    var row1Cfs = getConfigFields(config.binderUsageTT, row1, tblIdx);
                    var row2Cfs = getConfigFields(config.binderUsageTT, row2, tblIdx);

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
};
RigDaily.prototype.selectReportLoadPage = function (selectReportDialog, page) {
    var fields = [
        'TRACKOR_KEY',
        config.rigSiteTT + '.TRACKOR_KEY',
        'RDR_REPORT_DATE'
    ];
    var sort = [
        config.rigSiteTT + '.TRACKOR_KEY:desc',
        'RDR_REPORT_DATE:desc'
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

                    selectReportDialog.dialog('close');
                    loadReport(tid);
                });

                $('<td></td>').text(obj[config.rigSiteTT + '.TRACKOR_KEY']).appendTo(tr);
                var reportDate = ApiClient.DateUtils.remoteDateToObj(obj['RDR_REPORT_DATE']);
                $('<td></td>').text(reportDate.getUTCDate() + 1).appendTo(tr);
                $('<td></td>').text(ApiClient.DateUtils.objGetMonthName(reportDate)).appendTo(tr);
                $('<td></td>').text(reportDate.getUTCFullYear()).appendTo(tr);

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
};
RigDaily.prototype.startSelectReport = function (selectReportDialog) {
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
};
RigDaily.prototype.initSelectReportDialog = function () {
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
};
RigDaily.prototype.alertDialog = function (message, callback, title) {
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
};
RigDaily.prototype.confirmDialog = function (message, callback, title) {
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
};
