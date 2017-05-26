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
    // TODO: Rig Daily init
});