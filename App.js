Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items:[
        { xtype: 'container',
            id: 'headerBox',

            margin: 10,
            layout: 'column',
            border: 5,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        }
    ],

    piStr: "",
    objStr: "",

    portfolioIds: null,
    workItems: [],
    chsrDlg: null,

    getSettingsFields: function() {

        var values = [
            {
                name: 'epicIDs',
                xtype: 'rallytextfield',
                label: " Space separated list of Portfolio Items",
                readOnly: true
            },
            {
                name: 'epicOBJs',
                xtype: 'rallytextfield',
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

        var lowestPiName = "";

        //Find the lowest level PI type from the store
        if (app.typeStore){
            _.each(app.typeStore.data.items, function(item) {
                if (item.get('Ordinal') === 0){
                    lowestPiName = item.get('TypePath');
                }
            });
        }
        else
        {
            Rally.ui.notify.Notifier.show({message: 'Portfolio Type Hierarchy not available. Try and reload page'});
        }

        //In the beginning, we have all the items in piStr of type Ext.getCmp('typeSelector').rawValue
        var objList = [];

        _.each( app.objStr.split(" "), function(str) {
        
            objList.push(Number(str));
        });

        var piType = Ext.getCmp('typeSelector').rawValue;

        //Use the lookback API as it allows us to use the '$in' operator and gets
        var piStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,

            fetch: ['FormattedID', 'Name', 'Children'],
            hydrate: ['FormattedID'],
            filters:  [ {
                            property: '_ItemHierarchy',
                            operator: '$in',
                            value: objList
                        },
                        {
                            property: '_TypeHierarchy',
                            value: lowestPiName
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
                    var objStr = "";

                    selectedRecord.forEach( function(record) {
                        delim = (itmStr === "")?"":" ";
                        itmStr += delim + record.get('FormattedID'); //Add a space as delimiter
                        objStr += delim + record.get('ObjectID'); //Add a space as delimiter
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

    },

    _updateDetailsPanes: function(app){

debugger;

        //Add the first chart after the header.
        app._piBurnupChart(app);
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
                    }
                }
            }
        });

        Ext.getCmp('headerBox').insert(0, typeSelect);



    }
});
