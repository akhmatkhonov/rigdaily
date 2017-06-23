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

    var getReloadFieldRequestCount = function (ttName, tid, cfs) {
        var requestCount = 0;
        var fields = getFieldNamesForReload(cfs);
        if (fields.length !== 0) {
            requestCount++;
            fields = getLockableFieldNames(cfs);
            if (fields.length !== 0) {
                requestCount++;
            }
        }
        return requestCount;
    };
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
        queue.totalRequests++;
        queue.totalRequests += getReloadFieldRequestCount(ttName, tid, cfs);

        requestUpdateTrackorById(queue, tid, data, function () {
            updateOriginalCfsData(cfs, data, tid);
            makeReloadFieldsRequest(queue, ttName, tid, cfs);
        });
    };
    var makeCreateRequest = function (tid, ttName, tblIdx, data, cfs) {
        queueNewTrackors.totalRequests++;
        queueNewTrackors.totalRequests += getReloadFieldRequestCount(ttName, tid, cfs);

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
        queue.totalRequests++;

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
        queue.start();
    } else {
        this.alertDialog('Nothing to submit');
    }
};

RigDaily.prototype.loadReport = function (tid) {
    var queue = new ApiClientRequestQueue(this.client, 'Loading report data...', 22, true, 7);
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
