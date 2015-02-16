Ext.define('BurnupCalculator', {
                extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
                config: {
                    completedScheduleStateNames: ['Accepted'],
                    inProgressScheduleStateNames: ['In Progress', 'Completed'],
                    toDoScheduleStateNames: ['Backlog', 'Defined' ]
                },
            
                constructor: function(config) {
                    this.initConfig(config);
                    this.callParent(arguments);
                },
            
                getDerivedFieldsOnInput: function() {
                    var completedScheduleStateNames = this.getCompletedScheduleStateNames();
                    var inProgressScheduleStateNames = this.config.inProgressScheduleStateNames;
                    var toDoScheduleStateNames = this.config.toDoScheduleStateNames;

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
                        },
                        {
                            "as": "PlannedInProgress",
                            "f": function(snapshot) {
                                if (_.contains(inProgressScheduleStateNames, snapshot.ScheduleState) && snapshot.PlanEstimate) {
                                    return snapshot.PlanEstimate;
                                }
            
                                return 0;
                            }
                        },
                        {
                            "as": "PlannedToDo",
                            "f": function(snapshot) {
                                if (_.contains(toDoScheduleStateNames, snapshot.ScheduleState) && snapshot.PlanEstimate) {
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
                            "field": "PlannedToDo",
                            "as": "To Do",
                            "f": "sum",
                            "display": "column"
                        },
                        {
                            "field": "PlannedInProgress",
                            "as": "In-progress",
                            "f": "sum",
                            "display": "column"
                        },
                        {
                            "field": "PlannedCompleted",
                            "as": "Accepted",
                            "f": "sum",
                            "display": "column"
                        },
                        {
                            "field": "Planned",
                            "as": "Planned",
                            "display": "line",
                            "f": "sum"
                        }
                    ];
                }
});

