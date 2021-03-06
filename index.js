
var timeParser = d3.time.format.iso;
var timeFormat = d3.time.format('%c');
var hrf = d3.time.format('%H');
var wdf = d3.time.format('%w.%A');
var timeScale = d3.time.second;
var filenameColors = d3.scale.category10();
var facts = crossfilter();

function data_hrZone(d) {
	if (d.HeartRate == 0) return 0;
	if (d.HeartRate < 102) return 1;
	if (d.HeartRate < 117) return 2;
	if (d.HeartRate < 122) return 3;
	if (d.HeartRate < 150) return 4;
	if (d.HeartRate < 170) return 5;
	if (d.HeartRate < 189) return 6;
	return 7;
}

function data_speedZoneDescription(i) {
	switch(i){
		case 0: return "Stationary";
		case 1: return "<2";
		case 2: return "2-5";
		case 3: return "5-7";
		case 4: return "7-10";
		case 5: return "10-15";
		case 6: return "15-18";
		case 7: return ">18";
		default: "Unknown";
	}
}

function data_speedZone(d) {
	if (d.SpeedKH == 0) return 0;
	if (d.SpeedKH < 2) return 1;
	if (d.SpeedKH < 5) return 2;
	if (d.SpeedKH < 7) return 3;
	if (d.SpeedKH < 10) return 4;
	if (d.SpeedKH < 15) return 5;
	if (d.SpeedKH < 18) return 6;
	return 7;
}


function data_timeZoneDescription(i) {
	switch(i){
		case 0: return "0-5";
		case 1: return "5-10";
		case 2: return "10-15";
		case 3: return "15-20";
		case 4: return "20-25";
		case 5: return "25-30";
		case 6: return "30-35";
		case 7: return ">35";
		default: "Unknown";
	}
}

function data_timeZone(d) {
	if (d.TimeMoving < (5*60*1000)) return 0;
	if (d.TimeMoving < (10*60*1000)) return 1;
	if (d.TimeMoving < (15*60*1000)) return 2;
	if (d.TimeMoving < (20*60*1000)) return 3;
	if (d.TimeMoving < (25*60*1000)) return 4;
	if (d.TimeMoving < (30*60*1000)) return 5;
	if (d.TimeMoving < (35*60*1000)) return 6;
	return 7;
}
function data_timeZone2(d) {
	if (d < (5*60*1000)) return 0;
	if (d < (10*60*1000)) return 1;
	if (d < (15*60*1000)) return 2;
	if (d < (20*60*1000)) return 3;
	if (d < (25*60*1000)) return 4;
	if (d < (30*60*1000)) return 5;
	if (d < (35*60*1000)) return 6;
	return 7;
}

function is_stationary(d) {
	return d.LapType == "Stationary";
}

function is_walking(d) {
	return d.LapType != "Stationary" && d.SpeedKH < 6;
}

function is_running(d) {
	return d.LapType != "Stationary" && d.SpeedKH >= 6;
}

function interactive_dataTable(thechart) {
  return thechart.on('renderlet', function(chart) {
    chart.selectAll('tr.dc-table-group').style('display','none');
    
    chart.selectAll('.dc-table-row')
      .style('cursor','pointer')
      .on('mouseover',function(d) {
        d3.select(this).style('font-weight','bold');
      })
      .on('mouseout',function(d) {
        d3.select(this).style('font-weight','normal');
      })
      .on('click', function(d) {
        dc.events.trigger(function () {
          chart.filter(d.key);
          chart.redrawGroup();
        });
      })
      .classed('success',function(d) { return chart.filters().filter(function(f){return f==d.key; }).length > 0; })
      .classed('active',function(d){ return chart.hasFilter() == 0 ? false : chart.filters().filter(function(f){return f!=d.key; }).length > 0; })
	  .each(function(d) {
		  d3.select(this.parentNode/*tbody*/.parentNode/*table*/.parentNode/*panel-body*/.parentNode)
		  .classed('panel-success',function() { return chart.hasFilter() ? false : true })
		  .classed('panel-default',function(){ return chart.hasFilter() ? true : false});
	  });
  });
}

var chartPointsCount = dc.numberDisplay("#chart-total-points");

chartPointsCount
  .group(facts.groupAll().reduceCount())
  .formatNumber(d3.round)
  .valueAccessor(function(d) { return d; });

  
  
  
  
var activityDim = facts.dimension(function(d) { return d.Activity; });
var fileDim = facts.dimension(function(d) { return d.File; });
var lapTypeDim = facts.dimension(function(d) { return d.LapType; });
var timeTypeDim = facts.dimension(function(d) {
  if (is_stationary(d)) return "stationary";
  if (is_walking(d)) return "walking";
  if (is_running(d)) return "running";
  return "Unknown";
});
var perMinuteDim = facts.dimension(function(d) { return d3.time.minute(d.Time); });
var deviceDim = facts.dimension(function(d) { return d.Device; });
var hrZoneDim = facts.dimension(function(d) { return data_hrZone(d); });


function group_get_length(group,filter) {
  return {
    all:function () {
      if (filter)
        return [group.all().filter(filter).length];
      return [group.all().length];
    }
  };
}

function group_reduceCountTotal(group,fn) {
  return group.reduce(function(p,v) {
      p.count++;
      p.total+=fn(v);
      return p;
    }, function(p,v) {
      p.count--;
      p.total-=fn(v);
      return p;
    }, function() {
      return {count:0, total:0};
    });
}

function group_reduceSum(group,accessor = function(d) { return d;},filter=undefined) {
  if (filter == undefined) {
    filter = function(d) { return true; }
  }
  return group.reduce(function(p,v) {
    if (!filter(v)) return p;
      p.total+=accessor(v);
      return p;
    }, function(p,v) {
    if (!filter(v)) return p;
      p.total-=accessor(v);
      return p;
    }, function() {
      return {total:0};
    });
}



function group_reduceCountKey(group,keyfn) {
  function add(p, v) {
    if (!p.has(keyfn(v))) {
      p.set(keyfn(v), 0);
    }
    
    p.set(keyfn(v), p.get(keyfn(v))+1);
    return p;
  }

  function rem(p, v) {
    p.set(keyfn(v), p.get(keyfn(v))-1);
    if (p.get(keyfn(v)) <= 0) {
      p.remove(keyfn(v));
    }
    return p;
  }

  function init() {
    return d3.map()
  }
  
  return group.reduce(add,rem,init);
}

function group_reduceKeySum(group,fn,uniq) {
  
  function add(p, v, nf) {
    var key = v.key;
    var val = fn(v);
    
    if (!p.has(key)) {
      p.set(key, {count: 0, value: 0});
    }
    
    p.get(key).count++;
    
    if (p.get(key).count == 1 || !uniq)  {
      p.get(key).value += val;
    }
    
    return p;
  }

  function rem(p, v, nf) {
    var key = v.key;
    var val = fn(v);
    
    if (p.get(key).count == 1 || !uniq)  {
      p.get(key).value -= val;
    }
  
    p.get(key).count--;
    
    if (p.get(key).count == 0) {
      p.remove(key);
    }
    
    return p;
  }

  function init() {
    return d3.map()
  }
  
  return group.reduce(add,rem,init);
}






function group_reduceMap(group,keyFunc) {
  return group.reduce(
	function(p,v) {
	  if (!p.has(keyFunc(v))) {
	    p.set(keyFunc(v),v);
	  }
	  return p;
    }, function(p,v) {
	  if (p.has(keyFunc(v))) {
	    p.remove(keyFunc(v));
	  }
      return p;
    }, function() {
      return d3.map();
    });
}

function group_reduceMappedValue(group,keyFunc,valueFunc) {
  return group.reduce(
	function(p,v) {
	  if (!p.has(keyFunc(v))) {
      p.set(keyFunc(v),d3.map());
	  }
    p.get(keyFunc(v)).set(valueFunc(v),v);
	  return p;
    }, function(p,v) {
	  if (p.has(keyFunc(v))) {
      if (p.get(keyFunc(v)).has(valueFunc(v))) {
        p.get(keyFunc(v)).remove(valueFunc(v));
      }
      if (p.get(keyFunc(v)).size() == 0) {
        p.remove(keyFunc(v));
      }
	  }
      return p;
    }, function() {
      return d3.map();
    });
}

var chartTotalDistance = dc.numberDisplay("#chart-total-activities");
chartTotalDistance
  .group(group_get_length(fileDim.group().reduceCount(), function(d){ return d.value; }))
  .formatNumber(d3.round)
  .valueAccessor(function(d) { return d; });
  
  
  
  
  

var chartTotalDistance = dc.numberDisplay("#chart-total-distance");

chartTotalDistance
  .group(facts.groupAll().reduceSum(function(d) { return d.DistancePoint; }))
  .formatNumber(function(d) {
    return d3.round(d / 1000,2);
  })
  .valueAccessor(function(d) { return d; });



var chartTotalTime = dc.numberDisplay("#chart-total-time");
chartTotalTime
  .group(facts.groupAll().reduceSum(function(d) { return d.TimePoint; }))
  .formatNumber(function(d) {
    return formatSeconds(d3.round(d / 1000), true, true);
  })
  .valueAccessor(function(d) { return d; });


var chartTotalStationaryTime = dc.numberDisplay("#chart-total-stationarytime");
chartTotalStationaryTime
  .group(group_reduceSum(facts.groupAll(), function(d){return d.TimePoint; }, is_stationary))
  .formatNumber(function(d) {
    return formatSeconds(d3.round(d / 1000), true, true);
  })
  .valueAccessor(function(d) { return d.total; });


var chartTotalWalkingTime = dc.numberDisplay("#chart-total-walkingtime");
chartTotalWalkingTime
  .group(group_reduceSum(facts.groupAll(), function(d){return d.TimePoint; }, is_walking))
  .formatNumber(function(d) {
    return formatSeconds(d3.round(d / 1000), true, true);
  })
  .valueAccessor(function(d) { return d.total; });


var chartTotalRunningTime = dc.numberDisplay("#chart-total-runningtime");
chartTotalRunningTime
  .group(group_reduceSum(facts.groupAll(), function(d){return d.TimePoint; }, is_running))
  .formatNumber(function(d) {
    return formatSeconds(d3.round(d / 1000), true, true);
  })
  .valueAccessor(function(d) { return d.total; });
  
  



var chartAvgPace = dc.numberDisplay("#chart-total-avgpace");
chartAvgPace.group(group_reduceCountTotal(facts.groupAll(), function(d) { return d.PaceSK; }))
  .formatNumber(function(d) {
    return formatSeconds(d,false);
  })
  .valueAccessor(function(d) { 
  if (d.count==0) return 0;
    return d.total/d.count;
  });

var chartAvgSpeedMM = dc.numberDisplay("#chart-total-avgspeed-mm");
chartAvgSpeedMM.group(group_reduceCountTotal(facts.groupAll(), function(d) { return d.SpeedMM; }))
  .formatNumber(function(d) {
    return d3.round(d,1);
  })
  .valueAccessor(function(d) { 
  if (d.count==0) return 0;
    return d.total/d.count;
  });

var chartAvgHeartRate = dc.numberDisplay("#chart-total-avgheartrate");
chartAvgHeartRate
  .group(group_reduceCountTotal(facts.groupAll(), function(d) { return d.HeartRate; }))
  .formatNumber(function(d) {
    return d3.round(d);
  })
  .valueAccessor(function(d) { 
    if (d.count==0) return 0;
    return d.total/d.count;
  });

var chartAvgCadence = dc.numberDisplay("#chart-total-avgcadence");
chartAvgCadence
  .group(group_reduceCountTotal(facts.groupAll(), function(d) { return d.Cadence ? d.Cadence : 0; }))
  .formatNumber(function(d) {
    return d3.round(2*d);
  })
  .valueAccessor(function(d) { 
    if (d.count==0) return 0;
    return d.total/d.count;
  });


var chartActivityTable = interactive_dataTable(dc.dataTable("#chart-activity-table"));

var activityCountGroup = group_reduceCountKey(activityDim.group(), function(d){return d.File; });

chartActivityTable
  .dimension({
      filter: function(f) {
        activityDim.filter(f);
      },
      filterExact: function(v) {
        activityDim.filterExact(v);
      },
      filterFunction: function(f) {
        activityDim.filterFunction(f);
      },
      filterRange: function(r) {
        activityDim.filterRange(r);
      },
      bottom: function(sz) {
        var gdata = activityCountGroup.all();
        return gdata.filter(function(d,i) { return d.value.size(); });;
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return d.key; },
    function(d) { return "<span class=\"badge\">"+d.value.size()+"</span>"; }
  ]);

var chartLapTypeTable = interactive_dataTable(dc.dataTable("#chart-laptype-table"));

var lapTypeCountGroup = group_reduceCountKey(lapTypeDim.group(), function(d){return d.File; });

chartLapTypeTable
  .dimension({
      filter: function(f) {
        lapTypeDim.filter(f);
      },
      filterExact: function(v) {
        lapTypeDim.filterExact(v);
      },
      filterFunction: function(f) {
        lapTypeDim.filterFunction(f);
      },
      filterRange: function(r) {
        lapTypeDim.filterRange(r);
      },
      bottom: function(sz) {
        var gdata = lapTypeCountGroup.all();
        return gdata.filter(function(d,i) { return d.value.size(); });;
      }
  })
  .group(function(d) { return "Lap Type"; })
  .columns([
    function(d) { return d.key; },
    function(d) { return "<span class=\"badge\">"+d.value.size()+"</span>"; }
  ]);
  
  
var chartDeviceTable = interactive_dataTable(dc.dataTable("#chart-device-table"));

var deviceCountGroup = group_reduceCountKey(deviceDim.group(), function(d){return d.File; });

chartDeviceTable
  .dimension({
      filter: function(f) {
        deviceDim.filter(f);
      },
      filterExact: function(v) {
        deviceDim.filterExact(v);
      },
      filterFunction: function(f) {
        deviceDim.filterFunction(f);
      },
      filterRange: function(r) {
        deviceDim.filterRange(r);
      },
      bottom: function(sz) {
        var gdata = deviceCountGroup.all();
        return gdata.filter(function(d,i) { return d.value.size(); });
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return d.key; },
    function(d) { return "<span class=\"badge\">"+d.value.size()+"</span>"; }
  ]);
  
  
  




function PaceSK(d){
  if (d.SpeedMS == 0) return 0; //do not store as Infinity
  return 1000/d.SpeedMS;
}


var chartActivitySummaryTable = interactive_dataTable(dc.dataTable("#chart-activity-summary-table"));

var activitySummaryGroup = group_reduceMap(fileDim.group(), function(d) { return d.PointIndex; });

chartActivitySummaryTable
  .dimension({
      filter: function(f) {
        fileDim.filter(f);
      },
      filterExact: function(v) {
        fileDim.filterExact(v);
      },
      filterFunction: function(f) {
        fileDim.filterFunction(f);
      },
      filterRange: function(r) {
        fileDim.filterRange(r);
      },
      bottom: function(sz) {
        var gdata = activitySummaryGroup.all();
        return gdata.filter(function(d,i) { return d.value.size(); });
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) {
      if (d.value.size()) {
        var svg = '<svg height=20 width=20><rect width="20" height="20" stroke="'+d.value.entries()[0].value.Color+'" fill="'+d.value.entries()[0].value.Color+'"></rect></svg>';
        return svg + ' <span title="'+d.value.entries()[0].value.ActivityStart+'">'+d.key+'</span> '+ "<small>"+d.value.size()+"</small>";
      } else {
        return '<span>'+d.key+'</span>';
      }
    },
    function(d) { return formatSeconds(d3.sum(d.value.entries(), function(e){return e.value.TimePoint;})/1000,false); },
    function(d) {  return d3.round(d3.sum(d.value.entries(), function(e){return e.value.DistancePoint;})/1000,2); },
    function(d) { 
      //calculate Pace with available data
      var runTime = d3.sum(d.value.entries(), function(e){return e.value.TimePoint;})/1000;
      var runDistance = d3.round(d3.sum(d.value.entries(), function(e){return e.value.DistancePoint;})/1000,2);
      var Pace= formatSeconds(runTime/runDistance,false);
      return Pace;
    },
    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.SpeedKH;})/d.value.size(),2); },
    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.SpeedMM})/d.value.size(),2); },

    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.HeartRate})/d.value.size(),1); },
    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.Cadence})/d.value.size(),1)*2; },

  ]);










function timePanel_register(type,disable=[]) {
  d3.select('#panel-'+type+'-time')
    .style('cursor','pointer')
    .on('click', function() {
      
      dc.events.trigger(function () {
        if (timeTypeDim.hasCurrentFilter()) {
          timeTypeDim.filter(null);
          d3.select('#panel-'+type+'-time').classed('panel-default',false);
          d3.select('#panel-'+type+'-time').classed('panel-warning',true);
          d3.select('#panel-'+type+'-time').classed('panel-success',false);
          disable.forEach(function(d) {
            d3.select('#panel-'+d+'-time').classed('panel-default',false);
            d3.select('#panel-'+d+'-time').classed('panel-warning',true);
            d3.select('#panel-'+d+'-time').classed('panel-success',false);
          });
        } else {
          timeTypeDim.filter(type);
          d3.select('#panel-'+type+'-time').classed('panel-default',false);
          d3.select('#panel-'+type+'-time').classed('panel-warning',false);
          d3.select('#panel-'+type+'-time').classed('panel-success',true);
          disable.forEach(function(d) {
            d3.select('#panel-'+d+'-time').classed('panel-default',true);
            d3.select('#panel-'+d+'-time').classed('panel-warning',false);
            d3.select('#panel-'+d+'-time').classed('panel-success',false);
          });
        }
        dc.redrawAll();
      });
    });
}

timePanel_register('running',['walking','stationary']);
timePanel_register('walking', ['running','stationary']);
timePanel_register('stationary',['running','walking']);



// keep track of the dimensions/groups for optimization purposes
// TODO would be easier to understand if the dims were passed to the timetable, rather than it generating/caching
var timetabledims = d3.map();
var timetablegroups = d3.map();

function timetable(name, timefmt, timefn, txt, keyfn, valuefn) {

var chartDayTable = interactive_dataTable(dc.dataTable("#chart-"+name+"-table"));

var dim;
if (!timetabledims.has(name)) {
	dim = facts.dimension(function(d) { return timefmt(timefn(d.Time)); });
	timetabledims.set(name, dim);
} else {
	dim = timetabledims.get(name);
}

var grp;
if (!timetablegroups.has(name)) {
	grp = group_reduceMap(dim.group(), function(d) { return d.File+d.PointIndex; });
	timetablegroups.set(name, grp);
} else {
	grp = timetablegroups.get(name);
}

chartDayTable
  .dimension({
      filter: function(f) {
        dim.filter(f);
      },
      filterExact: function(v) {
        dim.filterExact(v);
      },
      filterFunction: function(f) {
        dim.filterFunction(f);
      },
      filterRange: function(r) {
        dim.filterRange(r);
      },
      bottom: function(sz) {
        var gdata = grp.all();
        return gdata.filter(function(d,i) { return d.value.size(); });
      }
  })
  .group(function(d) { return name; })
  .columns([
    function(d) { 
		var v = d.key;
		if (keyfn) v = keyfn(d);
		return v + (txt && d.key == timefmt(new Date()) ? " <small>"+txt(d)+"</small>" : ""); 
	},
    function(d) { return "<span class=\"badge\">"+(valuefn ? valuefn(d) : d.value.size())+"</span>"; }
  ]);

}

function showactivityfiles(d) { var summary = summaryPanel_calculate(d); return summary.files; }

timetable('year', d3.time.format("%Y"), d3.time.year, function(d) { return 'This Year'; }, null, showactivityfiles);
timetable('month', d3.time.format("%m %B"), d3.time.month, function(d) { return 'This Month'; }, function (d) { return d.key.split(/\W/)[1]; }, showactivityfiles);
timetable('week', d3.time.format("%W"), d3.time.week, function(d) { return 'This Week'; }, null, showactivityfiles);
timetable('day', d3.time.format("%w %A"), d3.time.day, function(d) { return 'Today'; }, function (d) { return d.key.split(/\W/)[1]; }, showactivityfiles);










function summaryPanel_calculate(d) {
    if (d == null) return {distance:0,time:0,files:0};
    
    var files = d3.set();
    var totalTime = 0;
    var totalDistance = 0;
    d.value.entries().forEach(function(e) {
      files.add(e.value.File);
      totalDistance += e.value.DistancePoint;
      totalTime += e.value.TimePoint;
    });
    
    return {distance:totalDistance,time:totalTime,files:files.size()};
}

var summarytablegroups = d3.map();
function summaryPanel2(name,timefn,timefmt,valuefn,timeoffset,grpname) {
	if (!grpname) grpname = name;

	var now = timefn(new Date());
	if (timeoffset) now = timefn.offset(now, timeoffset);

	d3.select("#chart-summary-"+name+"-value").text(valuefn ? valuefn(timefmt(now)) : timefmt(now));
	
	if (!summarytablegroups.has(grpname)) {
		var dim = facts.dimension(function(d) { return timefmt(timefn(d.Time)); });
		summarytablegroups.set(grpname, group_reduceMap(dim.group(), function(d) { return d.File+d.PointIndex; }));
	}
	
	var customgrp = {
		  value: function() {
			  // TODO could reuse the cached groups from timetable()
			  var ret = summarytablegroups.get(grpname).all().filter(function(d) { return d.key == timefmt(now); });
			  return ret.length ? ret[0] : null;
		  }
	  };

	dc.numberDisplay("#chart-summary-"+name+"-activities")
	  .group(customgrp)
	  .formatNumber(function(d){
		return "<span class=\"badge\">"+d3.round(d)+"<span>";
	  })
	  .valueAccessor(function(d) { return summaryPanel_calculate(d).files; });
	  
	dc.numberDisplay("#chart-summary-"+name+"-distance")
		.group(customgrp)
		.formatNumber(function(d){ return d3.round(d/1000,2)+"<small>km</small>"; })
		.valueAccessor(function(d) { return summaryPanel_calculate(d).distance; });
	
	dc.numberDisplay("#chart-summary-"+name+"-time")
		.group(customgrp)
		.formatNumber(function(d){ return formatSeconds(d3.round(d / 1000), true, true); })
		.valueAccessor(function(d) { return summaryPanel_calculate(d).time; });
}

summaryPanel2('year', d3.time.year, d3.time.format("%Y"));
summaryPanel2('month',d3.time.month, d3.time.format("%m %B %Y"), function (d) { return d.split(/\W/)[1]; });
summaryPanel2('week',d3.time.week, d3.time.format("%Y %W"), function (d) { return d.split(/\W/)[1]; });
summaryPanel2('day',d3.time.day, d3.time.format("%w %A %d %m %Y"), function (d) { return d.split(/\W/)[1]; });

summaryPanel2('lastyear', d3.time.year, d3.time.format("%Y"), null, -1, 'year');
summaryPanel2('lastmonth',d3.time.month, d3.time.format("%m %B %Y"), function (d) { return d.split(/\W/)[1]; }, -1, 'month');
summaryPanel2('lastweek',d3.time.week, d3.time.format("%Y %W"), function (d) { return d.split(/\W/)[1]; }, -1, 'week');
summaryPanel2('yesterday',d3.time.day, d3.time.format("%w %A %d %m %Y"), function (d) { return d.split(/\W/)[1]; }, -1, 'day');

summaryPanel2('lastyear2', d3.time.year, d3.time.format("%Y"), null, -2, 'year');
summaryPanel2('lastmonth2',d3.time.month, d3.time.format("%m %B %Y"), function (d) { return d.split(/\W/)[1]; }, -2, 'month');
summaryPanel2('lastweek2',d3.time.week, d3.time.format("%Y %W"), function (d) { return d.split(/\W/)[1]; }, -2, 'week');
summaryPanel2('lastday2',d3.time.day, d3.time.format("%w %A %d %m %Y"), function (d) { return d.split(/\W/)[1]; }, -2, 'day');

summaryPanel2('lastyear3', d3.time.year, d3.time.format("%Y"), null, -3, 'year');
summaryPanel2('lastmonth3',d3.time.month, d3.time.format("%m %B %Y"), function (d) { return d.split(/\W/)[1]; }, -3, 'month');
summaryPanel2('lastweek3',d3.time.week, d3.time.format("%Y %W"), function (d) { return d.split(/\W/)[1]; }, -3, 'week');
summaryPanel2('lastday3',d3.time.day, d3.time.format("%w %A %d %m %Y"), function (d) { return d.split(/\W/)[1]; }, -3, 'day');










// the time zones are based on the currently available data (non-filtered)
// TODO a custom group/dimension allows the dimension to be recalculated?
var chartTimeTable = interactive_dataTable(dc.dataTable("#chart-time-table"));
var chartTimeColors = colorbrewer.Blues[8];
var timeZoneDim = facts.dimension(function(d) { return d.TimeZone; });

chartTimeTable
  .dimension({
      filter: function(f) {
        timeZoneDim.filter(f);
      },
      filterExact: function(v) {
        timeZoneDim.filterExact(v);
      },
      filterFunction: function(f) {
        timeZoneDim.filterFunction(f);
      },
      filterRange: function(r) {
        timeZoneDim.filterRange(r);
      },
      bottom: function(sz) {
		var allzones = d3.map({
			0:{html:'<span>'+data_timeZoneDescription(0)+'</span>',value:d3.map(),points:[]},
			1:{html:'<span>'+data_timeZoneDescription(1)+'</span>',value:d3.map(),points:[]},
			2:{html:'<span>'+data_timeZoneDescription(2)+'</span>',value:d3.map(),points:[]},
			3:{html:'<span>'+data_timeZoneDescription(3)+'</span>',value:d3.map(),points:[]},
			4:{html:'<span>'+data_timeZoneDescription(4)+'</span>',value:d3.map(),points:[]},
			5:{html:'<span>'+data_timeZoneDescription(5)+'</span>',value:d3.map(),points:[]},
			6:{html:'<span>'+data_timeZoneDescription(6)+'</span>',value:d3.map(),points:[]},
			7:{html:'<span>'+data_timeZoneDescription(7)+'</span>',value:d3.map(),points:[]}
		});
    
    //reset the time zone
    timeZoneDim.dispose();
    timeZoneDim = undefined;
    facts.all().forEach(function(d) {
     d.TimeZone = -1;
    });
    
    
    var all = facts.allFiltered();
    
    var peractivity = d3.nest()
      .key(function(d){return d.File; })
      .rollup(function(values){
        var sorted = values.sort(function(a,b){return d3.ascending(a.TimeMoving,b.TimeMoving); });
        
        var first = sorted[0];
        
        var pertimezone = d3.nest()
          .key(function(d){ return data_timeZone2(d.TimeMoving - first.TimeMoving); })
          .entries(sorted);
        
        return pertimezone;
      })
      .entries(all);

   var mappp = {};
    
    peractivity.forEach(function(d) {
      var file = d.key;
      var zones = d.values;
      
      zones.forEach(function(e) {
        var zone = e.key;
        var datapoints = e.values;
        
        datapoints.forEach(function(p) {
          allzones.get(zone).points.push(p);
          // keep track of points and their new zone
          if (!(file in mappp)) mappp[file] = {};
          mappp[file][p.PointIndex] = zone;

          //TODO horribly inefficient!?
          //find the real matching fact and set its zone
        });
      });
    });
          facts.all()
          .forEach(function(d) {
            if (d.File in mappp && d.PointIndex in mappp[d.File])
              d.TimeZone = mappp[d.File][d.PointIndex];
          });
    
    timeZoneDim = facts.dimension(function(d) { return d.TimeZone; });

        return allzones.entries();
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return '<svg height=20 width=20><rect width="20" height="20" stroke="'+chartTimeColors[d.key]+'" '+(d.value.points.length == 0 ? 'fill-opacity="0.3"' : '')+' fill="'+chartTimeColors[d.key]+'"></rect></svg>'; },
    function(d) { return d.value.html; },
    function(d) { return "<span class=\"badge\">"+d3.nest().key(function(d){return d.File; }).entries(d.value.points).length+"</span>"; },
    function(d) { return "<small>"+d.value.points.length+"</small>"; }
  ]);






var chartSpeedTable = interactive_dataTable(dc.dataTable("#chart-speed-table"));
var chartSpeedColors = d3.merge([['grey'],colorbrewer.Greens[7]]);
var speedZoneDim = facts.dimension(function(d) { return data_speedZone(d); });
var speedCountGroup = group_reduceCountKey(speedZoneDim.group(), function(d){return d.File; });

chartSpeedTable
  .dimension({
      filter: function(f) {
        speedZoneDim.filter(f);
      },
      filterExact: function(v) {
        speedZoneDim.filterExact(v);
      },
      filterFunction: function(f) {
        speedZoneDim.filterFunction(f);
      },
      filterRange: function(r) {
        speedZoneDim.filterRange(r);
      },
      bottom: function(sz) {
		var allzones = d3.map({
			0:{html:'<span>'+data_speedZoneDescription(0)+'</span>',value:d3.map()},
			1:{html:'<span>'+data_speedZoneDescription(1)+'</span>',value:d3.map()},
			2:{html:'<span>'+data_speedZoneDescription(2)+'</span>',value:d3.map()},
			3:{html:'<span>'+data_speedZoneDescription(3)+'</span>',value:d3.map()},
			4:{html:'<span>'+data_speedZoneDescription(4)+'</span>',value:d3.map()},
			5:{html:'<span>'+data_speedZoneDescription(5)+'</span>',value:d3.map()},
			6:{html:'<span>'+data_speedZoneDescription(6)+'</span>',value:d3.map()},
			7:{html:'<span>'+data_speedZoneDescription(7)+'</span>',value:d3.map()}
		});
		
        speedCountGroup.all().forEach(function(d) {
			d.value.entries().forEach(function(e) {
				allzones.get(d.key).value.set(e.key,e.value);
			});
		});
		allzones.entries().forEach(function(d) {
			d.value['color'] = chartSpeedColors[d.key];
		});
        return allzones.entries();
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return '<svg height=20 width=20><rect width="20" height="20" stroke="'+d.value.color+'" '+(d.value.value.size() == 0 ? 'fill-opacity="0.3"' : '')+' fill="'+d.value.color+'"></rect></svg>'; },
    function(d) { return d.value.html; },
    function(d) { return "<span class=\"badge\">"+d.value.value.size()+"</span>"; },
    function(d) { return "<small>"+d3.sum(d.value.value.entries(),function(d){return d.value; })+"</small>"; }
  ]);








var chartHRZoneTable = interactive_dataTable(dc.dataTable("#chart-hrzone-table"));
var chartHRZoneColors = d3.merge([['grey'],colorbrewer.Reds[7]]);

var hrZoneCountGroup = group_reduceCountKey(hrZoneDim.group(), function(d){return d.File; });

chartHRZoneTable
  .dimension({
      filter: function(f) {
        hrZoneDim.filter(f);
      },
      filterExact: function(v) {
        hrZoneDim.filterExact(v);
      },
      filterFunction: function(f) {
        hrZoneDim.filterFunction(f);
      },
      filterRange: function(r) {
        hrZoneDim.filterRange(r);
      },
      bottom: function(sz) {
		// TODO consolidate into data_hrZone
		var allzones = d3.map({
			0:{html:'<span>None</span>',value:d3.map()},
			1:{html:'<span>&le;102</span>',value:d3.map()},
			2:{html:'<span>102-117 <small>Z1</small></span>',value:d3.map()},
			3:{html:'<span>117-122 <small>Z2</small></span>',value:d3.map()},
			4:{html:'<span>122-150 <small>Z3</small></span>',value:d3.map()},
			5:{html:'<span>150-170 <small>Z4</small></span>',value:d3.map()},
			6:{html:'<span>170-189 <small>Z5</small></span>',value:d3.map()},
			7:{html:'<span>&ge;190</span>',value:d3.map()}
		});
		
        hrZoneCountGroup.all().forEach(function(d) {
			d.value.entries().forEach(function(e) {
				allzones.get(d.key).value.set(e.key,e.value);
			});
		});
		allzones.entries().forEach(function(d) {
			d.value['color'] = chartHRZoneColors[d.key];
		});
        return allzones.entries();
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return '<svg height=20 width=20><rect width="20" height="20" stroke="'+d.value.color+'" '+(d.value.value.size() == 0 ? 'fill-opacity="0.3"' : '')+' fill="'+d.value.color+'"></rect></svg>'; },
    function(d) { return d.value.html; },
    function(d) { return "<span class=\"badge\">"+d.value.value.size()+"</span>"; },
    function(d) { return "<small>"+d3.sum(d.value.value.entries(),function(d){return d.value; })+"</small>"; }
  ]);
  


// map chart for activities
dc.mapChart = function (parent, chartGroup) {
  var _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin({})));
  
  _chart._mandatoryAttributes(['dimension']);
  
  var _G;
  var _width, _height;
  var _projection, _zoom, _path;
  var _graticule;
  var _canvas, _inMemoryDom;
  var _plotPoints, _pointZoom, _plotLines, _showScale;
  
  var _lonAccessor = function(d) { return d[0]; };
  var _latAccessor = function(d) { return d[1]; };
  
  var _initialScale = 1500000,
      _scaleExtent = [100000, 2000000],
      _mapCenter = [138.6137772537768, -34.81516915373504];
  
  var _showGraticule = false,
      _useCanvas = false,
      _graticuleStep = [10, 10];
  
  function _zoomed() {
    _projection
      .translate(_zoom.translate())
      .scale(_zoom.scale());
    console.log('zoom',_projection.scale(),_projection.translate());
	
  
    _chart.redraw();
  }
    
  _chart._doRender = function () {
    console.log('render map');
    _chart.resetSvg();
    
    _width = _chart.width() - _chart.margins().right - _chart.margins().left;
    _height = _chart.height() - _chart.margins().top - _chart.margins().bottom;
    
    _projection = d3.geo.mercator()
      .scale(_initialScale)
      .center(_mapCenter)
      .translate([_width / 2, _height / 2]);
    
    _zoom = d3.behavior.zoom()
      .translate([_width / 2, _height / 2])
      .scale(_initialScale)
      .scaleExtent(_scaleExtent)
      .on("zoom", _zoomed);
        
    _path = d3.geo.path()
      .projection(_projection);

    if (_chart.useCanvas()) {
      _inMemoryDom = document.createElement("custom");
      _G = d3.select(_inMemoryDom);
      _chart.svg().remove();
      _canvas = _chart.root().append('canvas').attr('width', _width).attr('height',_height);
    
      _canvas
        .call(_zoom)
        .call(_zoom.event);
      
      //TODO showGraticule
    } else {
      _G = _chart.svg()
        .attr("width", _width + _chart.margins().right + _chart.margins().left)
        .attr("height", _height + _chart.margins().top + _chart.margins().bottom)
      .append("g")
        .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");
      
      _G.append('g').classed('points',true);
    
      _chart.svg()
        .call(_zoom)
        .call(_zoom.event);
    
      if (_chart.showGraticule()) {
        _graticule = d3.geo.graticule().step(_graticuleStep);
        _G.append('g').classed('graticule',true);
      }
    }
    
	if (_chart.showScale()) {
	  _chart.root().append('div').classed('scale',true);
	}
	
    _chart.redraw();
    
    return _chart;
  };
  
  function drawCanvas() {
    if (!_chart.useCanvas()) return;
	
	var context = _canvas.node().getContext("2d");
	
    // clear canvas
	context.clearRect(0, 0, _width, _height);
	
	if (_chart.plotLines()) {
		
		var lineData = [];
		
		_G.selectAll('custom.line').each(function(d) {
			var n = d3.select(this);
			lineData.push([n.attr('x'), n.attr('y'), n.attr('color')]);
		});
		
		//TODO color each line and then generate the coordinates for the line based off data points
		d3.nest().key(function(d) { return d[2]; }).entries(lineData).forEach(function(d) {
			
			context.strokeStyle = d.key;
			context.beginPath();
			
			var p0 = false;
			d.values.forEach(function(p) {
				if (!p0)
					context.moveTo(p[0], p[1]);
				else
					context.lineTo(p[0], p[1]);
				p0 = true;
			});
			context.stroke();
			context.closePath();
		});
	}
	
	if ((_chart.plotPoints() && !_pointZoom) || 
      (_chart.plotPoints() && _projection.scale() > _pointZoom) ) {
		context.globalAlpha = 0.3;
		
		_G.selectAll('custom.circle').each(function(d) {
			var n = d3.select(this);
			context.beginPath();
			context.arc(n.attr('cx'), n.attr('cy'), n.attr('r'), 0, 2* Math.PI);
			context.strokeStyle = n.attr('color')
			context.stroke();
			context.fillStyle = n.attr('color');
			context.fill();
			context.closePath();
		});
	}
	
	if (_chart.showGraticule()) {
		//TODO show graticule
	}
	
	if (_chart.showScale()) {
		
		//draw a grid over the map to show the scale
		var gridSize = 100;
		context.globalAlpha = 0.1;
		context.strokeStyle = '#000';
		context.beginPath();
		for(var x = -3; x < _width; x+= gridSize) {
			for(var y = -3; y < _height; y+= gridSize) {
				context.strokeRect(x,y, gridSize, gridSize);
			}
		}
		context.closePath();
		
		
		var p0 = [-3+gridSize, _height - 5], p1 = [-3+gridSize+gridSize, _height - 5];
		var distScale = d3.geo.distance(_projection.invert(p0), _projection.invert(p1)) * 6371; //multiply radians by radius of sphere (earth) (km)
		var distCanvas = d3.geo.distance(_projection.invert([0,0]), _projection.invert([_width,0])) * 6371; //multiply radians by radius of sphere (earth) (km)
		
		context.globalAlpha = 1;
		context.strokeStyle = '#000';
		context.fillStyle = '#fff';
		context.beginPath();
		context.moveTo(p0[0], p0[1]);
		context.lineTo(p1[0], p1[1]);
		context.stroke();
		context.beginPath();
		context.arc(p0[0], p0[1], 3, 0, 2* Math.PI);
		context.stroke();
		context.fill();
		context.beginPath();
		context.arc(p1[0], p1[1], 3, 0, 2* Math.PI);
		context.stroke();
		context.fill();
		
		_chart.root().select('div.scale').text('Scale: ' + d3.round(distScale,3) + 'km ('+ d3.round(distCanvas,3) + 'km total)');
	}
  }

  _chart._doRedraw = function () {
  
    //TODO use chart-specific data based on dimensions/groups
    //var data = _chart.group().all();
    
    // points
    var pointsall = facts.allFiltered().map(function(d,i) { 
      var pos = [+_lonAccessor(d),+_latAccessor(d)];
      return {color: _chart.getColor(d,i), pos:pos, c:_projection(pos)}; 
    });
      
    // have a buffer as to not show straight lines on the border of the canvas
    var buff = 10;
    var points = pointsall.filter(function(d) {
      return d.c[0] > (buff*-1) && d.c[1] > (buff*-1) && d.c[0] < (_width+buff) && d.c[1] < (_height+buff);
    });
    

    // add circles to map
    var circle;
    var line;

    if (_chart.useCanvas()) {
      circle = _G.selectAll('custom.circle').data(points);
      line = _G.selectAll('custom.line').data(pointsall);
    } else {
      circle = _G.select('g.points').selectAll("circle").data(points);
    }

    circle.exit().remove();
    line.exit().remove();

    if (_chart.useCanvas()) {
      circle.enter().append('custom').classed('circle',true)
        .attr("r", "3");
      line.enter().append('custom').classed('line',true);
    } else {
      circle.enter().append("circle")
        .attr("r", "3px").attr('class','map');
    }

	//TODO support plotPoints and plotLines for svg
	//TODO take out svg rendering to new function
    circle
    .attr("cx", function (d) { return d.c[0]; })
    .attr("cy", function (d) { return d.c[1]; })
    .attr('color', function(d){ return d.color; })
    .style('fill', function(d){return d.color; });
    
    line
    .attr("x", function (d) { return d.c[0]; })
    .attr("y", function (d) { return d.c[1]; })
    .attr('color', function(d){return d.color; })
    .style('color', function(d){return d.color; });
    
    if (_chart.showGraticule() && !_chart.useCanvas()) {
      var lines = _G.select('g.graticule').selectAll('path.graticule').data([_graticule()]);
      lines.exit().remove();
      lines.enter().append('path').classed('graticule',true);
      lines.attr('d', _path);
    }
    
    drawCanvas();
    
    return _chart;
  };
  
  _chart.longitudeAccessor = function (f) {
    if (!arguments.length) {
      return _lonAccessor;
    }
    _lonAccessor = f;
    return _chart;
  };
  
  _chart.latitudeAccessor = function (f) {
    if (!arguments.length) {
      return _latAccessor;
    }
    _latAccessor = f;
    return _chart;
  };
  
  _chart.initialScale = function (v) {
    if (!arguments.length) {
      return _initialScale;
    }
    _initialScale = v;
    return _chart;
  };
  
  _chart.scaleExtent = function (v) {
    if (!arguments.length) {
      return _scaleExtent;
    }
    _scaleExtent = v;
    return _chart;
  };
  
  _chart.mapCenter = function (v) {
    if (!arguments.length) {
      return _mapCenter;
    }
    _mapCenter = v;
    return _chart;
  };
  
  _chart.showGraticule = function (v) {
    if (!arguments.length) {
      return _showGraticule;
    }
    _showGraticule = v;
    return _chart;
  };
  
  _chart.graticuleStep = function (v) {
    if (!arguments.length) {
      return _graticuleStep;
    }
    _graticuleStep = v;
    return _chart;
  };
  
  _chart.useCanvas = function (v) {
    if (!arguments.length) {
      return _useCanvas;
    }
    _useCanvas = v;
    return _chart;
  };
  
  _chart.plotPoints = function (v) {
    if (!arguments.length) {
      return _plotPoints;
    }
    _plotPoints = v;
    return _chart;
  };
  
  _chart.pointZoom = function (v) {
    if (!arguments.length) {
      return _pointZoom;
    }
    _pointZoom = v;
    return _chart;
  };
  
  _chart.plotLines = function (v) {
    if (!arguments.length) {
      return _plotLines;
    }
    _plotLines = v;
    return _chart;
  };
  
  _chart.showScale = function (v) {
    if (!arguments.length) {
      return _showScale;
    }
    _showScale = v;
    return _chart;
  };
  
  return _chart.anchor(parent, chartGroup);
};


var chartMap = dc.mapChart("#chart-map");

chartMap.dimension(fileDim)
  .longitudeAccessor(function(d) { return d['Position Lon']; })
  .latitudeAccessor(function(d) { return d['Position Lat']; })
  .colorAccessor(function(d) { return d.File; })
  .colors(filenameColors)
  .useCanvas(true)
  .plotPoints(true)
  .pointZoom(9000000)
  .plotLines(true)
  .showScale(true)
  .scaleExtent([500, 100000000]);



dc.monthViewChart = function (parent, chartGroup) {
  var _chart = dc.colorMixin(dc.marginMixin(dc.baseMixin({})));
  
  _chart._mandatoryAttributes([]); //TODO date attribute?
  
  var _G;
  var _width, _height;
  
  var _date;
  
  var _ymdFormat = d3.time.format('%Y-%m-%d'),
      _monthFormat = d3.time.format('%B'),
      _dayNumFormat = d3.time.format('%e');
	  
  var _onOver = function(d,i) { },
      _onClick = function(d,i) { },
      _startDay = d3.time.monday;
    
  _chart._doRender = function () {
    _chart.resetSvg();
    
    _width = _chart.width() - _chart.margins().right - _chart.margins().left;
    _height = _chart.height() - _chart.margins().top - _chart.margins().bottom;

    _G = _chart.svg()
        .attr("width", _width + _chart.margins().right + _chart.margins().left)
        .attr("height", _height + _chart.margins().top + _chart.margins().bottom)
      .append("g")
        .attr("transform", "translate(" + _chart.margins().left + "," + _chart.margins().top + ")");
    
    _chart.redraw();
    
    return _chart;
  };

  _chart._doRedraw = function () {
    if (!_chart.date()) { 
		console.log("error - no date provided for calendar chart");
		return; 
	}
	
      
      var x = _width/7;
      var y = x;
      var r = x/2;

      var g = _G.selectAll('g')
        .data(function() {
          var start = _startDay.floor(_chart.date());
          
          while (_chart.date().getMonth() == start.getMonth() && 
                 start.getDate() != 0) {
            start = _startDay.floor(new Date(start.getTime() - (24*60*60*1000)));
          }
          
          var end = _startDay.ceil(new Date(_chart.date().getFullYear(), _chart.date().getMonth()+1, 0));
          
          var days = d3.time.days(start, end);

          while (days.length < 42) {
            end = _startDay.ceil(new Date(end.getTime() + (24*60*60*1000)));
            days = d3.time.days(start, end);
          }
          
          return [days.slice(0, 7),
              days.slice(7, 14),
              days.slice(14, 21),
              days.slice(21, 28),
              days.slice(28, 35),
              days.slice(35, 42)];
        });
        
      g.exit().remove();
      
      g.enter()
        .append('g');
      
      g.attr('transform', function(d,i) {
        return 'translate('+r+', ' + i*y + ')';
      });

      var c = g.selectAll('circle.cal')
        .data(function(d) { return d; });
        
      c.exit().remove();
       
      c.enter()
          .append('circle')
          .classed('cal', true);
          
      c.classed('current', function(d) {
        if (_ymdFormat(_chart.date()) == _ymdFormat(d)) {
          return true;
        }
        return false;
      })
      .classed('in-month', function(d) {
        if (_monthFormat(_chart.date()) == _monthFormat(d)) {
          return true;
        }
        return false;
      })
      .attr('cx', function(d,i) { return i*x; })
      .attr('cy', r)
      .attr('r', r)
      .on('mouseover', _onOver)
      .on('click', _onClick);

      var txt = g.selectAll('text.cal').data(function(d) { return d; });
      
      txt.exit().remove();
      
      txt.enter()
        .append('text')
        .classed('cal', true);
            
      txt.classed('current', function(d) {
        if (_ymdFormat(_chart.date()) == _ymdFormat(d)) {
          return true;
        }
        return false;
      })
      .classed('in-month', function(d) {
        if (_monthFormat(_chart.date()) == _monthFormat(d)) {
          return true;
        }
        return false;
      })
      .attr('x', function(d,i) { return i*x; })
      .attr('y', r+(r*0.3)) //get text into the centre of the circle
      .attr('font-size', r)
      .attr('text-anchor', 'middle')
      .text(_dayNumFormat)
      .on('mouseover', _onOver)
      .on('click', _onClick);
	  
	  
      // set the styles, note that order is important!
      _G.selectAll('circle.cal').style({
        fill: '#fff'
      });
      
      _G.selectAll('circle.cal.in-month').style({
        fill: '#fff'
      });

      _G.selectAll('circle.cal.current').style({
        fill: '#000'
      });

      _G.selectAll('text.cal').style({
        fill: '#ccc'
      });
      
      _G.selectAll('text.cal.in-month').style({
        fill: '#000'
       });
      
      _G.selectAll('text.cal.current').style({
        fill: '#fff'
      });
    };
  
  _chart.date = function (v) {
    if (!arguments.length) {
      return _date;
    }
    _date = v;
    return _chart;
  };
  
  _chart.onClick = function (f) {
    if (!arguments.length) {
      return _onClick;
    }
    _onClick = f;
    return _chart;
  };
  
  _chart.onOver = function (f) {
    if (!arguments.length) {
      return _onOver;
    }
    _onOver = f;
    return _chart;
  };
  
  return _chart.anchor(parent, chartGroup);
};

var redraw_count = 0;

function redraw() {
  if (facts.size() > 0) {
    if (redraw_count == 0) {
      dc.renderAll();
    } else {
      dc.redrawAll();
    }
    //TODO refreshDataTable();
    redraw_count++;
  }
}

redraw();


var interval_render_done = true;
var load_interval = setInterval(load_data, 200);
var load_count = 5000;
var load_complete = false;
var data_toload = [];
var data_toload_total = 0;
var data_toload_complete = 0;

function load_data() {
  
  if (load_complete && !data_toload.length)
  {
    clearInterval(load_interval);
    load_interval = undefined;
    
    d3.select('.progress').style('display', 'none');
    //TODO refreshDataTable();
    return;
  }
  
  var toadd = data_toload.splice(0,Math.min(load_count,data_toload.length));
  
  data_toload_complete += toadd.length;
  
  console.log('facts',toadd);
  
  facts.add(toadd);
  d3.select('.progress-bar').classed('progress-bar-success', true).style('width', ((data_toload_complete/data_toload_total)*100)+'%');
  
  interval_render_done = false; 
  redraw();
}

d3.csv('/activities.csv', function(activities) {
  console.log('activities',activities);
  //TODO redraw();
  
  var activity_done = 0;
  var total = activities.length;
  var complete = 0;

  for(var i = 0; i < total; i++) {
    var a = activities[i];
    var qqq = d3.queue();
    
    if (a.File == "" || a.Name == undefined || a.File[0] == '#') {
      console.log('Skipped',a);
      continue;
    }
	
	a.files = a.File.split('&');
    
    // length represents the type of workout, in minutes
    var lenRegex = /^([0-9]+)\-([0-9]+)\-([0-9]+)$/g;
	var numRegex = /^[0-9]+$/;
	var intervalRegex = /^\^([0-9]+):([0-9]+)\/([0-9]+):([0-9]+)$/;
    var lenMatch = lenRegex.exec(a.Length);
	var intervalMatch = intervalRegex.exec(a.Length);
    if (lenMatch != null) {
      var start = 0;
      var lenWarmup = +lenMatch[1]*60*1000;
      var lenWorkout = +lenMatch[2]*60*1000;
      var lenCooldown = +lenMatch[3]*60*1000;
      
      var warmupEnd = start + lenWarmup;
      var workoutEnd = warmupEnd + lenWorkout;
      var cooldownEnd = workoutEnd + lenCooldown;
      
      a.Length = {
		Type: 'Training',
        Warmup: [0, warmupEnd], 
        Workout: [warmupEnd, workoutEnd], 
        CoolDown: [workoutEnd,cooldownEnd]};
    } else if (numRegex.exec(a.Length) != null) {
      a.Length = {Type: 'Training', Workout: [0,(+a.Length)*60*1000]};
	} else if (a.Length == "*") {
	  a.Length = {Type: 'Race'};
	} else if (intervalMatch != null) {
	  // Time-based intervals, workoutmin:workoutsec/restmin:restsec
	  a.Length = {
		  Type: 'Intervals',
		  Workout: (+intervalMatch[1]*60*1000)+(+intervalMatch[2]*1000),
		  Rest: (+intervalMatch[3]*60*1000)+(+intervalMatch[4]*1000)
	  };
	  
	  a._intervalLen = a.Length.Workout + a.Length.Rest;
    } else {
      console.log("Activity has invalid length " + a.Length,a);
	  a.Length = {Type: 'Unknown'};
    }
	
	var getDeviceData = function(activity,fileName,cb) {
		d3.csv('/device/'+fileName, function(err,data) {
			//set the activity so can be used when processing data points
			var dev = data.length ? data[0].Device : "Unknown";
			if (!activity.Device) {
				activity.Device = "";
			}
			if (dev != activity.Device) {
				activity.Device += dev;
			}
			cb(err, activity);
		})
	};
	
	var getPointData = function(activity,fileName,cb) {
      d3.csv('/activities/'+fileName, function(d,i) {
      
        d.Lap = +d.Lap;
        d.Distance = +d.Distance;
        d.Time = timeParser.parse(d.Time);
        d.TimeInterval = dateToInterval(d, 'Time', timeScale, 1);
        d.HeartRate = +d['Heart Rate'];
        delete d['Heart Rate'];
        d.Cadence = +d.Cadence;
        
        if (d.HeartRate > 200) {
          console.log('**MAX HR',d.HeartRate,d);
        }
        
        return d;
      }, function(err,data) {
        cb(err,{activity:activity, points:data});
      });
	};

	var qqqDev = d3.queue();
	var qqqPoints = d3.queue();
		
  a.files.forEach(function(f) {
	qqqDev.defer(function(activity,cb) {
		getDeviceData(activity,f,cb);
	}, a);
	qqqPoints.defer(function(activity,cb) {
		getPointData(activity,f,cb);
	}, a);
  });
	
	qqqDev.awaitAll(function(err,activities_per_file) {
		//updated device
	});
	
	qqqPoints.awaitAll(function(err,points_per_file) {
		
      var lengthKeys = [];
      var elapsedTime = 0;
      var movingTime = 0;
	  var activityStart = 0;
	  var pointIndex = 0;
	  
	  var activity = points_per_file[0].activity;
	  var data = d3.merge(points_per_file.map(function(d){return d.points;}));
	  
	  for(var i = 0; i < data.length; i++) {
		  
		  var d = data[i];
		  
			if (pointIndex == 0) {
				//the first data point
			  lengthKeys = d3.keys(activity.Length).filter(function(z) { return z !== 'Type'; });
			  activityStart = d.Time;
			}
			
			d.PointIndex = pointIndex;
                        d.TimeZone = -1; // calculated
			d.Activity = activity.Name;
			d.File = activity.File;
      d.Color = filenameColors(activity.File);
			d.Device = activity.Device;
			d.ActivityLength = activity.Length;
			d.ActivityStart = activityStart;
			d.DistancePoint = pointIndex == 0 ? d.Distance : d.Distance - data[pointIndex-1].Distance;
			if (d.DistancePoint < 0) {
				//has moved negative as file distance has been reset! multiple activities joined together
				d.DistancePointOld = d.DistancePoint;
				d.DistancePoint = 0;
			}
			d.TimePoint = pointIndex == 0 ? 1000 : d.Time - data[pointIndex-1].Time;

			elapsedTime += d.TimePoint;
			d.TimeElapsed = elapsedTime;
			
			//calc speed with rolling window across multiple data points. sometimes distance is recorded as 0 between points, artifically creating "faster" points
			var window = 5;
			var right = Math.min(pointIndex+window,data.length-1);
			var left = Math.max(pointIndex-window,0);
			var first = data[left];
			var last = data[right];
			var t = d3.sum(data.slice(left,right), function(d){return d.TimePoint; });//last.Time - first.Time;
			var l = d3.sum(data.slice(left,right), function(d){return d.DistancePoint; });//last.Distance - first.Distance;
			

			d.SpeedMS = (l/(t/1000));
			d.SpeedKH = d.SpeedMS * 3.6;
			d.SpeedMM = d.SpeedMS * 60;
			if (d.SpeedMS == 0) {
				d.PaceSK = 0;
				d.PaceSM = 0;
			} else {
				// do not store as Infinity
				d.PaceSK = 1000 / d.SpeedMS;
				d.PaceSM = 1609.344 / d.SpeedMS;
			}

			if (d.SpeedKH > 20) {
				console.log('High speed value...',d.SpeedKH,d);
			}
			
			
			if (d.SpeedKH < 1) {
			d.LapType = "Stationary";
			d.TimeMoving = movingTime;
			} else {
			movingTime += d.TimePoint;
			d.TimeMoving = movingTime;

			if (activity.Length.Type == 'Unknown') {
				d.LapType = 'Unknown';
			} else if (activity.Length.Type == 'Training') {
			  if (lengthKeys.length == 1) {
				d.LapType = lengthKeys[0];
			  } else if (lengthKeys.length == 3) {
				lengthKeys.forEach(function(k) {
				  if (d.TimeMoving >= activity.Length[k][0] &&
					  d.TimeMoving <= activity.Length[k][1]) {
					d.LapType = k;
				  }
				});
				if (!d.LapType) {
				  d.LapType = "Unknown1";
				}
			  } 
			} else if (activity.Length.Type == 'Race') {
				d.LapType = 'Race';
			} else if (activity.Length.Type == 'Intervals') {
				if (d.TimeMoving % activity._intervalLen < activity.Length.Workout) {
					d.LapType = 'Workout';
				} else {
					d.LapType = 'Rest';
				}
			}
			}
			
			
			data_toload.push(d);
			
		  pointIndex++;
	  }
	  
	  
	  activity_done++;
	  
	  if (activity_done == total) {
		load_complete = true;
	  }
	});
	
	
	
  }
  
});
