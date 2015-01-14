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

    portfolioIds: [],
    workItems: [],
    chsrDlg: null,

    getSettingsFields: function() {

        var values = [
            {
                name: 'epicIDs',
                xtype: 'rallytextfield',
                label: " Space separated list of Portfolio Items to include"
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
        if (app.piStore){
            
        }
        else
        {
            Rally.ui.notify.Notifier.show({message: 'Portfolio Type Hierarchy not available. Try and reload page');
        }

        //In the beginning, we have all the items in piStr of type Ext.getCmp('typeSelector').rawValue
        var piList = app.piStr.split(" ");
        var piType = Ext.getCmp('typeSelector').rawValue;

        //Use the lookback API as it allows us to use the '$in' operator
        var piStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            autoLoad: true,

            fetch: ['FormattedID', 'Name', 'Children'],
            filters:  [ {
                            property: 'FormattedID',
                            operator: '$in',
                            value: piList
                        },
                        {
                            property: '_TypeHierarchy',
                            value: 'PortfolioItem/Feature'
                        },
                        {
                            property: "__At",
                            value: "current"    //Get only the latest version
                        }
            ],
            listeners: {
                load: function(store, data, success) {

                    //Add all the items that are lowest level PIs to the collection

                    _.each(data, function(item) {
                    debugger;
                    });
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

        app.chsrDlg = Ext.create('Rally.ui.dialog.SolrArtifactChooserDialog', {
            artifactTypes: 'PortfolioItem/' + Ext.getCmp('typeSelector').rawValue,
            autoShow: true,
            height: 400,
            title: 'Choose ' + Ext.getCmp('typeSelector').rawValue + ' item(s)',
            multiple: true,

            storeConfig: {
                fetch:['UserStories','Name','FormattedID','TypePath','ObjectID','PortfolioItemType']
            },

            listeners: {
                artifactchosen: function(dialogBox, selectedRecord) {

                    //Refresh the list of stuff we are looking at
                    var itmStr = "";

                    selectedRecord.forEach( function(record) {
                        delim = (itmStr === "")?"":" ";
                        itmStr += delim + record.get('FormattedID'); //Add a space as delimiter
                    });

                    //Save list in the settings field for next time
                    app.updateSettingsValues( {
                        settings: {
                            epicIDs: itmStr
                        }
                    });
                    app.piStr = itmStr;

                    //Refresh the text box in the UI
                    app._updatePortfolioItemList(app);

                    //Update all the containers with the details in.
                    app._updateDetailsPanes(app);

                }
            }
        });
    },

    _piBurnupChart: function(app) {

    },

    _updateDetailsPanes: function(app){

        //Fetch a new list of lowest level PIs for the items chosen
        app._findAllLowestLevelPIs(app);

        //Add the first chart after the header.
        app._piBurnupChart(app);
    },

    // The headerbox should contain a feedback textbox for the viewer to see - this may need to have more information!
    _updatePortfolioItemList: function(app){

        if (Ext.getCmp('selectionFromSettings')){
            Ext.getCmp('selectionFromSettings').destroy();
        }
        var txtMsg = Ext.create( 'Ext.form.field.Text', {
                    fieldLabel: 'Current Selected Items',
                    id: 'selectionFromSettings',
                    grow: true,
                    value: app.piStr,
                    border: 0,
                    margin: '0 0 0 10',
                    readOnly: true
                });
        Ext.getCmp('headerBox').insert(1, txtMsg);
    },

    typeStore: null,

    launch: function() {

        var app = this;

        //Check to see if there are some items defined in the settings page.
        //If not, add the button to be a selector
        app.piStr =  app.getSetting('epicIDs');

        //The typeSelector will give us a store with the portfolio hierarchy in it.
        //We can work off the back of that

        var typeSelect = Ext.create( 'Rally.ui.combobox.PortfolioItemTypeComboBox', {
            id: 'typeSelector',
            margin: 10,
            listeners: {
                ready: function() {
                    app.typeStore = Ext.getCmp('typeSelector').store;
                    //Add a button so that we can choose something of type in typeSelector
                    Ext.getCmp('headerBox').add( { xtype: 'rallybutton',
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

        Ext.getCmp('headerBox').add(typeSelect);

        app._updatePortfolioItemList(app);

    }
});
