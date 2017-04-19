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

var loseDataMessage = 'You will lose any unsaved data. Continue?';

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

// Dynamic calculating cells
var dynCalculations = {};

// rigDailyReportTT
dynCalculations[config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH'] = function () {
    setCfValue(config.rigDailyReportTT + '.RDR_AM_FOOTAGE_DRILLED',
        getCfValue(config.rigDailyReportTT + '.RDR_AM_CURRENT_MEASURED_DEPTH') -
        getCfValue(config.rigDailyReportTT + '.RDR_AM_PREVIOUS_MEASURED_DEPTH'));
};
dynCalculations[config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH'] = function () {
    setCfValue(config.rigDailyReportTT + '.RDR_PM_FOOTAGE_DRILLED',
        getCfValue(config.rigDailyReportTT + '.RDR_PM_CURRENT_MEASURED_DEPTH') -
        getCfValue(config.rigDailyReportTT + '.RDR_PM_PREVIOUS_MEASURED_DEPTH'));
};
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
    setCfValue(config.rigMonthReportTT + '.RMR_CUMULATIVE_TOTAL_WASTE_HAUL', newValue);
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
//

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
};
dynCalculations[config.binderUsageTT + '.BU_DAILY'] = function (tid, tblIdx) {
    var summ = 0;
    $.each(tids[config.binderUsageTT], function (idx, tid) {
        summ += getCfValue(config.binderUsageTT + '.BU_DAILY', tid, tblIdx);
    });
    setCfValue(config.rigDailyReportTT + '.RDR_DAILY_TOTAL', summ);
};
//

function getCfValue(name, tid, tblIdx) {
    var cfs = $('[data-cf="' + name + '"]');

    if (typeof tid !== 'undefined' && typeof tblIdx !== 'undefined') {
        cfs = cfs.filter(function () {
            return $(this).closest('tr').data('tid_' + tblIdx) === tid;
        });
    }

    if (cfs.length === 0) {
        return null;
    }

    var dataType = cfs.data('t');
    var value = cfs.text().trim();
    return dataType === 'number' ? parseFloat(value) : value;
}

function setCfValue(name, value, tid, tblIdx) {
    var cfs = $('[data-cf="' + name + '"]');

    if (typeof tid !== 'undefined' && typeof tblIdx !== 'undefined') {
        cfs = cfs.filter(function () {
            return $(this).closest('tr').data('tid_' + tblIdx) === tid;
        });
    }

    var dataType = cfs.data('t');
    if (dataType === 'number') {
        if (typeof value !== 'number') {
            value = parseFloat(value);
        }
        value = value.toFixed(2);
        if (value % 1 === 0) {
            value = parseInt(value);
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

var isReportEdited = false;
var tids = {};
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

function startRequestQueueWork(requestQueue, message, callback) {
    // Process queue
    var requestTotalCount = requestQueue.length;
    var currentRequest = -1;
    var callNextRequest = function () {
        var reqOptions = requestQueue.shift();
        if (typeof reqOptions === 'undefined') {
            if (typeof callback === 'function') {
                callback();
            }
            return;
        }

        var newOptions = {};
        if (typeof reqOptions['url'] === 'function') {
            newOptions['url'] = reqOptions['url']();
        }
        newOptions['success'] = function (response, textStatus, jqXHR) {
            if (typeof reqOptions['success'] === 'function') {
                reqOptions['success'](response, textStatus, jqXHR);
            }
            callNextRequest();
        };
        newOptions['modalLoadingMessage'] = message + ' ' + parseInt(100 * ++currentRequest / requestTotalCount) + '%';

        ApiClient.doRequest($.extend({}, reqOptions, newOptions));
    };
    callNextRequest();
}

function getConfigFields(ttName, parent, tblIdx) {
    var cfs = {};
    $('[data-cf^="' + ttName + '."]' + (typeof tblIdx !== 'undefined' ? '[data-tIdx="' + tblIdx + '"]' : ''), parent).each(function (idx, elem) {
        var obj = $(elem);
        var cfName = obj.data('cf').split('.').splice(1).join('.');

        if (typeof cfs[cfName] === 'undefined') {
            cfs[cfName] = [];
        }

        cfs[cfName].push({
            'tt': ttName,
            'name': cfName,
            'obj': obj,
            'forceSubmit': typeof obj.data('submit') !== 'undefined' ? obj.data('submit') === 'true' : false,
            'type': obj.data('t'),
            'required': typeof obj.data('req') !== 'undefined' ? obj.data('req') === 'true' : false,
            'editable': typeof obj.data('ed') !== 'undefined' ? obj.data('ed') === 'true' : true,
            'editable_style': obj.data('ed-style')
        });
    });
    return cfs;
}

function fillCf(cf, value) {
    cf.obj.text(value);

    var subscribeObj = cf.obj;
    if (cf.editable) {
        var div = $('<div contenteditable="true"></div>');
        subscribeObj = div;

        div.html(cf.obj.html());

        if (typeof(cf.editable_style) !== 'undefined') {
            div.attr('style', cf.editable_style);
        }

        // Init editable
        div.keypress(function (e) {
            return e.which !== 13;
        }).on('blur keyup paste', function () {
            if (!isReportEdited) {
                $(window).on('beforeunload', function () {
                    return loseDataMessage;
                });
            }
            isReportEdited = true;

            if (cf.type === 'number' && div.text().trim().length === 0) {
                div.text('0');
            }
            div.trigger('change');
        });
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
            }
        }

        cf.obj.empty().append(div);
    }

    // Subscribe events
    if (dynCalculations.hasOwnProperty(cf.tt + '.' + cf.name)) {
        subscribeObj.change(function () {
            var tr = cf.obj.closest('tr');
            var isTblIdxObj = typeof configTblIdxs[cf.tt] === 'object';

            $.each(isTblIdxObj ? configTblIdxs[cf.tt] : [configTblIdxs[cf.tt]], function (idx, tblIdx) {
                var tid = tr.hasClass('subtable') ? tr.data('tid_' + tblIdx) : undefined;
                dynCalculations[cf.tt + '.' + cf.name](tid, tblIdx);
            });
        });
    }
}

function fillCfs(cfs, response) {
    $.each(cfs, function (cfName, cfArr) {
        if (response.hasOwnProperty(cfName)) {
            $.each(cfArr, function (idx, cf) {
                fillCf(cf, response[cf.name]);
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

        selectReportLoadPage(selectReportDialog, 1);
    };
    $('#changeReport').button().click(function () {
        if (isReportEdited) {
            confirmDialog(loseDataMessage, changeReport);
        } else {
            changeReport();
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

        // Fill outside ranges with black boxes
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

    if (typeof tid !== 'undefined') {
        row.data('tid_' + tblIdx, tid);
    }

    return row;
}

function convertEditableCfsToDataObject(cfs) {
    var result = {};
    $.each(cfs, function (idx, cfObj) {
        $.each(cfObj, function (idx, cf) {
            if (cf.editable || cf.forceSubmit) {
                result[cf.name] = cf.obj.children('div').text();
            }
        });
    });
    return result;
}

function startSubmitReport() {
    var requestQueue = [];
    var makePutRequest = function (tid, data) {
        requestQueue.push({
            type: 'PUT',
            contentType: 'application/json',
            url: '/api/v3/trackors/' + encodeURIComponent(tid),
            data: JSON.stringify(data),
            dataType: 'json',
            processData: false,
            successCode: 200
        });
    };

    $.each(tids, function (ttName, tidObj) {
        if (typeof tidObj === 'object') {
            // Find subtable objects
            $.each(tidObj, function (idx, tid) {
                var isTblIdxObject = typeof configTblIdxs[ttName] === 'object';
                $.each(isTblIdxObject ? configTblIdxs[ttName] : [configTblIdxs[ttName]], function (idx, tblIdx) {
                    var parent = $('tr.subtable.subtable_' + tblIdx).filter(function () {
                        return $(this).data('tid_' + tblIdx) === tid;
                    });
                    if (parent.length !== 0) {
                        var data = convertEditableCfsToDataObject(getConfigFields(ttName, parent, isTblIdxObject ? tblIdx : undefined));
                        makePutRequest(tid, data);
                    }
                });
            });
        } else {
            var data = convertEditableCfsToDataObject(getConfigFields(ttName));
            makePutRequest(tidObj, data);
        }
    });

    startRequestQueueWork(requestQueue, 'Submitting report data...', function () {
        isReportEdited = false;
    });
}

function loadReport(tid) {
    saveTid(config.rigDailyReportTT, tid, true);

    var requestQueue = [];
    var key;
    var rigSiteKey;
    var clientKey;
    var managerKey;
    var contractorKey;

    // rigDaily
    var rigDailyCfs = getConfigFields(config.rigDailyReportTT);
    var fields = [
        'TRACKOR_KEY',
        config.rigSiteTT + '.TRACKOR_KEY'
    ];
    fields = fields.concat(Object.keys(rigDailyCfs));

    requestQueue.push({
        url: '/api/v3/trackors/' + tid + '?fields=' + encodeURIComponent(fields.join(',')),
        successCode: 200,
        success: function (response) {
            rigSiteKey = response[config.rigSiteTT + '.TRACKOR_KEY'];
            key = response['TRACKOR_KEY'];

            fillCfs(rigDailyCfs, response);
        }
    });

    // rigSite
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
        }
    });

    // client
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

    // manager
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

    // contractor
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
            $.each(response, function (idx, elem) {
                saveTid(config.holeDesignAndVolumeTT, elem['TRACKOR_ID'], false);

                var row = appendSubtableRow(configTblIdxs[config.holeDesignAndVolumeTT], 2, 6, holeDesignAndVolumeBaseRow, elem['TRACKOR_ID']);
                var rowCfs = getConfigFields(config.holeDesignAndVolumeTT, row);
                fillCfs(rowCfs, elem);
            });
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
            $.each(response, function (idx, elem) {
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

            $.each(response, function (idx, elem) {
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

    // consumablesUsageTT
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

    startRequestQueueWork(requestQueue, 'Loading report data...', function () {
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
        'RDR_REPORT_DAY:desc',
        config.rigMonthReportTT + '.RMR_REPORT_MONTH:desc',
        config.rigYearReportTT + '.RYR_REPORT_YEAR:desc'
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
                    $('span.reportdate').empty().text(obj[config.rigMonthReportTT + '.RMR_REPORT_MONTH'] + ' ' + obj['RDR_REPORT_DAY'] + ', ' +
                        obj[config.rigYearReportTT + '.RYR_REPORT_YEAR']);

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
                var tr = $('<tr></tr>');
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

$(function () {
    ApiClient.init();
    init();
});
