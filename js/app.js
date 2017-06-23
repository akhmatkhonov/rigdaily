requirejs.config({
    baseUrl: 'js',
    paths: {
        'jquery': 'jquery-3.2.0.min',
    },
    shim: {
        'apiclient/Client': {
            deps: [
                'jquery',
                'jquery-ui.min',
                'apiclient/AuthRequestQueue',
                'apiclient/AuthUI',
                'apiclient/DateUtils',
                'apiclient/ErrorQueueUI',
                'apiclient/LoadingUI',
                'apiclient/QueueRequestOptions',
                'apiclient/RequestOptions',
                'apiclient/RequestQueue'
            ]
        },
        'apiclient/AuthRequestQueue': {
            deps: [
                'apiclient/RequestQueue'
            ]
        },
        'apiclient/QueueRequestOptions': {
            deps: [
                'apiclient/RequestOptions'
            ]
        },
        'rigdaily/RigDaily': {
            deps: [
                'apiclient/Client',
                'rigdaily/ArrowNavigation',
                'rigdaily/Config',
                'rigdaily/ConfigFields',
                'rigdaily/DynamicCalculations',
                'rigdaily/Validators'
            ]
        },
        'rigdaily/ConfigFields': {
            deps: [
                'apiclient/Client'
            ]
        }
    }
});
requirejs(['rigdaily/RigDaily'], function () {
    $(function () {
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
});
