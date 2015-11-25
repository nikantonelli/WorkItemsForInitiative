Ext.define('Rally.app.WorkItemsForInitiative.app', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    settingsScope: 'app',
    stateful: true,
    items:[
        { xtype: 'container',
            id: 'headerBox',
            layout: 'column',
            border: 5,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        },
        {
            xtype: 'container',
            id: 'piTreeBox',
            border: 0,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        },
        {
            xtype: 'container',
            id: 'piStatusBox',
            border: 0,
            layout: 'column',
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            },
            items: [ {
                    xtype: 'container',
                    id: 'piDefectStatusBox',
                    width: 200,
                    height: 200,
                    hidden: true
                },
                {
                    xtype: 'container',
                    id: 'piTaskStatusBox',
                    hidden: true
                }
            ]
        },
        {
            xtype: 'container',
            layout: 'hbox',
            height: 500,
            items: [
                {
                    xtype: 'container',
                    id: 'piBurnupBox',
                    border: 0,
                    width: '50%',
                    margin: 20,
                    style: {
                        borderColor: Rally.util.Colors.cyan,
                        borderStyle: 'solid'
                    }
                },
                {
                    xtype: 'container',
                    id: 'piBurndownBox',
                    width: '50%',
                    margin: 20,
                    border: 0,
                    style: {
                        borderColor: Rally.util.Colors.cyan,
                        borderStyle: 'solid'
                    }
                }
            ]
        },
        {
            xtype: 'container',
            id: 'piTestCaseBox',
            border: 0,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        },
        {
            xtype: 'container',
            id: 'piTaskBox',
            border: 0,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        },
        {
            xtype: 'container',
            id: 'piDefectBox',
            border: 0,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        },
        {
            xtype: 'container',
            id: 'piStoryBox',
            border: 0,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        }
    ],

    itmStr: "",
    objStr: [],

    appConfig: {
        useLowestPiDates: true,
        autoSelectAll: true,
        ignoreType: false
    },

    portfolioIds: null,
    workItems: null,
    chsrDlg: null,
    lowestPiName: "",

    getState: function() {
        return {
            itmStr: this.itmStr,
            objStr: this.objStr,
            appConfig: this.appConfig
        };
    },

    applyState: function(state) {
        this.itmStr = state.itmStr;
        this.objStr = state.objStr;
        this.appConfig = state.appConfig;
    },


    _findAllLowestLevelPIs: function(app) {

        //Find the lowest level PI type from the store
        if (app.typeStore){
            _.each(app.typeStore.data.items, function(item) {
                if (item.get('Ordinal') === 0){
                    app.lowestPiName = item.get('TypePath');
                }
            });
        }
        else
        {
            Rally.ui.notify.Notifier.show({message: 'Portfolio Type Hierarchy not available. Try and reload page'});
        }

        //In the beginning, we have all the items in itmStr of type Ext.getCmp('typeSelector').rawValue

        var piType = Ext.getCmp('typeSelector').rawValue;

        //Use the lookback API as it allows us to use the '$in' operator and gets
        var piStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            storeId: 'piStore',
            fetch: ['FormattedID', 'Name', 'Children','ScheduleState', 'PlanEstimate', 'PlannedStartDate','PlannedEndDate'],
            hydrate: ['FormattedID', 'Name', 'ScheduleState','PlannedStartDate','PlannedEndDate' ],
            filters:  [ {
                            property: '_ItemHierarchy',
                            operator: '$in',
                            value: app.objStr
                        },
                        {
                            property: '_TypeHierarchy',
                            value: app.lowestPiName
                        },
                        {
                            property: "__At",
                            value: "current"    //Get only the latest version
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    //Add all the items that are lowest level PIs to the collection

                    app.portfolioIds = data;

                    //Update all the containers with the details in.
                    app._updateDetailsPanes(app);
                }
            }
        });

    },


    //Choose an artifact (of a particular type) and from the artifact(s) chosen,
    //find the set of lowest level PI item types that comprise this item

    _doArtifactChooserDialog: function(app) {


        //Keep the chooserdialog object in the global space so that we can read the fetched fields in its
        //data records for all the details panes.

        //But when we re-create, we can drop the current one
        if (app.chsrDlg){
            app.chsrDlg.destroy();
        }

        artifactType = 'PortfolioItem';
        title = "Choose ";

        if ( Ext.getCmp('ignoreType').value === false)
        {
            artifactType += '/' + Ext.getCmp('typeSelector').rawValue;
            title += Ext.getCmp('typeSelector').rawValue;
        }

        app.chsrDlg = Ext.create('Rally.ui.dialog.SolrArtifactChooserDialog', {
            artifactTypes: artifactType,
            autoShow: true,
            height: 400,
            title: title  + ' item(s)',
            multiple: true,

            storeConfig: {
                fetch:['UserStories','Name','FormattedID','TypePath','ObjectID','PortfolioItemType', 'PlannedStartDate','PlannedEndDate'],
                sorters: [
                    {
                        property: 'PortfolioItemType',
                        direction: 'DESC'
                    },
                    {
                        property: 'FormattedID',
                        direction: 'ASC'
                    }
                ]
            },

            listeners: {
                artifactchosen: function(dialogBox, selectedRecords) {

                    //Refresh the list of stuff we are looking at
                    var itmStr = "";
                    var objStr = [];

                    app.workItems = selectedRecords;

                    selectedRecords.forEach( function(record) {
                        delim = (itmStr === "")?"":" ";
                        itmStr += delim + record.get('FormattedID');
                        objStr.push(record.get('ObjectID'));
                    });


                    app.itmStr = itmStr;
                    app.objStr = objStr;

                    app.saveState();

                    //Fetch a new list of lowest level PIs for the items chosen
                    app._findAllLowestLevelPIs(app);


                }
            }
        });
    },

    _piBurnupChart: function(app) {

        if ( Ext.getCmp('piBurnupChart')){
            Ext.getCmp('piBurnupChart').destroy();
        }

        var objList = app.objStr;

        var piBurnupChart = Ext.create( 'Rally.ui.chart.Chart', {
            id: 'piBurnupChart',
            calculatorType: 'BurnupCalculator',
            calculatorConfig: {
                completedScheduleStateNames: ['Accepted', 'Released'],
                inProgressScheduleStateNames: ['In-Progress'],
                toDoScheduleStateNames: ['Triage', 'Defined' ]
            },
            storeConfig: {
                find: {
                    _TypeHierarchy: 'HierarchicalRequirement',
                    _ItemHierarchy: {$in:objList},
                    Children: null
                },
                fetch: ['ScheduleState', 'PlanEstimate'],
                hydrate: ['ScheduleState']
            },

            chartColors: [  Rally.util.Colors.logo_red,
                            Rally.util.Colors.lime_med,
                            Rally.util.Colors.blue_med,
                            Rally.util.Colors.grey6
                        ],

            chartConfig: {
                        chart: {
                            defaultSeriesType: 'area',
                            zoomType: 'xy'
                        },
                        title: {
                            text: 'PI Burnup'
                        },
                        xAxis: {
                            categories: [],
                            tickmarkPlacement: 'on',
                            tickInterval: 10,
                            title: {
                                text: 'Date',
                                margin: 10
                            }
                        },
                        yAxis: [
                            {
                                title: {
                                    text: 'Points'
                                },
                                min: 0
                            }
                        ],
                        tooltip: {
                            formatter: function() {
                                return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
                            }
                        },
                        plotOptions: {
                            series: {
                                marker: {
                                    enabled: false,
                                    states: {
                                        hover: {
                                            enabled: true
                                        }
                                    }
                                },
                                groupPadding: 0.01
                            },
                            column: {
                                stacking: 'State',
                                shadow: false
                            }
                        }
                    }
        });
        Ext.getCmp('piBurnupBox').add(piBurnupChart);
        Ext.getCmp('piBurnupBox').setBorder(1);

    },

    _getFirstStartDate: function (app){
        var startDate = new Date();
        var itemLst = app.workItems;

        if (app.appConfig.useLowestPiDates === true )
        {
            itemLst = app.portfolioIds;
        }

        _.each(itemLst, function(item) {
            if (item.data.PlannedStartDate !== ""){
                if (Rally.util.DateTime.getDifference(startDate, new Date(item.data.PlannedStartDate), 'day' ) > 0) {
                    startDate = Ext.Date.parse(item.data.PlannedStartDate, 'c');
                }
            }
        });
        return startDate;
    },

    _getLastEndDate: function (app){
        var endDate = new Date();
        var itemLst = app.workItems;

        if (app.appConfig.useLowestPiDates === true )
        {
            itemLst = app.portfolioIds;
        }


        _.each(itemLst, function(item) {
            if (item.data.PlannedEndDate !== ""){
                if (Rally.util.DateTime.getDifference(endDate, new Date(item.data.PlannedEndDate), 'day' ) < 0) {
                    endDate = Ext.Date.parse(item.data.PlannedEndDate, 'c');
                }
            }
        });
        return endDate;
    },

    _piDefectList: function(app) {

        if ( Ext.getCmp('piDefectGrid')){
            Ext.getCmp('piDefectGrid').destroy();
        }


        var objList = app.objStr;

        var piStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            storeId: 'piStore',
            fetch: ['FormattedID', 'Name', 'ScheduleState', 'PlanEstimate', 'State'],
            hydrate: ['FormattedID', 'Name', 'ScheduleState','PlanEstimate','State'],
            filters:  [ {
                            property: '_ItemHierarchy',
                            operator: '$in',
                            value: app.objStr
                        },
                        {
                            property: '_TypeHierarchy',
                            value: 'Defect'
                        },
                        {
                            property: "__At",
                            value: "current"    //Get only the latest version
                        },
                        {
                            property: 'State',
                            operator: '!=',
                            value: 'Closed'
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    _.each(data, function(record) {
                        record.set('_ref', '/defect/' + record.get('ObjectID'));
                        record.set('_type', 'defect');
                    });

                    var defectGrid = Ext.create('Rally.ui.grid.Grid', {
                        title: 'Active Defects connected to stories for selected items',
                        id: 'piDefectGrid',
                        enableColumnMove: true,
                        enableColumnResize: true,
                        columnCfgs: [
                            {
                                xtype: 'templatecolumn',
                                text: 'ID',
                                dataIndex: 'FormattedID',
                                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
                                width: 50
                            },
                            {
                                text: 'Name',
                                dataIndex: 'Name'
                            },
//                            {
//                                text: 'State',
//                                dataIndex: 'State'
//                            },
                            {
                                text: ' Schedule State',
                                dataIndex: 'ScheduleState',
                                renderer: function(value) {
                                    return value;
                                }
                            }
                        ],
                        sortableColumns: true,
                        store: store
                    });

                    Ext.getCmp('piDefectBox').add(defectGrid);
                    Ext.getCmp('piDefectBox').setBorder(1);
                    Ext.getCmp('piDefectBox').setMargin(10);

                    //Update the status banner
//                    app._defectStatusBanner(app, store);
                }
            }
        });

    },

    _defectStatusBanner: function (app, store) {

        var dispField = 'PlanEstimate';

        var defectPie = Ext.create('Ext.Container', {
            xtype: 'pie',
            id: 'piDefectStatusBox',
            animate: true,
            width: 100,
            height: 100,
            store: store,
            theme: 'Base:gradients',
            series: [{
                type: 'pie',
                angleField: dispField,
                showInLegend: true,
                tips: {
                    trackMouse: true,
                    width: 140,
                    height: 28,
                    renderer: function(storeItem, item) {
                        // calculate and display percentage on hover
                        var total = 0;
                        store.each(function(rec) {
                            total += rec.get(dispField);
                        });
                        this.setTitle(storeItem.get('FormattedID') + ': ' + storeItem.get(dispField));
                    }
                },
                highlight: {
                    segment: {
                        margin: 20
                    }
                },
                label: {
                    field: 'name',
                    display: 'rotate',
                    contrast: true,
                    font: '18px Arial'
                }
            }]
        });
        Ext.getCmp('piDefectStatusBox').add(defectPie);
        Ext.getCmp('piDefectStatusBox').show();

    },

    _piUserList: function(app) {

        if ( Ext.getCmp('piUserStoryGrid')){
            Ext.getCmp('piUserStoryGrid').destroy();
        }


        var objList = app.objStr;

        var piStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            storeId: 'piStore',
            fetch: ['FormattedID', 'Name', 'ScheduleState', 'PlanEstimate'],
            hydrate: ['FormattedID', 'Name', 'ScheduleState','PlanEstimate'],
            filters:  [ {
                            property: '_ItemHierarchy',
                            operator: '$in',
                            value: app.objStr
                        },
                        {
                            property: '_TypeHierarchy',
                            value: 'HierarchicalRequirement'
                        },
                        {
                            property: "__At",
                            value: "current"    //Get only the latest version
                        },
                        {
                            property: 'ScheduleState',
                            operator: '<',
                            value: 'Accepted'
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    _.each(data, function(record) {
                        record.set('_ref', '/hierarchicalrequirement/' + record.get('ObjectID'));
                        record.set('_type', 'userstory');
                    });

                    var storyGrid = Ext.create('Rally.ui.grid.Grid', {
                        title: 'Stories not yet Accepted for selected items',
                        id: 'piUserStoryGrid',
                        enableColumnMove: true,
                        enableColumnResize: true,
                        columnCfgs: [
                            {
                                xtype: 'templatecolumn',
                                text: 'ID',
                                dataIndex: 'FormattedID',
                                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
                                width: 50
                            },
                            {
                                text: 'Name',
                                dataIndex: 'Name',
                                flex: 1
                            },
                            {
                                text: ' Schedule State',
                                dataIndex: 'ScheduleState',
                                renderer: function(value) {
                                    return value;
                                }
                            }
                        ],
                        sortableColumns: true,
                        store: store
                    });

                    Ext.getCmp('piStoryBox').add(storyGrid);
                    Ext.getCmp('piStoryBox').setMargin(10);
                    Ext.getCmp('piStoryBox').setBorder(1);
                }
            }
        });

    },
    _piBLockersList: function(app) {

        if ( Ext.getCmp('piBlockerGrid')){
            Ext.getCmp('piBlockerGrid').destroy();
        }


        var objList = app.objStr;

        var piStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            storeId: 'piStore',
            fetch: ['FormattedID', 'Name', 'Blocked', 'BlockedReason', 'ToDo'],
            hydrate: ['FormattedID', 'Name', 'Blocked','BlockedReason', 'ToDo'],
            filters:  [ {
                            property: '_ItemHierarchy',
                            operator: '$in',
                            value: app.objStr
                        },
                        {
                            property: '_TypeHierarchy',
                            value: 'Task'
                        },
                        {
                            property: 'Blocked',
                            value: true
                        },
                        {
                            property: "__At",
                            value: "current"    //Get only the latest version
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    _.each(data, function(record) {
                        record.set('_ref', '/task/' + record.get('ObjectID'));
                        record.set('_type', 'task');
                    });

                    var storyGrid = Ext.create('Rally.ui.grid.Grid', {
                        title: 'Blocked Tasks',
                        id: 'piBlockerGrid',
                        enableColumnMove: true,
                        enableColumnResize: true,
                        columnCfgs: [
                            {
                                xtype: 'templatecolumn',
                                text: 'ID',
                                dataIndex: 'FormattedID',
                                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
                                width: 50
                            },
                            {
                                text: 'Name',
                                dataIndex: 'Name',
                                flex: 1
                            },
                            {
                                text: 'Blocked Reason',
                                dataIndex: 'BlockedReason'
                            },
                            {
                                text: 'To Do',
                                dataIndex: 'ToDo'
                            }
                        ],
                        sortableColumns: true,
                        store: store
                    });

                    Ext.getCmp('piTaskBox').add(storyGrid);
                    Ext.getCmp('piTaskBox').setMargin(10);
                    Ext.getCmp('piTaskBox').setBorder(1);
                }
            }
        });

    },

    _piTestCaseList: function(app) {

        if ( Ext.getCmp('piTestCaseGrid')){
            Ext.getCmp('piTestCaseGrid').destroy();
        }


        var objList = app.objStr;

        var piStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,
            storeId: 'piStore',
            fetch: ['FormattedID', 'Name', 'LastVerdict', 'LastRun', 'Type'],
//            hydrate: ['FormattedID', 'Name'],
            filters:  [ {
                            property: '_ItemHierarchy',
                            operator: '$in',
                            value: app.objStr
                        },
                        {
                            property: '_TypeHierarchy',
                            value: 'TestCase'
                        },
                        {
                            property: "__At",
                            value: "current"    //Get only the latest version
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    _.each(data, function(record) {
                        record.set('_ref', '/testcase/' + record.get('ObjectID'));
                        record.set('_type', 'testcase');
                    });

                    var storyGrid = Ext.create('Rally.ui.grid.Grid', {
                        title: 'TestCases',
                        id: 'piTestCaseGrid',
                        enableColumnMove: true,
                        enableColumnResize: true,
                        columnCfgs: [
                            {
                                xtype: 'templatecolumn',
                                text: 'ID',
                                dataIndex: 'FormattedID',
                                tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate'),
                                width: 50
                            },
                            {
                                text: 'Name',
                                dataIndex: 'Name',
                                flex: 1
                            },
                            {
                                text: 'Last Verdict',
                                dataIndex: 'LastVerdict'
                            },
                            {
                                text: 'Type',
                                dataIndex: 'Type'
                            }
                        ],
                        sortableColumns: true,
                        store: store
                    });

                    Ext.getCmp('piTestCaseBox').add(storyGrid);
                    Ext.getCmp('piTestCaseBox').setMargin(10);
                    Ext.getCmp('piTestCaseBox').setBorder(1);
                }
            }
        });

    },

    _piBurndownChart: function(app) {


        if ( Ext.getCmp('piBurndownChart')){
            Ext.getCmp('piBurndownChart').destroy();
        }

        var objList = app.objStr;

        //We need to get the end date for the original item - so that means no multiples
        if (app.itmStr.split(' ').length !== 1 ){
            Rally.ui.notify.Notifier.show( { message: 'Re-select a single item to get a meaningful Burndown Chart'});
        }

        var burndownchart = Ext.create( 'Rally.ui.chart.Chart', {
            id: 'piBurndownChart',
            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: {
                    _TypeHierarchy: 'HierarchicalRequirement',
                    _ItemHierarchy: {$in:objList},
                    Children: null
                },

                fetch: ['ScheduleState', 'PlanEstimate', 'ObjectId', '_ValidFrom', '_ValidTo', 'To Do'],
                hydrate: ['ScheduleState'],
                sort: {
                    "_ValidFrom": 1
                },
                compress: true,
                useHttpPost: true
            },
            calculatorType: 'BurndownCalculator',
            calculatorConfig: {
                timeZone: "GMT",
                completedScheduleStateNames: ["Accepted", "Released"],
                enableProjections: true,
                //Uncomment to use counts of stories not velocity
//                chartAggregationType: 'storycount',
                startDate: app._getFirstStartDate(app),
                endDate: app._getLastEndDate(app)
            },

            chartColors: [  Rally.util.Colors.logo_red,
                            Rally.util.Colors.blue_med,
                            Rally.util.Colors.lime_med,
                            Rally.util.Colors.grey6
                        ],

            chartConfig: {
                chart: {
                    zoomType: "xy"
                },
                title: {
                    text: 'PI Burndown (Planned Estimate)'
                },
                xAxis: {
                    categories: [],
                    tickmarkPlacement: "on",
                    tickInterval: 14,
                    title: {
                        text: "Days",
                        margin: 12
                    },
                    maxPadding: 0.25,
                    labels: {
                        x: 0,
                        y: 20,
                        overflow: "justify"
                    }
                },
                yAxis: [
                    {
                        title: {
                            text: 'Points'
                        },
                        min: 0
                    }
                ],
                tooltip: {
                    formatter: function () {
                        var floatValue = parseFloat(this.y),
                            value = this.y;

                        if (!isNaN(floatValue)) {
                            value = Math.floor(floatValue * 100) / 100;
                        }

                        return "" + this.x + "<br />" + this.series.name + ": " + value;
                    }
                },
                plotOptions: {
                    series: {
                        marker: {
                            enabled: false,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        },
                        connectNulls: true
                    },
                    column: {
                        pointPadding: 0,
                        borderWidth: 0,
                        stacking: null,
                        shadow: false
                    }
                }
            }
        });
        Ext.getCmp('piBurndownBox').add(burndownchart);
        Ext.getCmp('piBurndownBox').setBorder(1);
    },

    _piTreeList: function(app) {

        if ( Ext.getCmp('piHierarchy')){
            Ext.getCmp('piHierarchy').destroy();
        }

        // Create a sequence of OR 'ed filters
        var oredFilters = [];

        _.each(app.objStr, function (objID) {
            oredFilters.push({ property: 'ObjectID', value: objID});
        });

        var piType = 'portfolioitem/' + Ext.getCmp('typeSelector').rawValue;

        var tree = Ext.create('Rally.ui.tree.PortfolioTree',{
            id: 'piHierarchy',
            topLevelModel: piType,
            topLevelStoreConfig: {
                filters: Rally.data.wsapi.Filter.or(oredFilters)
            },
            emptyText: ' No items of type ' + piType + ' selected' //If we select the wront thing (using "ignore type") then we get nothing
        });
        Ext.getCmp('piTreeBox').add(tree);
        Ext.getCmp('piTreeBox').setBorder(1);
        Ext.getCmp('piTreeBox').setMargin(10);

    },

    _updateDetailsPanes: function(app){

        //Add the first chart after the header.
        app._piTreeList(app);
        app._piBurnupChart(app);
        app._piBurndownChart(app);
        app._piDefectList(app);
        app._piUserList(app);
        app._piBLockersList(app);
        app._piTestCaseList(app);

    },

    typeStore: null,

    launch: function() {

        var app = this;

        //The typeSelector will give us a store with the portfolio hierarchy in it.
        //We can work off the back of that

        var ignoreType = Ext.create( 'Rally.ui.CheckboxField', {
            fieldLabel: 'Ignore Type',
            id: 'ignoreType',
            value: app.appConfig.ignoreType,
            margin: 10,
            listeners: {
                change: function(newVal, OldVal, opts) {
                    app.appConfig.ignoreType = newVal.value;
                    app.saveState();
                }
            }
        });

        var useLowestPiDates = Ext.create( 'Rally.ui.CheckboxField', {
            fieldLabel: 'Use Plan Dates of lowest PI type',
            id: 'useLowestPiDates',
            value: app.appConfig.useLowestPiDates,
            margin: 10,
            listeners: {
                change: function(newVal, OldVal, opts) {
                    app.appConfig.useLowestPiDates = newVal.value;
                    app.saveState();
                    app._updateDetailsPanes(app);
                }
            }
        });


        var typeSelect = Ext.create( 'Rally.ui.combobox.PortfolioItemTypeComboBox', {
            id: 'typeSelector',
            margin: 10,
            listeners: {

                ready: function() {

                    app.typeStore = Ext.getCmp('typeSelector').store;

                    //Load the apps if we know what to do
                    if ( app.itmStr && app.objStr ) {
                        app._updateDetailsPanes(app);
                    }

                    //Add a button so that we can choose something of type in typeSelector
                    Ext.getCmp('headerBox').add( { xtype: 'rallybutton',
                        margin: 10,
                        id: 'doitButton',
                        text: 'Select Item(s)',
                        handler: function() {
                            app._doArtifactChooserDialog(app);
                        }
                    });

                    Ext.getCmp('headerBox').add(ignoreType);
                    Ext.getCmp('headerBox').add(useLowestPiDates);

                }
            }
        });

        Ext.getCmp('headerBox').insert(0, typeSelect);

    }
});

