Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    items:[
        { xtype: 'container',
            id: 'headerBox',

            items: [
                { xtype: 'rallyportfolioitemtypecombobox',
                    id: 'typeSelector',
                    margin: 10
                }
            ],

            margin: 10,
            layout: 'column',
            border: 5,
            style: {
                borderColor: Rally.util.Colors.cyan,
                borderStyle: 'solid'
            }
        }
    ],

    _findLowestPICollection: function(app,record) {

        //Might need to do recursive function to go down to the lowest level
debugger;

        //As the ArtifactChooserDialog doesn't give us everything and no option to ask for everything,
        //let's refetch the selected item and all it's data... Doh!
        //This will also mean that I can use this function whatever the record type is (as it won't
        //necessarily match the typeSelector)


        //Check if this is the bottom of the type hierarchy

    },


    //Choose an artifact (of a particular type) and from the artifact(s) chosen,
    //find the set of lowest level PI item types that comprise this item

    _doArtifactChooserDialog: function(app) {



        Ext.create('Rally.ui.dialog.SolrArtifactChooserDialog', {
            artifactTypes: 'PortfolioItem/' + Ext.getCmp('typeSelector').rawValue,
            autoShow: true,
            height: 400,
            title: 'Choose ' + Ext.getCmp('typeSelector').rawValue + ' item',
            multiple: true,

            storeConfig: {
                fetch:['UserStories','Name','FormattedID','TypePath','ObjectID','PortfolioItemType']
            },

            listeners: {
                artifactchosen: function(dialogBox, selectedRecord) {

                    var piCollection = {};

                    selectedRecord.forEach( function(record) {
                        piCollection = app._findLowestPICollection(app,record);
                    });
                }
            }
        });
    },

    launch: function() {

        var app = this;

        //Add a button so that we can choose something of type in typeSelector
        Ext.getCmp('headerBox').add( { xtype: 'rallybutton',
            margin: 10,
            text: 'Select Item',
            handler: function() {
                app._doArtifactChooserDialog(app);
            }
        });
    }
});
