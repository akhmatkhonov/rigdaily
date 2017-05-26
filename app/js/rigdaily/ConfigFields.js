var loseDataMessage = 'You will lose any unsaved data. Continue?';

var isReportEdited = false;
var tids = {};
var locks = {};
var dateUtils = new ApiDateUtils();

function RequiredFieldsNotPresentException(focusObj) {
    this.message = 'Required fields not present!';
    this.focusObj = focusObj;
}

function FieldValidateFailedException(message, name, tid, tblIdx) {
    this.message = message;
    this.focusObj = findCf(name, tid, tblIdx).children('div[contenteditable]');
}

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
                    div.prop('contenteditable', false).text(dateUtils.remoteDateFormat(div.text()));
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
                        var dateObj = dateUtils.localDateToObj(val);
                        val = dateUtils.objToRemoteDate(dateObj);
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
