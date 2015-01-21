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
            id: 'piBurnupBox',
            border: 0,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        },
        {
            xtype: 'container',
            id: 'piBurndownBox',
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

                    //Refresh the text box in the UI
                    app._updatePortfolioItemList(app);

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
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    var defectGrid = Ext.create('Rally.ui.grid.Grid', {
                        title: 'Defects connected to stories for selected items',
                        id: 'piDefectGrid',
                        enableColumnMove: true,
                        enableColumnResize: true,
                        columnCfgs: [
                            {

                                text: 'ID',
                                dataIndex: 'FormattedID',

                            },
                            {
                                text: 'Name',
                                dataIndex: 'Name',
                                flex: 1
                            },
                            {
                                text: 'State',
                                dataIndex: 'State'
                            },
                            {
                                text: 'ScheduleState',
                                dataIndex: 'ScheduleState'
                            }
                        ],
                        store: store
                    });

                    Ext.getCmp('piDefectBox').add(defectGrid);

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
    },

    _piCustomGrid: function(app) {


        if (Ext.getCmp('piGrid'))
        {
            Ext.getCmp('piGrid').destroy();
        }

        var piGrid = Ext.create('Rally.ui.grid.Grid', {
            columnCfgs: [
                'FormattedID',
                'Name'
            ],

            store: Ext.create( 'Rally.data.wsapi.Store', {

                model: app.lowestPiName,
                filters: [
                    function(item) { return false; }
                ]
            }),
            id: 'piGrid'
        });

        Ext.getCmp('piGridBox').add(piGrid);

    },

    _updateDetailsPanes: function(app){

        //Add the first chart after the header.
        app._piBurnupChart(app);
        app._piBurndownChart(app);
        app._piDefectList(app);
//        app._piCustomGrid(app);
    },

    // The headerbox should contain a feedback textbox for the viewer to see - this may need to have more information!
    _updatePortfolioItemList: function(app){

        if (Ext.getCmp('selectionFromSettings')){
            Ext.getCmp('selectionFromSettings').destroy();
        }
        var txtMsg = Ext.create( 'Ext.form.field.Text', {
                    fieldLabel: 'Current Selected',
                    id: 'selectionFromSettings',
                    grow: true,
                    value: app.piStr,
                    border: 0,
                    margin: 10,
                    readOnly: true
                });
        Ext.getCmp('headerBox').add(txtMsg);
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

                    //When the typeSelector is loaded, we have all the type information so that we can now
                    //update the details panes as well

                    if (app.piStr){ //When we first come in, this is not set and the user needs to select something
                        app._updatePortfolioItemList(app);
                        app._findAllLowestLevelPIs(app);
                        app._updateDetailsPanes(app);
                    }
                }
            }
        });

        Ext.getCmp('headerBox').insert(0, typeSelect);

    }
});

