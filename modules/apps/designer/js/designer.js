$(function () {
    //TODO: cleanup this

    var dashboardUrl = window.location.pathname.match(/.*(\/dashboards\/).+/ig) ? '../dashboards' : 'dashboards';

    var currentPage = 'landing';

    var storeCache = {
        layout: [],
        gadget: []
    };

    var layoutsListHbs = Handlebars.compile($("#layouts-list-hbs").html());

    var layoutHbs = Handlebars.compile($("#layout-hbs").html());

    var widgetsListHbs = Handlebars.compile($("#widgets-list-hbs").html());

    var widgetHbs = Handlebars.compile($("#widget-hbs").html());

    var widgetOptionsHbs = Handlebars.compile($("#widget-options-hbs").html());

    var designerHbs = Handlebars.compile($("#designer-hbs").html());

    var randomId = function () {
        return Math.random().toString(36).slice(2);
    };

    var findPage = function (name) {
        return dashboard.pages[name];
    };

    var createPage = function (name, page) {
        return dashboard.pages[name] = page;
    };

    var findStoreCache = function (type, id) {
        var i;
        var item;
        var items = storeCache[type];
        var length = items.length;
        for (i = 0; i < length; i++) {
            item = items[i];
            if (item.id === id) {
                return item;
            }
        }
    };

    var findPageWidget = function (id) {
        var page = findPage(currentPage);
        var content = page.content;
        var i;
        var length;
        var area;
        var widget;
        var widgets;
        for (area in content) {
            if (content.hasOwnProperty(area)) {
                widgets = content[area];
                length = widgets.length;
                for (i = 0; i < length; i++) {
                    widget = widgets[i];
                    if (widget.id === id) {
                        return widget;
                    }
                }
            }
        }
    };

    var updatePageOptions = function (id, opts) {
        var block = findPageWidget(id);
        var options = block.content.options;
        var o;
        var opt;
        for (opt in opts) {
            if (opts.hasOwnProperty(opt)) {
                o = options[opt];
                o.value = opts[opt];
            }
        }
        console.log(findPage(currentPage));
    };

    var saveDashboard = function (dashboard) {
        $.ajax({
            url: dashboardUrl,
            method: 'POST',
            data: JSON.stringify(dashboard),
            contentType: 'application/json'
        }).success(function (data) {
            console.log('dashboard saved successfully');
        }).error(function () {
            console.log('error saving dashboard');
        });
    };

    //TODO: handle plugin options in an extensible manner
    var mergeUserPrefs = function (widget, metadata) {
        var pref;
        var opts = widget.options || (widget.options = {});
        var prefs = metadata.userPrefs;
        for (pref in prefs) {
            if (prefs.hasOwnProperty(pref)) {
                pref = prefs[pref];
                opts[pref.name] = {
                    type: pref.dataType,
                    title: pref.displayName,
                    value: pref.defaultValue,
                    options: pref.orderedEnumValues,
                    required: pref.required
                };
            }
        }
    };

    var renderWidget = function (page, container, id) {
        var instanceId = randomId();
        var widget = findStoreCache('gadget', id);
        var area = container.attr('id');
        var content = page.content;
        var block = {
            id: instanceId,
            content: widget
        };
        content = content[area] || (content[area] = []);
        content.push(block);
        //TODO: drag and drop doesn't work time to time
        ues.widget(container, block);

        /*ues.store.gadget(id, function (err, data) {
         var el = $(widgetHbs({
         id: instanceId
         }));
         container.html(el);
         ues.gadget($('#' + instanceId), data.data.url, null, null, function (err, metadata) {
         mergeUserPrefs(widget, metadata);
         el.on('click', '.widget-toolbar .options-handle', function () {
         renderWidgetOptions(instanceId, widget);
         });
         renderWidgetOptions(instanceId, widget);
         });
         });*/
    };

    var renderWidgetOptions = function (id, widget) {
        console.log(widget.options);
        var opts = {};
        $('#middle').find('.designer .options').html(widgetOptionsHbs({
            id: id,
            options: widget.options
        })).find('.sandbox').on('click', '.save', function () {
            var thiz = $(this);
            var id = thiz.data('id');
            var sandbox = thiz.closest('.sandbox');
            $('input', sandbox).each(function () {
                var el = $(this);
                opts[el.attr('name')] = el.val();
            });
            $('select', sandbox).each(function () {
                var el = $(this);
                opts[el.attr('name')] = el.val();
            });
            updatePageOptions(id, opts);
        });
    };

    var renderLayout = function (data) {
        $('#middle').find('.designer').html(layoutHbs(data))
            .find('.toolbar .save').on('click', function () {
                saveDashboard();
            }).end()
            .find('.ues-widget-box').droppable({
                //activeClass: 'ui-state-default',
                hoverClass: 'ui-state-hover',
                //accept: ':not(.ui-sortable-helper)',
                drop: function (event, ui) {
                    //$(this).find('.placeholder').remove();
                    renderWidget($(this), ui.helper.data('id'));
                }
            });
    };

    var loadWidgets = function (start, count) {
        ues.store.gadgets({
            start: start,
            count: count
        }, function (err, data) {
            storeCache.gadget = data;
            $('#middle').find('.widgets .content').html(widgetsListHbs(data));
        });
    };

    var initWidgets = function () {
        $('.widgets').on('mouseenter', '.thumbnail .drag-handle', function () {
            $(this).draggable({
                cancel: false,
                appendTo: 'body',
                helper: 'clone',
                start: function (event, ui) {
                    console.log('dragging');
                    $('#left').find('a[href="#designer"]').tab('show');
                },
                stop: function () {
                    //$('#left a[href="#widgets"]').tab('show');
                }
            });
        }).on('mouseleave', '.thumbnail .drag-handle', function () {
            $(this).draggable('destroy');
        });
    };

    var initTabs = function () {
        $('#left')
            .find('.nav-tabs a')
            .click(function (e) {
                e.preventDefault();
                var el = $(this);
                el.tab('show');
            });
    };

    var listenLayout = function (dashboard, page) {
        $('#middle').find('.designer')
            .find('.toolbar .save').on('click', function () {
                saveDashboard(dashboard);
            }).end()
            .find('.ues-widget-box').droppable({
                //activeClass: 'ui-state-default',
                hoverClass: 'ui-state-hover',
                //accept: ':not(.ui-sortable-helper)',
                drop: function (event, ui) {
                    //$(this).find('.placeholder').remove();
                    renderWidget(page, $(this), ui.helper.data('id'));
                }
            });
    };

    var layoutContainer = function () {
        return $('#middle').find('.designer').html(layoutHbs()).find('.layout');
    };

    var addLayout = function (id, dashboard) {
        var layout = findStoreCache('layout', id);
        $.get(layout.url, function (data) {
            var name = 'landing';
            var title = 'My Dashboard';
            layout.content = data;
            var page = {
                title: title,
                layout: layout,
                content: {}
            };
            dashboard.landing = name;
            dashboard.pages[name] = page;
            var container = layoutContainer();
            ues.dashboard(container, dashboard, name);
            listenLayout(dashboard, page);
        }, 'html');
    };

    var initExisting = function (dashboard) {
        var landing = dashboard.landing;
        var page = dashboard.pages[landing];
        if (!page) {
            throw 'Specified page : ' + landing + ' cannot be found';
        }
        var container = layoutContainer();
        ues.dashboard(container, dashboard, landing);
        listenLayout(dashboard, page);
    };

    var initFresh = function (dashboard) {
        ues.store.layouts({
            start: 0,
            count: 20
        }, function (err, data) {
            storeCache.layout = data;
            $('#middle')
                .find('.designer .content').html(layoutsListHbs(data))
                .on('click', '.thumbnails .add', function () {
                    addLayout($(this).data('id'), dashboard);
                });
        });
    };

    var initDashboard = function () {
        var dashboard = ues.global.dashboard;
        var fresh = ues.global.fresh;
        fresh ? initFresh(dashboard) : initExisting(dashboard);
    };

    initTabs();
    initDashboard();
    initWidgets();
    loadWidgets(0, 20);

    //TODO: uncomment this
    /*$('.designer .content').on('mouseenter', '.widget .widget-toolbar', function () {
     $('.tools', $(this)).show();
     }).on('mouseleave', '.widget .widget-toolbar', function () {
     $('.tools', $(this)).hide();
     });*/

});