function RigDaily() {
    this.client = new ApiClient('https://energy.onevizion.com').authSuccess(function (username) {
        $('span.loggedin').empty().text(username);
    });

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

    this.selectReportDialog = this.initSelectReportDialog();
    this.startSelectReport(this.selectReportDialog);

    $('#submitReportData').button().click((function () {
        this.startSubmitReport();
    }).bind(this));

    $('#changeReport').button().click((function () {
        if (isReportEdited) {
            this.confirmDialog(loseDataMessage, this.changeReport);
        } else {
            this.changeReport();
        }
    }).bind(this));
    $('#print').button({
        icon: 'ui-icon-print'
    }).click(function () {
        $('#ui-datepicker-div').hide();
        window.print();
    });
}
RigDaily.prototype.changeReport = function () {
    tids = {};
    locks = {};
    edited = {};
    isReportEdited = false;
    $(window).off('beforeunload', beforeUnloadHandler);

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

    this.arrowNavigation.currentRow = 2;
    this.arrowNavigation.currentCell = 1;
    this.arrowNavigation.updateCell();

    this.selectReportLoadPage(this.selectReportDialog, 1);
};
RigDaily.prototype.startSubmitReport = function () {
    var fullSuccessCallback = (function () {
        isReportEdited = Object.keys(edited).length !== 0;
        $(window).off('beforeunload', beforeUnloadHandler);
    }).bind(this);

    var queue = new ApiClientRequestQueue(this.client, 'Submitting report data...', 0, true, 7, true);
    queue.success(function () {
        if (!queueNewTrackors.isEmpty()) {
            queueNewTrackors.totalRequests = queueNewTrackors.queue.length;
            queueNewTrackors.start();
        } else {
            fullSuccessCallback();
        }
    });
    var queueNewTrackors = new ApiClientRequestQueue(this.client, 'Creating new trackors...', 0, true, 1, true);
    queueNewTrackors.success(fullSuccessCallback);

    var makeReloadFieldsRequest = function (queue, ttName, tid, cfs) {
        var fields = getFieldNamesForReload(cfs);
        if (fields.length !== 0) {
            queue.push(new ApiClientQueueRequestOptions({
                type: 'GET',
                contentType: 'application/json',
                url: '/api/v3/trackors/' + encodeURIComponent(tid) + '?fields=' + encodeURIComponent(fields.join(',')),
                successCode: 200,
                success: function (response) {
                    var fields = getLockableFieldNames(cfs);
                    if (fields.length !== 0) {
                        requestTrackorLocks(queue, ttName, tid, fields, function () {
                            fillCfs(cfs, response);
                        });
                    } else {
                        fillCfs(cfs, response);
                    }
                }
            }));
        }
    };
    var makeRequests = function (tid, ttName, tblIdx, data, cfs) {
        if (Object.keys(data).length === 0) {
            return;
        }

        requestUpdateTrackorById(queue, tid, data, function () {
            updateOriginalCfsData(cfs, data, tid);
            makeReloadFieldsRequest(queue, ttName, tid, cfs);
        });
    };
    var makeCreateRequest = function (tid, ttName, tblIdx, data, cfs) {
        var parents = getTrackorTypeRelations(ttName, tid, tblIdx);
        requestCreateTrackor(queueNewTrackors, ttName, data, parents, function (response) {
            var newTid = response['TRACKOR_ID'];
            updateCfsTid(cfs, tblIdx, tid, newTid);
            updateTtTid(ttName, tid, newTid);

            updateOriginalCfsData(cfs, data, tid);
            makeReloadFieldsRequest(queueNewTrackors, ttName, newTid, cfs);
        });
    };
    var makeDeleteRequest = function (tid, ttName, tblIdx, cfs) {
        requestDeleteTrackor(queue, ttName, tid, function () {
            applyCfsNotChanged(cfs, tid);

            var newTid = generateTrackorId(ttName);
            updateCfsTid(cfs, tblIdx, tid, newTid);
            updateTtTid(ttName, tid, newTid);

            var data = makeEmptyCfsObject(cfs);
            fillCfs(cfs, data);
        });
    };

    try {
        $.each(tids, function (ttName, tidObj) {
            if (ttName === trackorTypes.dynTT) {
                return;
            }

            if (typeof tidObj === 'object') {
                // Find subtable objects
                $.each(tidObj, function (idx, tid) {
                    var isTblIdxObject = typeof tableIndexes[ttName] === 'object';
                    $.each(isTblIdxObject ? tableIndexes[ttName] : [tableIndexes[ttName]], function (idx, tblIdx) {
                        var parent = $('tr.subtable.subtable_' + tblIdx).filter(function () {
                            return $(this).data('tid_' + tblIdx) === tid;
                        });
                        if (parent.length !== 0) {
                            var cfs = getConfigFields(ttName, parent, isTblIdxObject ? tblIdx : undefined);
                            var dataAll = {};
                            var data = convertEditableCfsToDataObject(cfs, tid, isTblIdxObject ? tblIdx : undefined, dataAll);
                            if (!checkCfsFilledForNewTrackorCreate(cfs, dataAll, tid, tblIdx)) {
                                if (tid < 0) {
                                    // New trackor and no field values
                                } else if (tid > 0) {
                                    // Existing trackor and no field values -> delete
                                    makeDeleteRequest(tid, ttName, tblIdx, cfs);
                                }
                            } else if (tid < 0) {
                                makeCreateRequest(tid, ttName, tblIdx, dataAll, cfs);
                            } else {
                                makeRequests(tid, ttName, tblIdx, data, cfs);
                            }
                        }
                    });
                });
            } else {
                var cfs = getConfigFields(ttName);
                var data = convertEditableCfsToDataObject(cfs);
                makeRequests(tidObj, ttName, undefined, data, cfs);
            }
        });
    } catch (e) {
        if (e instanceof RequiredFieldsNotPresentException || e instanceof ValidationFailedException) {
            this.arrowNavigation.setActiveCellRowTo(e.focusObj.closest('td'));
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

    if (!queue.isEmpty()) {
        queue.totalRequests = queue.queue.length;
        queue.start();
    } else {
        this.alertDialog('Nothing to submit');
    }
};

RigDaily.prototype.loadReport = function (tid) {
    var queue = new ApiClientRequestQueue(this.client, 'Loading report data...', 19, true, 7);
    queue.success(function () {
        subscribeChangeDynCfs();
        $('#content').show();
    });

    saveTid(trackorTypes.rigDailyReportTT, tid, true);

    var key;
    var rigSiteKey;
    var clientKey;
    var managerKey;
    var contractorKey;
    var projectKey;

    // rigDaily
    var rigDailyCfs = getConfigFields(trackorTypes.rigDailyReportTT);
    var fields = [
        'TRACKOR_KEY',
        trackorTypes.rigSiteTT + '.TRACKOR_KEY',
        trackorTypes.projectTT + '.TRACKOR_KEY'
    ];
    fields = fields.concat(Object.keys(rigDailyCfs));

    queue.push(new ApiClientQueueRequestOptions({
        url: '/api/v3/trackors/' + tid + '?fields=' + encodeURIComponent(fields.join(',')),
        successCode: 200,
        success: function (response) {
            key = response['TRACKOR_KEY'];
            rigSiteKey = response[trackorTypes.rigSiteTT + '.TRACKOR_KEY'];
            projectKey = response[trackorTypes.projectTT + '.TRACKOR_KEY'];

            fillCfs(rigDailyCfs, response);

            dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH']();
            dynCalculations[trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH']();

            pushRigSiteLoad();
            pushOtherLoad();
            pushProjectManagementLoad();
        }
    }));

    // projectManagement
    var pushProjectManagementLoad = function () {
        var contactInformationProjectManagementBaseRow = $('tr.contactInformationProjectManagementBaseRow').first();
        var contactInformationProjectManagementBaseRowCfs = getConfigFields(trackorTypes.projectManagementTT, contactInformationProjectManagementBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(contactInformationProjectManagementBaseRowCfs);
                return '/api/v3/trackor_types/' + trackorTypes.projectManagementTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.projectTT + '.TRACKOR_KEY=' + encodeURIComponent(projectKey);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(trackorTypes.projectManagementTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(tableIndexes[trackorTypes.projectManagementTT], 1, 6, contactInformationProjectManagementBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(trackorTypes.projectManagementTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        }));
    };

    // rigSite
    var pushRigSiteLoad = function () {
        var rigSiteCfs = getConfigFields(trackorTypes.rigSiteTT);
        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = [
                    'RS_CLIENT',
                    'RS_RIG_MANAGER',
                    'RS_RIG_CONTRACTOR'
                ];
                fields = fields.concat(Object.keys(rigSiteCfs));

                return '/api/v3/trackor_types/' + trackorTypes.rigSiteTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
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
        }));
    };

    // client
    var pushClientLoad = function () {
        var clientsCfs = getConfigFields(trackorTypes.clientsTT);
        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(clientsCfs);

                return '/api/v3/trackor_types/' + trackorTypes.clientsTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&TRACKOR_KEY=' + encodeURIComponent(clientKey);
            },
            successCode: 200,
            success: function (response) {
                response = response[0];
                fillCfs(clientsCfs, response);
            }
        }));
    };

    // manager
    var pushManagerLoad = function () {
        var workersCfs = getConfigFields(trackorTypes.workersTT);
        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(workersCfs);
                return '/api/v3/trackor_types/' + trackorTypes.workersTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&TRACKOR_KEY=' + encodeURIComponent(managerKey);
            },
            successCode: 200,
            success: function (response) {
                response = response[0];
                fillCfs(workersCfs, response);
            }
        }));
    };

    // contractor
    var pushContractorLoad = function () {
        var contractorCfs = getConfigFields(trackorTypes.contractorsTT);
        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(contractorCfs);
                return '/api/v3/trackor_types/' + trackorTypes.contractorsTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&TRACKOR_KEY=' + encodeURIComponent(contractorKey);
            },
            successCode: 200,
            success: function (response) {
                response = response[0];
                fillCfs(contractorCfs, response);
            }
        }));
    };

    var pushOtherLoad = function () {
        // holeDesignAndVolume
        var holeDesignAndVolumeBaseRow = $('tr.holeDesignAndVolumeBaseRow');
        var holeDesignAndVolumeCfs = getConfigFields(trackorTypes.holeDesignAndVolumeTT, holeDesignAndVolumeBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(holeDesignAndVolumeCfs);
                return '/api/v3/trackor_types/' + trackorTypes.holeDesignAndVolumeTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigSiteTT + '.TRACKOR_KEY=' + encodeURIComponent(rigSiteKey);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(trackorTypes.holeDesignAndVolumeTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(tableIndexes[trackorTypes.holeDesignAndVolumeTT], 2, 6, holeDesignAndVolumeBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(trackorTypes.holeDesignAndVolumeTT, row);
                    fillCfs(rowCfs, elem);
                });

                dynCalculations[trackorTypes.holeDesignAndVolumeTT + '.HDV_HOLE'](undefined, tableIndexes[trackorTypes.holeDesignAndVolumeTT]);
            }
        }));

        // labTesting
        var labTestingBaseRow = $('tr.labTestingBaseRow');
        var labTestingBaseRowCfs = getConfigFields(trackorTypes.labTestingTT, labTestingBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(labTestingBaseRowCfs);
                return '/api/v3/trackor_types/' + trackorTypes.labTestingTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                var tids = $.map(response, function (elem) {
                    return elem['TRACKOR_ID'];
                });
                requestTrackorsLocks(queue, tids, trackorTypes.labTestingTT, labTestingBaseRowCfs, function () {
                    $.each(response.splice(0, 4), function (idx, elem) {
                        saveTid(trackorTypes.labTestingTT, elem['TRACKOR_ID'], false);

                        var row = appendSubtableRow(tableIndexes[trackorTypes.labTestingTT], 7, 11, labTestingBaseRow, elem['TRACKOR_ID']);
                        var rowCfs = getConfigFields(trackorTypes.labTestingTT, row);
                        fillCfs(rowCfs, elem);
                    });
                });
            }
        }));

        // apiScreenSize
        var apiScreenSizeBaseRow = $('tr.apiScreenSizeBaseRow');
        var apiScreenSizeBaseRowCfs = getConfigFields(trackorTypes.apiScreenSizeTT, apiScreenSizeBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(apiScreenSizeBaseRowCfs);
                return '/api/v3/trackor_types/' + trackorTypes.apiScreenSizeTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                var tids = $.map(response, function (elem) {
                    return elem['TRACKOR_ID'];
                });
                requestTrackorsLocks(queue, tids, trackorTypes.apiScreenSizeTT, apiScreenSizeBaseRowCfs, function () {
                    var startIdx = 7;
                    var endIdx = 11;

                    $.each(response.splice(0, 3), function (idx, elem) {
                        saveTid(trackorTypes.apiScreenSizeTT, elem['TRACKOR_ID'], false);

                        var row = appendSubtableRow(tableIndexes[trackorTypes.apiScreenSizeTT], startIdx, endIdx, apiScreenSizeBaseRow, elem['TRACKOR_ID']);
                        var rowCfs = getConfigFields(trackorTypes.apiScreenSizeTT, row);
                        fillCfs(rowCfs, elem);

                        if (startIdx === 7) {
                            startIdx = 6;
                            endIdx = 10;
                        }
                    });
                });
            }
        }));

        // fieldTesting
        var fieldTestingBaseRow = $('tr.fieldTestingBaseRow');
        var fieldTestingBaseRowCfs = getConfigFields(trackorTypes.fieldTestingTT, fieldTestingBaseRow, tableIndexes[trackorTypes.fieldTestingTT][0]);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = [
                    'FT_SHIFT'
                ];
                fields = fields.concat(Object.keys(fieldTestingBaseRowCfs));

                return '/api/v3/trackor_types/' + trackorTypes.fieldTestingTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                var tids = $.map(response, function (elem) {
                    return elem['TRACKOR_ID'];
                });
                requestTrackorsLocks(queue, tids, trackorTypes.fieldTestingTT, fieldTestingBaseRowCfs, function () {
                    var groups = {};

                    // Group by FT_TESTING_NAME
                    $.each(response, function (idx, elem) {
                        if (elem['FT_SHIFT'].length === 0) {
                            return true;
                        }

                        saveTid(trackorTypes.fieldTestingTT, elem['TRACKOR_ID'], false);
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

                            var row = appendSubtableRow(tableIndexes[trackorTypes.fieldTestingTT][tblIdxIdx],
                                startIdx, endIdx, fieldTestingBaseRow, elem['TRACKOR_ID']);
                            var rowCfs = getConfigFields(trackorTypes.fieldTestingTT, row, tableIndexes[trackorTypes.fieldTestingTT][tblIdxIdx]);
                            fillCfs(rowCfs, elem);
                        });
                    });
                });
            }
        }));

        // retorts
        var retortsBaseRow = $('tr.retortsBaseRow');
        var retortsBaseRowCfs = getConfigFields(trackorTypes.retortsTT, retortsBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(retortsBaseRowCfs);
                return '/api/v3/trackor_types/' + trackorTypes.retortsTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                var tids = $.map(response, function (elem) {
                    return elem['TRACKOR_ID'];
                });
                requestTrackorsLocks(queue, tids, trackorTypes.retortsTT, retortsBaseRowCfs, function () {
                    $.each(response, function (idx, elem) {
                        saveTid(trackorTypes.retortsTT, elem['TRACKOR_ID'], false);

                        var row = appendSubtableRow(tableIndexes[trackorTypes.retortsTT], 4, 11, retortsBaseRow, elem['TRACKOR_ID']);
                        var rowCfs = getConfigFields(trackorTypes.retortsTT, row);
                        fillCfs(rowCfs, elem);
                    });
                });
            }
        }));

        // wasteHaulOffUsage
        var wasteHaulOffUsageBaseRow = $('tr.wasteHaulOffUsageBaseRow');
        var wasteHaulOffUsageBaseRowCfs = getConfigFields(trackorTypes.wasteHaulOffUsageTT, wasteHaulOffUsageBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(wasteHaulOffUsageBaseRowCfs);
                return '/api/v3/trackor_types/' + trackorTypes.wasteHaulOffUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                fillCellsForNewTrackor(trackorTypes.wasteHaulOffUsageTT, 22, response, function (idx, tid, elem) {
                    saveTid(trackorTypes.wasteHaulOffUsageTT, tid, false);

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

                    var row = appendSubtableRow(tableIndexes[trackorTypes.wasteHaulOffUsageTT][tblIdxIdx], startIdx, endIdx,
                        wasteHaulOffUsageBaseRow, tid);
                    var rowCfs = getConfigFields(trackorTypes.wasteHaulOffUsageTT, row, tableIndexes[trackorTypes.wasteHaulOffUsageTT][tblIdxIdx]);
                    fillCfs(rowCfs, tid < 0 ? makeEmptyCfsObject(rowCfs) : elem);
                });

                dynCalculations[trackorTypes.wasteHaulOffUsageTT + '.WHOU_TONS']();
            }
        }));

        // consumablesUsageTT
        var consumablesUsageBaseRow = $('tr.consumablesUsageBaseRow');
        var consumablesUsageBaseRowCfs = getConfigFields(trackorTypes.consumablesUsageTT, consumablesUsageBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(consumablesUsageBaseRowCfs);
                return '/api/v3/trackor_types/' + trackorTypes.consumablesUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response, function (idx, elem) {
                    saveTid(trackorTypes.consumablesUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(tableIndexes[trackorTypes.consumablesUsageTT], 1, 10, consumablesUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(trackorTypes.consumablesUsageTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        }));

        // binderUsageTT
        var binderUsageBaseRow = $('tr.binderUsageBaseRow');
        var binderUsageBaseRowCfs = getConfigFields(trackorTypes.binderUsageTT, binderUsageBaseRow, tableIndexes[trackorTypes.binderUsageTT][0]);
        var binderLbsUsedBaseRow = $('tr.binderLbsUsedBaseRow');
        var binderLbsUsedBaseRowCfs = getConfigFields(trackorTypes.binderUsageTT, binderLbsUsedBaseRow.parent(), tableIndexes[trackorTypes.binderUsageTT][1]);
        var binderLbsUsedUnitBaseRow = $('tr.binderLbsUsedUnitBaseRow');
        var binderLbsUsedUnitBaseRowCfs = getConfigFields(trackorTypes.binderUsageTT, binderLbsUsedUnitBaseRow, tableIndexes[trackorTypes.binderUsageTT][1]);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(binderUsageBaseRowCfs);
                fields = fields.concat(Object.keys(binderLbsUsedBaseRowCfs));
                fields = fields.concat(Object.keys(binderLbsUsedUnitBaseRowCfs));

                return '/api/v3/trackor_types/' + trackorTypes.binderUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 4), function (idx, elem) {
                    saveTid(trackorTypes.binderUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(tableIndexes[trackorTypes.binderUsageTT][0], 1, 10, binderUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(trackorTypes.binderUsageTT, row, tableIndexes[trackorTypes.binderUsageTT][0]);
                    fillCfs(rowCfs, elem);

                    // binderLbs
                    var tblIdx = tableIndexes[trackorTypes.binderUsageTT].slice(1)[idx];
                    var tdIdxs = 2 + idx;

                    var row1 = appendSubtableRow(tblIdx, tdIdxs, tdIdxs, binderLbsUsedBaseRow, elem['TRACKOR_ID']);
                    var row2 = appendSubtableRow(tblIdx, tdIdxs, tdIdxs, binderLbsUsedUnitBaseRow, elem['TRACKOR_ID']);
                    var row1Cfs = getConfigFields(trackorTypes.binderUsageTT, row1, tblIdx);
                    var row2Cfs = getConfigFields(trackorTypes.binderUsageTT, row2, tblIdx);

                    fillCfs(row1Cfs, elem);
                    fillCfs(row2Cfs, elem);
                });
            }
        }));

        // equipmentUsageTT
        var equipmentUsageBaseRow = $('tr.equipmentUsageBaseRow');
        var equipmentUsageBaseRowCfs = getConfigFields(trackorTypes.equipmentUsageTT, equipmentUsageBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(equipmentUsageBaseRowCfs);
                return '/api/v3/trackor_types/' + trackorTypes.equipmentUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 9), function (idx, elem) {
                    saveTid(trackorTypes.equipmentUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(tableIndexes[trackorTypes.equipmentUsageTT], 1, 4, equipmentUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(trackorTypes.equipmentUsageTT, row);
                    fillCfs(rowCfs, elem);
                });
            }
        }));

        // techniciansUsageTT, contactInformation
        var techniciansUsageBaseRow = $('tr.techniciansUsageBaseRow');
        var techniciansUsageBaseRowCfs = getConfigFields(trackorTypes.techniciansUsageTT, techniciansUsageBaseRow);
        var contactInformationBaseRow = $('tr.contactInformationBaseRow');
        var contactInformationBaseRowCfs = getConfigFields(trackorTypes.techniciansUsageTT, contactInformationBaseRow);

        queue.push(new ApiClientQueueRequestOptions({
            url: function () {
                var fields = Object.keys(techniciansUsageBaseRowCfs).concat(Object.keys(contactInformationBaseRowCfs));
                return '/api/v3/trackor_types/' + trackorTypes.techniciansUsageTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                    '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
            },
            successCode: 200,
            success: function (response) {
                $.each(response.splice(0, 3), function (idx, elem) {
                    saveTid(trackorTypes.techniciansUsageTT, elem['TRACKOR_ID'], false);

                    var row = appendSubtableRow(tableIndexes[trackorTypes.techniciansUsageTT], 1, 4, techniciansUsageBaseRow, elem['TRACKOR_ID']);
                    var rowCfs = getConfigFields(trackorTypes.techniciansUsageTT, row);
                    fillCfs(rowCfs, elem);

                    row = appendSubtableRow(tableIndexes[trackorTypes.techniciansUsageTT], 1, 6, contactInformationBaseRow, elem['TRACKOR_ID']);
                    rowCfs = getConfigFields(trackorTypes.techniciansUsageTT, row);
                    fillCfs(rowCfs, elem);
                });

                pushSupplyRequestLoad();
            }
        }));

        var pushSupplyRequestLoad = function () {
            // supplyRequestTT
            var supplyRequestBaseRow = $('tr.supplyRequestBaseRow').first();
            var supplyRequestBaseRowCfs = getConfigFields(trackorTypes.supplyRequestTT, supplyRequestBaseRow);

            queue.push(new ApiClientQueueRequestOptions({
                url: function () {
                    var fields = Object.keys(supplyRequestBaseRowCfs);
                    return '/api/v3/trackor_types/' + trackorTypes.supplyRequestTT + '/trackors?fields=' + encodeURIComponent(fields.join(',')) +
                        '&' + trackorTypes.rigDailyReportTT + '.TRACKOR_KEY=' + encodeURIComponent(key);
                },
                successCode: 200,
                success: function (response) {
                    var tids = $.map(response, function (elem) {
                        return elem['TRACKOR_ID'];
                    });
                    requestTrackorsLocks(queue, tids, trackorTypes.supplyRequestTT, supplyRequestBaseRowCfs, function () {
                        fillCellsForNewTrackor(trackorTypes.supplyRequestTT, 10, response, function (idx, tid, elem) {
                            saveTid(trackorTypes.supplyRequestTT, tid, false);

                            var row = appendSubtableRow(tableIndexes[trackorTypes.supplyRequestTT], 7, 11, supplyRequestBaseRow, tid);
                            var rowCfs = getConfigFields(trackorTypes.supplyRequestTT, row);
                            fillCfs(rowCfs, tid < 0 ? makeEmptyCfsObject(rowCfs) : elem);
                        });
                    });
                }
            }));
        };
    };

    queue.start();
};
RigDaily.prototype.selectReportLoadPage = function (selectReportDialog, page) {
    var fields = [
        'TRACKOR_KEY',
        trackorTypes.rigSiteTT + '.TRACKOR_KEY',
        trackorTypes.projectTT + '.PR_PROJECT_NAME',
        'RDR_REPORT_DATE'
    ];
    var sort = [
        trackorTypes.rigSiteTT + '.TRACKOR_KEY:desc',
        'RDR_REPORT_DATE:desc'
    ];

    var filter = {};
    var siteProjectFilter = selectReportDialog.find('select.siteproject');
    if (siteProjectFilter.val() !== '') {
        var filterValue = siteProjectFilter.val().split('_');
        filter[trackorTypes.rigSiteTT + '.TRACKOR_KEY'] = filterValue[0];

        if (filterValue.length === 2) {
            filter[trackorTypes.projectTT + '.TRACKOR_KEY'] = filterValue[1];
        }
    }

    var perPage = 15;
    this.client.request(new ApiClientRequestOptions({
        modalLoadingMessage: 'Loading reports...',
        url: '/api/v3/trackor_types/' + trackorTypes.rigDailyReportTT + '/trackors?fields=' + encodeURIComponent(fields.join(','))
        + '&page=' + page + '&per_page=' + perPage + '&sort=' + encodeURIComponent(sort.join(',')) + '&' + $.param(filter),
        successCode: 200,
        success: (function (response) {
            var buttonPrev = selectReportDialog.find('button.reportsPrev');
            var buttonNext = selectReportDialog.find('button.reportsNext');

            buttonPrev.button('option', 'disabled', page === 1);
            buttonPrev.data('page', page - 1);
            buttonNext.button('option', 'disabled', response.length < perPage);
            buttonNext.data('page', page + 1);

            var table = selectReportDialog.find('table.reports tbody').empty();
            $.each(response, (function (idx, obj) {
                var tid = obj['TRACKOR_ID'];
                var tr = $('<tr></tr>');
                tr.click((function () {
                    $('span.site').empty().text(obj[trackorTypes.rigSiteTT + '.TRACKOR_KEY']);
                    $('span.project').empty().text(obj[trackorTypes.projectTT + '.PR_PROJECT_NAME']);

                    selectReportDialog.dialog('close');
                    this.loadReport(tid);
                }).bind(this));

                $('<td></td>').text(obj[trackorTypes.rigSiteTT + '.TRACKOR_KEY']).appendTo(tr);
                $('<td></td>').text(obj[trackorTypes.projectTT + '.PR_PROJECT_NAME']).appendTo(tr);
                var reportDate = dateUtils.remoteDateToObj(obj['RDR_REPORT_DATE']);
                $('<td></td>').text(reportDate.getDate()).appendTo(tr);
                $('<td></td>').text(dateUtils.objGetMonthName(reportDate)).appendTo(tr);
                $('<td></td>').text(reportDate.getFullYear()).appendTo(tr);

                var link = $('<a>Open</a>').attr('href', 'javascript:void(0)');
                $('<td></td>').append(link).appendTo(tr);

                table.append(tr);
            }).bind(this));
            if (response.length === 0) {
                var tr = $('<tr></tr>').addClass('nodata');
                $('<td colspan="5"></td>').text('No reports').appendTo(tr);

                table.append(tr);
            }

            // Selectmenu z-index bug fix
            var siteFilter = selectReportDialog.find('select.siteproject');
            if (siteFilter.is(':ui-selectmenu')) {
                siteFilter.selectmenu('destroy');
            }
            siteFilter.selectmenu();

            selectReportDialog.dialog('open');
        }).bind(this)
    }));
};
RigDaily.prototype.startSelectReport = function (selectReportDialog) {
    var siteProjectFilter = selectReportDialog.find('select.siteproject');
    var appendOpt = function (value, text, selected) {
        var attrs = {
            'value': value
        };
        if (selected) {
            attrs['selected'] = 'selected';
        }
        $('<option></option>').attr(attrs).text(text).appendTo(siteProjectFilter);
    };
    siteProjectFilter.empty();
    appendOpt('', '-- Any site/project --', true);

    var fields = [
        'TRACKOR_KEY',
        'PR_PROJECT_NAME',
        trackorTypes.rigSiteTT + '.TRACKOR_KEY'
    ];
    var sort = [
        trackorTypes.rigSiteTT + '.TRACKOR_KEY',
        'PR_PROJECT_NAME'
    ];
    this.client.request(new ApiClientRequestOptions({
        modalLoadingMessage: 'Loading sites and projects...',
        url: '/api/v3/trackor_types/' + trackorTypes.projectTT + '/trackors?fields=' + encodeURIComponent(fields.join(','))
        + '&sort=' + encodeURIComponent(sort.join(',')),
        successCode: 200,
        success: (function (response) {
            var currentSite = null;
            $.each(response, function (idx, obj) {
                var rigSiteKey = obj[trackorTypes.rigSiteTT + '.TRACKOR_KEY'];
                if (currentSite !== null && currentSite !== rigSiteKey) {
                    currentSite = rigSiteKey;
                    appendOpt(rigSiteKey, rigSiteKey + ' / -- Any project --');
                } else if (currentSite === null) {
                    currentSite = rigSiteKey;
                }

                appendOpt(rigSiteKey + '_' + obj['TRACKOR_KEY'], rigSiteKey + ' / ' + obj['PR_PROJECT_NAME']);
            });
            appendOpt(currentSite, currentSite + ' / -- Any project --');

            if (typeof localStorage['selectedFilter'] !== 'undefined') {
                siteProjectFilter.val(localStorage['selectedFilter']);
            }
            this.selectReportLoadPage(selectReportDialog, 1);
        }).bind(this)
    }));
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

    var _this = this;
    selectReportDialog.find('select.siteproject').selectmenu().on('selectmenuchange', function () {
        localStorage['selectedFilter'] = $(this).val();

        selectReportDialog.dialog('close');
        _this.selectReportLoadPage(selectReportDialog, 1);
    });

    selectReportDialog.find('button.reportsPrev, button.reportsNext').button().click(function () {
        selectReportDialog.dialog('close');
        _this.selectReportLoadPage(selectReportDialog, $(this).data('page'));
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
                div.dialog('close');
            }
        },
        close: (function () {
            div.remove();
            if (typeof(callback) === 'function') {
                callback.call(this);
            }
        }).bind(this)
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
            'OK': (function () {
                div.dialog('close');
                callback.call(this);
            }).bind(this),
            'Cancel': function () {
                div.dialog('close');
            }
        },
        close: function () {
            div.remove();
        }
    });
};

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

var fieldValidators = {};

// rigDailyReportTT
fieldValidators[trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new ValidationFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH');
    }
};
fieldValidators[trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    var prevDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH');
    var currentDepth = getCfValue(trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    if (prevDepth > currentDepth) {
        throw new ValidationFailedException('Current Measured Depth should be greater or equal than Previous Measured Depth', trackorTypes.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH');
    }
};

// consumablesUsageTT
fieldValidators[trackorTypes.consumablesUsageTT + '.CONU_USED'] = function (tid, tblIdx) {
    var balance = getCfValue(trackorTypes.consumablesUsageTT + '.CONU_BALANCE', tid, tblIdx);
    if (balance < 0) {
        throw new ValidationFailedException('Incorrect Consumable balance', trackorTypes.consumablesUsageTT + '.CONU_USED', tid, tblIdx);
    }
};

// binderUsageTT
fieldValidators[trackorTypes.binderUsageTT + '.BU_USED'] = function (tid, tblIdx) {
    var balance = getCfValue(trackorTypes.binderUsageTT + '.BU_BALANCE', tid, tblIdx);
    if (balance < 0) {
        throw new ValidationFailedException('Incorrect Binder balance', trackorTypes.binderUsageTT + '.BU_USED', tid, tblIdx);
    }
};

var typeValidators = {
    'number': function (value, cfFullName, tid, tblIdx) {
        if (isNaN(parseFloat(value))) {
            throw new ValidationFailedException('Incorrect number value', cfFullName, tid, tblIdx);
        }
    }
};

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

var loseDataMessage = 'You will lose any unsaved data. Continue?';

var isReportEdited = false;
var tids = {};
var locks = {};
var edited = {};
var dateUtils = new ApiDateUtils();

function beforeUnloadHandler() {
    return loseDataMessage;
}

function RequiredFieldsNotPresentException(focusObj) {
    this.message = 'Required fields not present!';
    this.focusObj = focusObj;
}

function ValidationFailedException(message, name, tid, tblIdx) {
    this.message = message;
    this.focusObj = findCf(name, tid, tblIdx).children('div[contenteditable=true]');
}

function checkInfinity(number) {
    return number === Number.POSITIVE_INFINITY || number === Number.NEGATIVE_INFINITY ? 0 : number;
}

function findCf(name, tid, tblIdx, noerror) {
    var ttName = name.split('.')[0];
    var cfs = $('[data-cf="' + name + '"]');
    if (typeof tid !== 'undefined' && typeof tblIdx !== 'undefined') {
        cfs = cfs.filter(function () {
            var cf = $(this);
            return (typeof cf.data('tidx') === 'undefined' || cf.data('tidx') === tblIdx) && cf.closest('tr').data('tid_' + tblIdx) === tid;
        });
    } else if (typeof tid !== 'undefined' && typeof tableIndexes[ttName] === 'string') {
        tblIdx = tableIndexes[ttName];
        cfs = cfs.filter(function () {
            var cf = $(this);
            return (typeof cf.data('tidx') === 'undefined' || cf.data('tidx') === tblIdx) && cf.closest('tr').data('tid_' + tblIdx) === tid;
        });
    }
    if (cfs.length === 0 && !noerror) {
        console.log('Config field ' + name + '[' + tid + ':' + tblIdx + '] not found');
    }
    return cfs;
}

function getCfValue(name, tid, tblIdx, noerror) {
    var cfs = findCf(name, tid, tblIdx, noerror);

    if (cfs.length === 0) {
        return null;
    } else if (cfs.length > 1) {
        cfs = cfs.first();
    }

    var dataType = cfs.data('t');
    var value = cfs[0].innerText.trim();
    if (dataType === 'number') {
        value = parseFloat(value);
        if (isNaN(value)) {
            value = 0;
        }
    }
    return value;
}

function getOriginalCfValue(name, tid, tblIdx, noerror) {
    var cfs = findCf(name, tid, tblIdx, noerror);

    if (cfs.length === 0) {
        return null;
    } else if (cfs.length > 1) {
        cfs = cfs.first();
    }

    var dataType = cfs.data('t');
    var value = cfs.data('orig_data');
    if (dataType === 'number') {
        value = parseFloat(value);
        if (isNaN(value)) {
            value = 0;
        }
    }
    return value;
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
        editDiv.trigger('blur').trigger('change');
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
            'checkEmptyForNewTrackor': obj.data('chefnt') + '' === 'true',
            'orig_data': obj.data('orig_data'),
            'reload': obj.data('reload') + '' === 'true',
            'forceSubmit': obj.data('submit') + '' === 'true',
            'required': obj.data('required') + '' === 'true',
            'lockable': obj.data('lockable') + '' === 'true',
            'type': obj.data('t'),
            'editable': obj.data('ed') + '' === 'true' || typeof obj.data('ed') === 'undefined',
            'editable_style': obj.data('ed-style')
        });
    });
    return cfs;
}

function getCfTid(cf, isReturnObject) {
    var getResult = function (tid, tblIdx) {
        return isReturnObject ? {'tid': tid, 'tblIdx': tblIdx} : tid;
    };

    var isSingleTid = !$.isArray(tids[cf.tt]);
    var isSingleTblIdx = !$.isArray(tableIndexes[cf.tt]);
    var tr, tid, tblIdx;

    if (isSingleTid && isSingleTblIdx) {
        return getResult(tids[cf.tt], getFirstTblIdx(cf.tt));
    } else if (isSingleTblIdx || typeof cf.tIdx !== 'undefined') {
        tblIdx = isSingleTblIdx ? getFirstTblIdx(cf.tt) : cf.tIdx;
        tr = cf.obj.closest('tr');
        tid = tr.hasClass('subtable') ? tr.data('tid_' + tblIdx) : undefined;
        if (typeof tid === 'undefined') {
            console.log('Unable to get trackor id for [' + cf.tt + '.' + cf.name + ':' + tblIdx + ']');
        }
        return getResult(tid, tblIdx);
    } else {
        console.log('Unable to get trackor id for [' + cf.tt + '.' + cf.name + ':?]');
        return getResult(undefined, undefined);
    }
}

function isCfLocked(cf) {
    if (!cf.lockable) {
        return false;
    }

    if (typeof locks[cf.tt] !== 'object') {
        return false;
    }

    var tid = getCfTid(cf);
    return $.isArray(locks[cf.tt][tid]) && $.inArray(cf.name, locks[cf.tt][tid]) !== -1;
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
    } else if (cf.type === 'date') {
        var date = dateUtils.remoteDateToObj(value);
        cf.obj.text(dateUtils.formatDate(date));
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
            div.addClass('locked')
                .tooltip({
                    items: 'div',
                    content: 'Locked'
                });
            cf.obj.empty().append(div);
        } else {
            cf.obj.empty().append(div);

            // Init editable
            div.on('blur keyup paste', function () {
                var tid = getCfTid(cf);
                var isChanged = '' + cf.obj.data('orig_data') !== div.text();

                if (isChanged) {
                    if (typeof edited[cf.tt] === 'undefined') {
                        edited[cf.tt] = {};
                    }
                    if (typeof edited[cf.tt][cf.name] === 'undefined') {
                        edited[cf.tt][cf.name] = [];
                    }
                    if ($.inArray(tid, edited[cf.tt][cf.name]) === -1) {
                        edited[cf.tt][cf.name].push(tid);
                    }
                } else {
                    applyCfNotChanged(cf, tid);
                }

                var prevIsReportEdited = isReportEdited;
                isReportEdited = Object.keys(edited).length !== 0;
                if (prevIsReportEdited !== isReportEdited) {
                    $(window)[isReportEdited ? 'on' : 'off']('beforeunload', beforeUnloadHandler);
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
            div.on('focus', function () {
                if (div.data('focused') === true) {
                    return;
                }

                div.data('focused', true);
                $(this).closest('td').trigger('mousedown');

                div.focus();
                div.data('focused', false);
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
                                div.empty().text(dateText).trigger('blur');
                            }
                        });
                    if (date !== null) {
                        input.datepicker('setDate', date);
                    }
                    input.insertAfter(div);
                    div.prop('contenteditable', false);
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
            var data = getCfTid(cf, true);
            dynCalculations[cf.tt + '.' + cf.name](data['tid'], data['tblIdx'], subscribeObj);
        }).trigger('change');
    }
}

function getFirstTblIdx(tt) {
    return $.isArray(tableIndexes[tt]) ? tableIndexes[tt][0] : tableIndexes[tt];
}

function fillCellsForNewTrackor(ttName, maxRows, response, callback) {
    response = response.slice(0, maxRows);
    $.each(response, function (idx, elem) {
        callback(idx, elem['TRACKOR_ID'], elem);
    });

    var remainder = maxRows - response.length;
    if (remainder > 0) {
        for (var i = response.length; i < maxRows; i++) {
            callback(i, generateTrackorId(ttName));
        }
    }
}

function makeEmptyCfsObject(cfs) {
    var obj = {};
    $.each(cfs, function (idx, cfArr) {
        $.each(cfArr, function (ifx, cf) {
            if (cf.required) {
                switch (cf.type) {
                    case 'number': {
                        obj[cf.name] = 0;
                        break;
                    }
                    case 'date': {
                        obj[cf.name] = '00/00/00';
                        break;
                    }
                    default: {
                        obj[cf.name] = '';
                        break;
                    }
                }
            } else {
                obj[cf.name] = '';
            }
        });
    });
    return obj;
}

function checkCfsFilledForNewTrackorCreate(cfs, data, tid, tblIdx) {
    var isCfsFilledCorrectly = true;
    $.each(cfs, function (idx, cfArr) {
        $.each(cfArr, function (idx, cf) {
            if (cf.checkEmptyForNewTrackor) {
                if (typeof data[cf.name] === 'undefined' || ('' + data[cf.name]).length === 0) {
                    isCfsFilledCorrectly = false;
                    return false;
                }
                try {
                    if (typeof typeValidators[cf.type] === 'function') {
                        typeValidators[cf.type](data[cf.name], cf.tt + '.' + cf.name, tid, tblIdx);
                    }
                    if (typeof fieldValidators[cf.tt + '.' + cf.name] === 'function') {
                        fieldValidators[cf.tt + '.' + cf.name](tid, tblIdx);
                    }
                } catch (e) {
                    isCfsFilledCorrectly = false;
                    return false;
                }
            }
        });
        if (!isCfsFilledCorrectly) {
            return false;
        }
    });
    return isCfsFilledCorrectly;
}

function subscribeChangeDynCfs() {
    var cfs = getConfigFields(trackorTypes.dynTT);
    $.each(cfs, function (cfName, cfArr) {
        $.each(cfArr, function (idx, cf) {
            if (dynCalculations.hasOwnProperty(cf.tt + '.' + cf.name)) {
                cf.obj.change(function () {
                    var tr = cf.obj.closest('tr');
                    var tblIdx = cf.tIdx !== undefined ? cf.tIdx : getFirstTblIdx(cf.tt);
                    var tid = tr.hasClass('subtable') ? tr.data('tid_' + tblIdx) : tids[cf.tt];
                    dynCalculations[cf.tt + '.' + cf.name](tid, tblIdx, cf.obj);
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

    rigDaily.arrowNavigation.initCells(row.find('td'));
    return row;
}

function convertEditableCfsToDataObject(cfs, tid, tblIdx, dataAll) {
    var result = {};
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            var val;
            if (cf.editable) {
                val = cf.obj.children('div[contenteditable]')[0].innerText;
                if (!isCfLocked(cf)) {
                    if (cf.required && val.length === 0) {
                        var focusObj = cf.obj.addClass('required_error').children('div[contenteditable]');
                        throw new RequiredFieldsNotPresentException(focusObj);
                    }

                    if (typeof typeValidators[cf.type] === 'function') {
                        typeValidators[cf.type](val, cf.tt + '.' + cf.name, tid, tblIdx);
                    }
                    if (typeof fieldValidators[cf.tt + '.' + cf.name] === 'function') {
                        fieldValidators[cf.tt + '.' + cf.name](tid, tblIdx);
                    }

                    if (cf.type === 'date') {
                        // Reformat date
                        var dateObj = dateUtils.localDateToObj(val);
                        val = dateUtils.objToRemoteDate(dateObj);
                    }

                    if (cf.orig_data !== val) {
                        result[cf.name] = val;
                    }
                }
                if (typeof dataAll === 'object') {
                    dataAll[cf.name] = val;
                }
            } else if (cf.forceSubmit) {
                val = cf.obj.text();

                result[cf.name] = val;
                if (typeof dataAll === 'object') {
                    dataAll[cf.name] = val;
                }
            }
        });
    });
    return result;
}

function getTrackorTypeRelations(ttName, tid, tblIdx) {
    var result = [];
    if (typeof relations[ttName] === 'function') {
        var obj = relations[ttName](tid, tblIdx);
        $.each(obj, function (parentTtName, filterCfs) {
            result.push({
                'trackor_type': parentTtName,
                'filter': filterCfs
            });
        });
    }
    return result;
}

function generateTrackorId(ttName) {
    var newTid = -10000000;
    $.each(tids[ttName], function (idx, tid) {
        if (tid < 0) {
            newTid--;
        }
    });
    return newTid;
}

function updateCfsTid(cfs, tblIdx, oldTid, newTid) {
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            var tr = cf.obj.closest('tr.subtable.subtable_' + tblIdx);
            if (tr.data('tid_' + tblIdx) + '' === oldTid + '') {
                tr.data('tid_' + tblIdx, newTid);
            }
        });
    });
}

function updateTtTid(ttName, oldTid, newTid) {
    $.each(tids[ttName], function (idx, tid) {
        if (tid === oldTid) {
            tids[ttName][idx] = newTid;
            return false;
        }
    });
}

function getFieldNamesForReload(cfs) {
    var fields = [];
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            if (cf.reload || cf.lockable) {
                fields.push(cf.name);
            }
        });
    });
    return fields;
}

function getLockableFieldNames(cfs) {
    var fields = [];
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            if (cf.lockable) {
                fields.push(cf.name);
            }
        });
    });
    return fields;
}

function applyCfsNotChanged(cfs, tid) {
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            applyCfNotChanged(cf, tid);
        });
    });
}

function applyCfNotChanged(cf, tid) {
    var ttCheck = typeof edited[cf.tt] !== 'undefined';
    var cfCheck = ttCheck && typeof edited[cf.tt][cf.name] !== 'undefined';

    if (cfCheck && $.inArray(tid, edited[cf.tt][cf.name]) !== -1) {
        edited[cf.tt][cf.name].splice(edited[cf.tt][cf.name].indexOf(tid), 1);
    }
    if (cfCheck && edited[cf.tt][cf.name].length === 0) {
        delete edited[cf.tt][cf.name];
    }
    if (ttCheck && Object.keys(edited[cf.tt]).length === 0) {
        delete edited[cf.tt];
    }
}

function updateOriginalCfsData(cfs, data, tid) {
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            // Update orig_data
            if (typeof data[cf.name] !== 'undefined') {
                cf.orig_data = data[cf.name];
                cf.obj.data('orig_data', data[cf.name]);
            }

            applyCfNotChanged(cf, tid);
        });
    });
}

function requestUpdateTrackorById(queue, tid, fields, callback) {
    queue.push(new ApiClientQueueRequestOptions({
        type: 'PUT',
        contentType: 'application/json',
        url: '/api/v3/trackors/' + encodeURIComponent(tid),
        data: JSON.stringify(fields),
        dataType: 'json',
        processData: false,
        successCode: 200,
        success: callback
    }));
}

function requestCreateTrackor(queue, ttName, fields, parents, callback) {
    queue.push(new ApiClientQueueRequestOptions({
        type: 'POST',
        data: JSON.stringify({
            'fields': fields,
            'parents': parents
        }),
        dataType: 'json',
        processData: false,
        contentType: 'application/json',
        url: '/api/v3/trackor_types/' + encodeURIComponent(ttName) + '/trackors',
        successCode: 201,
        success: callback
    }));
}

function requestDeleteTrackor(queue, ttName, tid, callback) {
    queue.push(new ApiClientQueueRequestOptions({
        type: 'DELETE',
        contentType: 'application/json',
        url: '/api/v3/trackor_types/' + encodeURIComponent(ttName) + '/trackors?trackor_id=' + encodeURIComponent(tid),
        successCode: 200,
        success: callback
    }));
}

function requestTrackorLocks(queue, ttName, tid, fields, callback) {
    queue.push(new ApiClientQueueRequestOptions({
        type: 'GET',
        contentType: 'application/json',
        url: '/api/v3/trackors/' + encodeURIComponent(tid) + '/locks?fields=' + encodeURIComponent(fields.join(',')),
        successCode: 200,
        success: function (response) {
            $.each(response, function (idx, elem) {
                var field_name = elem['field_name'];
                if (elem['locked'] && $.inArray(field_name, fields) !== -1) {
                    if (typeof locks[ttName] !== 'object') {
                        locks[ttName] = {};
                    }
                    if (!$.isArray(locks[ttName][tid])) {
                        locks[ttName][tid] = [];
                    }
                    locks[ttName][tid].push(field_name);
                }
            });
            callback();
        }
    }));
}

function requestTrackorsLocks(queue, tids, ttName, cfs, callback) {
    if (tids.length === 0) {
        callback();
        return;
    }

    var fields = getLockableFieldNames(cfs);
    if (fields.length !== 0) {
        queue.push(new ApiClientQueueRequestOptions({
            type: 'GET',
            contentType: 'application/json',
            url: '/api/v3/trackor_types/' + encodeURIComponent(ttName) + '/trackors/locks?fields=' + encodeURIComponent(fields.join(','))
            + '&trackors=' + encodeURIComponent(tids.join(',')),
            successCode: 200,
            success: function (response) {
                $.each(response, function (idx, elem) {
                    var field_name = elem['field_name'];
                    var tid = elem['trackor_id'];

                    if (elem['locked'] &&
                        $.inArray(field_name, fields) !== -1 &&
                        $.inArray(tid, tids) !== -1) {
                        if (typeof locks[ttName] !== 'object') {
                            locks[ttName] = {};
                        }
                        if (!$.isArray(locks[ttName][tid])) {
                            locks[ttName][tid] = [];
                        }
                        locks[ttName][tid].push(field_name);
                    }
                });
                callback();
            }
        }));
    } else {
        callback();
    }
}

function ArrowNavigation() {
    this.currentRow = 2;
    this.currentCell = 1;
    this.isCtrlPressed = false;
}
ArrowNavigation.prototype.updateCell = function () {
    var activeTd = $('td.active').removeClass('active');

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
    if (!tableCell.is(activeTd)) {
        activeTd.find('div[contenteditable=true]').trigger('blur');
    }

    tableCell.focus();
    tableCell.addClass('active');
};
ArrowNavigation.prototype.setActiveCellRowTo = function (td) {
    if (td.index() === 0) {
        return;
    }

    var row = $('#content').find('tr').index(td.closest('tr'));
    if (row === 0) {
        return;
    }

    this.currentRow = row;
    this.currentCell = td.index();
    this.updateCell();
};
ArrowNavigation.prototype.initCells = function (td) {
    var _this = this;
    td.unbind('mousedown').mousedown(function () {
        var obj = $(this);
        if (obj.height() !== 0 && obj.is(':not(.unselectable)')) {
            _this.setActiveCellRowTo(obj);
        }
    }).unbind('dblclick').dblclick(function () {
        var div = $(this).find('div[contenteditable]:first');
        if (div.length !== 0) {
            div.focus();
        }
    });
};
ArrowNavigation.prototype.init = function () {
    this.updateCell();
    this.initCells($('#content').find('td'));

    $(document).keydown((function (e) {
        if (e.which === 17) {
            this.isCtrlPressed = true;
        }

        var focusedDiv = $('div[contenteditable]:focus');

        if (e.shiftKey || this.isCtrlPressed ||
            $('#content').is(':hidden') || focusedDiv.length !== 0) {

            if (e.keyCode === 27 && focusedDiv.length !== 0) {
                focusedDiv.blur();
            }
            return true;
        }

        if (e.keyCode === 37) {
            if (this.currentCell === 1) {
                return false;
            }
            this.currentCell--;
            this.updateCell();
            return false;
        } else if (e.keyCode === 38) {
            if (this.currentRow === 2) {
                return false;
            }
            this.currentRow--;
            this.updateCell();
            return false;
        } else if (e.keyCode === 39) {
            this.currentCell++;
            this.updateCell();
            return false;
        } else if (e.keyCode === 40 || e.keyCode === 13) {
            this.currentRow++;
            this.updateCell();
            return false;
        }
    }).bind(this)).keyup((function (e) {
        if (e.which === 17) {
            this.isCtrlPressed = false;
        } else if (e.which === 8 || e.which === 46) {
            var tableCell = $('td.active');
            if (tableCell.find('div[contenteditable]:not(.locked):focus').length === 0) {
                tableCell.find('div[contenteditable]:not(.locked):not(:focus)').empty().trigger('blur');
            }
        }
    }).bind(this));
};

//# sourceMappingURL=../maps/js/rigdaily.js.map
