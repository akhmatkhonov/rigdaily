requirejs.config({
    baseUrl: 'js',
    paths: {
        jquery: 'jquery-3.2.0.min'
    },
    shim: {
        apiclient: {
            deps: ['jquery', 'jquery-ui.min']
        },
        rigdaily: {
            deps: ['apiclient']
        }
    }
});
requirejs(['jquery', 'jquery-ui.min', 'apiclient', 'rigdaily'], function () {
    // Dialogs auto centering when page resizes
    $(window).resize(function () {
        $('.ui-dialog-content:visible').each(function () {
            var dialog = $(this).data('uiDialog');
            dialog.option('position', dialog.options.position);
        });
    });

    console.log('Rig Daily init start');
    window.rigDaily = new RigDaily();
});
