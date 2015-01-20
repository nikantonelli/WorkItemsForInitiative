Ext.define('BurnupCalculator', {
                extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
                config: {
                    completedScheduleStateNames: ['Accepted']
                },
            
                constructor: function(config) {
                    this.initConfig(config);
                    this.callParent(arguments);
                },
            
                getDerivedFieldsOnInput: function() {
                    var completedScheduleStateNames = this.getCompletedScheduleStateNames();
                    return [
                        {
                            "as": "Planned",
                            "f": function(snapshot) {
                                if (snapshot.PlanEstimate) {
                                    return snapshot.PlanEstimate;
                                }
            
                                return 0;
                            }
                        },
                        {
                            "as": "PlannedCompleted",
                            "f": function(snapshot) {
                                if (_.contains(completedScheduleStateNames, snapshot.ScheduleState) && snapshot.PlanEstimate) {
                                    return snapshot.PlanEstimate;
                                }
            
                                return 0;
                            }
                        }
                    ];
                },
            
                getMetrics: function() {
                    return [
                        {
                            "field": "Planned",
                            "as": "Planned",
                            "display": "line",
                            "f": "sum"
                        },
                        {
                            "field": "PlannedCompleted",
                            "as": "Completed",
                            "f": "sum",
                            "display": "column"
                        }
                    ];
                }
});

