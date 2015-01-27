Ext.define('Rally.app.WorkItemsForInitiative.app', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    settingsScope: 'app',
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
        },
        {
            xtype: 'container',
            id: 'piTaskBox',
            border: 0,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        }
    ],

    piStr: "",
    objStr: [],

    portfolioIds: null,
    workItems: [],
    chsrDlg: null,
    lowestPiName: "",

    getSettingsFields: function() {

        var values = [
            {
                name: 'epicIDs',
                xtype: 'rallytextfield',
                hidden: true
            },
            {
                name: 'epicOBJs',
                xtype: 'Ext.Array',
                hidden: true
            }
        ];

        _.each(values,function(value){
            value.labelWidth = 250;
            value.labelAlign = 'left';
        });

        return values;
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

        //In the beginning, we have all the items in piStr of type Ext.getCmp('typeSelector').rawValue

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
                fetch:['UserStories','Name','FormattedID','TypePath','ObjectID','PortfolioItemType'],
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
                artifactchosen: function(dialogBox, selectedRecord) {

                    //Refresh the list of stuff we are looking at
                    var itmStr = "";
                    var objStr = [];

                    selectedRecord.forEach( function(record) {
                        delim = (itmStr === "")?"":" ";
                        itmStr += delim + record.get('FormattedID');
                        objStr.push(record.get('ObjectID'));
                    });

                    //Save list in the settings field for next time
                    app.updateSettingsValues( {
                        settings: {
                            epicIDs: itmStr,
                            epicOBJs: objStr
                        }
                    });
                    app.piStr = itmStr;
                    app.objStr = objStr;

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

        _.each(app.portfolioIds, function(item) {
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

        _.each(app.portfolioIds, function(item) {
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
                            {
                                text: 'State',
                                dataIndex: 'State'
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

                    Ext.getCmp('piDefectBox').add(defectGrid);
                    Ext.getCmp('piDefectBox').setBorder(1);
                    Ext.getCmp('piDefectBox').setMargin(10);

                    //Update the status banner
                    app._defectStatusBanner(app, data.length);
                }
            }
        });

    },

    _defectStatusBanner: function (app, length) {
debugger;
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
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    _.each(data, function(record) {
                        record.set('_ref', '/hierarchicalrequirement/' + record.get('ObjectID'));
                        record.set('_type', 'userstory');
                    });

                    var storyGrid = Ext.create('Rally.ui.grid.Grid', {
                        title: 'Stories for selected items',
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
                        id: 'piTaskGrid',
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

    _piBurndownChart: function(app) {


        if ( Ext.getCmp('piBurndownChart')){
            Ext.getCmp('piBurndownChart').destroy();
        }

        var objList = app.objStr;

        //We need to get the end date for the original item - so that means no multiples
        if (app.piStr.split(' ').length !== 1 ){
            Rally.ui.notify.Notifier.show( { message: 'Re-select a single item to get a meaningful Burndown Chart'});
        }

        var burndownchart = Ext.create( 'Rally.ui.chart.Chart', {
            id: 'piBurndownchart',
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

        //Can only do tree if one item is selected for now
        if (app.objStr.length  === 1 ){
            var tree = Ext.create('Rally.ui.tree.PortfolioTree',{
                id: 'piHierarchy',
                topLevelModel: piType,
                topLevelStoreConfig: {
                    filters: Rally.data.wsapi.Filter.or(oredFilters)
                },
                emptyText: ' No items of type ' + piType + ' found' //If we select the wront thing (using "ignore type") then we get nothing
            });
            Ext.getCmp('piTreeBox').add(tree);
            Ext.getCmp('piTreeBox').setBorder(1);
            Ext.getCmp('piTreeBox').setMargin(10);

        }
        else {
            Rally.util.notifier.Notifier.show( { message: 'Select a single item and the correct type for Portfolio Hierarchy to be shown'} );
        }
    },

    _updateDetailsPanes: function(app){

        //Add the first chart after the header.
        app._piTreeList(app);
        app._piBurnupChart(app);
        app._piBurndownChart(app);
        app._piDefectList(app);
        app._piUserList(app);
        app._piBLockersList(app);


    },

    typeStore: null,

    launch: function() {

        var app = this;

        //Check to see if there are some items defined in the settings page.
        ids = app.getSetting('epicIDs');
        objs = app.getSetting('epicOBJs');

        if ( ids && objs ) {
            app.piStr = ids ; //user visible
            app.objStr = objs ; //Hidden for our use
        }

        //The typeSelector will give us a store with the portfolio hierarchy in it.
        //We can work off the back of that

        var ignoreType = Ext.create( 'Rally.ui.CheckboxField', {
            fieldLabel: 'Ignore Type',
            id: 'ignoreType',
            value: false,
            margin: 10
        });

        Ext.getCmp('headerBox').add(ignoreType);

        var typeSelect = Ext.create( 'Rally.ui.combobox.PortfolioItemTypeComboBox', {
            id: 'typeSelector',
            margin: 10,
            listeners: {

                ready: function() {
                    app.typeStore = Ext.getCmp('typeSelector').store;
                    //Add a button so that we can choose something of type in typeSelector
                    Ext.getCmp('headerBox').insert(2, { xtype: 'rallybutton',
                        margin: 10,
                        id: 'doitButton',
                        text: 'Select Item(s)',
                        handler: function() {
                            app._doArtifactChooserDialog(app);
                        }
                    });

                }
            }
        });

        Ext.getCmp('headerBox').insert(0, typeSelect);

    }
});

