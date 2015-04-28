Ext.define('BurndownCalculator', {
    extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
    mixins: [
        'DateMixin'
    ],

    getDerivedFieldsOnInput: function () {
        var completedStates = this.config.completedScheduleStateNames,
            aggregationType = this.config.chartAggregationType;

        return [
            {
                "as": "RemainingPoints",
                "f": function (snapshot) {
                    var ss = snapshot.ScheduleState;
                    if(completedStates.indexOf(ss) < 0) {
                        if(aggregationType === "storycount") {
                            return 1;
                        } else if (snapshot.PlanEstimate) {
                            return snapshot.PlanEstimate;
                        }
                    }

                    return 0;
                }
            },
            {
                "as": "AcceptedPoints",
                "f": function (snapshot) {
                    var ss = snapshot.ScheduleState;
                    if (completedStates.indexOf(ss) > -1) {
                        if (aggregationType === "storycount") {
                            return 1;
                        } else if (snapshot.PlanEstimate) {
                            return snapshot.PlanEstimate;
                        }
                    }

                    return 0;
                }
            }
        ];
    },

    getMetrics: function () {
        return [
            {
                "field": "RemainingPoints",
                "as": "To Do",
                "f": "sum"
            },
            {
                "field": "AcceptedPoints",
                "as": "Accepted",
                "f": "sum"
            }
        ];
    },

    getSummaryMetricsConfig: function () {
        return [
            {
                'as': 'Scope_max',
                'f': function(seriesData) {
                        var max = 0, i = 0;
                        for (i=0;i<seriesData.length;i++) {
                            if(seriesData[i].Accepted + seriesData[i]['To Do'] > max) {
                                max = seriesData[i].Accepted + seriesData[i]['To Do'];
                            }
                        }
                        return max;
                     }
            }
        ];
    },

    getDerivedFieldsAfterSummary: function () {
        return  [
            {
                "as": "Ideal",
                "f": function (row, index, summaryMetrics, seriesData) {
                    var max = summaryMetrics.Scope_max,
                        increments = seriesData.length - 1,
                        incrementAmount;
                    if(increments === 0) {
                        return max;
                    }
                    incrementAmount = max / increments;
                    return Math.floor(100 * (max - index * incrementAmount)) / 100;
                },
                "display": "line"
            },
            {
                "as": "Prediction",
                "f": function (row, index, summaryMetrics, seriesData) {
                    return null;
                },
                "display": "line",
                "dashStyle": "Dash"
            }
        ];
    },

    getProjectionsConfig: function () {
        var days = (Rally.util.DateTime.fromIsoString(this.config.endDate).getTime() -
            Rally.util.DateTime.fromIsoString(this.config.startDate).getTime()) / (24*1000*60*60);
        var doubleTimeboxEnd = Ext.Date.add(Rally.util.DateTime.fromIsoString(this.config.startDate), Ext.Date.DAY, (Math.floor(days) * 2) - 1);
        var timeboxEnd = Ext.Date.add(Rally.util.DateTime.fromIsoString(this.config.endDate), Ext.Date.DAY, -1);
        if(this.projectionsConfig === undefined) {
            this.projectionsConfig = {
                doubleTimeboxEnd: doubleTimeboxEnd,
                timeboxEnd: timeboxEnd,

                series: [
                    {
                        "as": "Prediction",
                        "field": "To Do"
                    }
                ],
                continueWhile: function (point) {
                    var dt = Rally.util.DateTime.fromIsoString(point.tick);
                    var end = (this.series[0].slope >= 0) ? this.timeboxEnd : this.doubleTimeboxEnd;
                    return point.Prediction > 0 && dt < end;
                }
            };
        }
        return this.projectionsConfig;
    },

    _firstNonZero: function(data) {
         var i;
         for(i=0;i<data.length;i++) {
            if(data[i] > 0) {
                return i;
            }
         }
         return 0;
    },

    _leastSquares: function(todoValues, firstIndex, lastIndex) {
        var n = (lastIndex + 1) - firstIndex;
        var i;
        var sumx = 0.0, sumx2 = 0.0, sumy = 0.0, sumy2 = 0.0, sumxy = 0.0;
        var slope, yintercept;

        //Compute sums of x, x^2, y, y^2, and xy
        for (i = firstIndex; i <= lastIndex; i++) {
            sumx  = sumx  + i;
            sumx2 = sumx2 + i * i;
            sumy  = sumy  + todoValues[i];
            sumy2 = sumy2 + todoValues[i] * todoValues[i];
            sumxy = sumxy + i * todoValues[i];
        }

        slope = (n * sumxy - sumx * sumy) / (n * sumx2 - sumx * sumx);
//        yintercept = (sumy * sumx2 - sumx * sumxy) / (n * sumx2 - sumx * sumx);
//          slope = (sumxy - ((sumx * sumy)/n))/ (sumx2 - ((sumx * sumx)/n));

          //Slightly fewer calculations if you do this
          yintercept = (sumy/n) - (slope * (sumx/n));


        return {slope: slope, yintercept: yintercept};
    },

    runCalculation: function (snapshots) {
        var chartData = this.callParent(arguments);

        if(chartData && chartData.projections) {
            var todoData = chartData.series[0].data;
            var firstTodoIndex = this._firstNonZero(todoData),
            lastTodoIndex = (todoData.length - 1) - chartData.projections.pointsAddedCount;

            var results = this._leastSquares(todoData, firstTodoIndex, lastTodoIndex);

            this.projectionsConfig.series[0].slope = results.slope;

            // project the plot back to the first todo value
            var doingIndex = firstTodoIndex;
            var doingVal = (((results.slope * doingIndex) + results.yintercept) + chartData.series[0].data[0]) - ((results.slope * lastTodoIndex) + results.yintercept);

            while  (doingIndex <= todoData.length) {
                chartData.series[3].data[doingIndex] = doingVal;
                doingIndex++;
                doingVal = (((results.slope * doingIndex) + results.yintercept) + chartData.series[0].data[0]) - ((results.slope * lastTodoIndex) + results.yintercept);
            }

            if(results.slope > 0) {
            // If the slope is up, truncate it at 1.25 of the max scope
                var predictionCeiling = 1.25 * chartData.series[2].Scope_max;
                if (_.max(chartData.series[3].data) > predictionCeiling) {
                    var i;
                    var maxVal = predictionCeiling;
                    for(i=0;i < chartData.series[3].data.length;i++) {
                        if(chartData.series[3].data[i] > predictionCeiling) {
                            chartData.series[3].data[i] = maxVal;
                            maxVal = null;
                        }
                    }
                }
            }
        }

        if(new Date() < this.config.endDate) {
            this._recomputeIdeal(chartData, this.config.endDate);
        }

        return chartData;
    },

    _recomputeIdeal: function(chartData, endDate) {
         var index;
         if(chartData.categories.length < 1) {
            return;
         }
         if(this.workDays.length < 1) {
            return;
         }

         var lastDate = Ext.Date.parse(chartData.categories[chartData.categories.length - 1], 'Y-m-d');
         if(endDate > lastDate) {
            // the scopeEndDate date wasn't found in the current categories...we need to extend categories to include it
            // (honoring "workDays").

            index = chartData.categories.length;
            var dt = Ext.Date.add(lastDate, Ext.Date.DAY, 1);
            while (dt < endDate) {
                while (this.workDays.indexOf(Ext.Date.format(dt, 'l')) === -1) {
                    dt = Ext.Date.add(dt, Ext.Date.DAY, 1);
                }
                if (dt < endDate) {
                    chartData.categories[index++] = Ext.Date.format(dt, 'Y-m-d');
                }
                dt = Ext.Date.add(dt, Ext.Date.DAY, 1);
            }
            index = chartData.categories.length - 1;
         } else {
             // it is in "scope"...set index to the index of the last workday in scope
             index = this._indexOfDate(chartData, endDate);
             if(index === -1) {
                // it's in "scope", but falls on a non-workday...back up to the previous workday
                while (this.workDays.indexOf(Ext.Date.format(endDate, 'l')) === -1) {
                    endDate = Ext.Date.add(endDate, Ext.Date.DAY, -1);
                    index = this._indexOfDate(chartData, endDate);
                }
             }
         }
         if(index < 0) {
            return;
         }
         // set first and last point, and let connectNulls fill in the rest
         var i;
         var seriesData = chartData.series[2].data;
         for (i=1;i<index;i++) {
            seriesData[i] = null;
         }
         seriesData[index] = 0;
    },

    _indexOfDate: function(chartData, date) {
         var dateStr = Ext.Date.format(date, 'Y-m-d');
         return chartData.categories.indexOf(dateStr);
    },

    _removeFutureSeries: function (chartData, seriesIndex, dayIndex) {
        if(chartData.series[seriesIndex].data.length > dayIndex) {
            while(++dayIndex < chartData.series[seriesIndex].data.length) {
                chartData.series[seriesIndex].data[dayIndex] = null;
            }
        }
    },

    _projectionsSlopePositive: function (chartData) {
        if(chartData.projections && chartData.projections.series) {
            return chartData.projections.series[0].slope >= 0;
        }

        return true;
    }
});

