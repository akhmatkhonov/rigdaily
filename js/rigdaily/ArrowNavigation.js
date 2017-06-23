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
