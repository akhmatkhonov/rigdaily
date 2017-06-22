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
