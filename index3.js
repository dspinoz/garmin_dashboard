
var timeParser = d3.time.format.iso;
var timeFormat = d3.time.format('%c');
var hrf = d3.time.format('%H');
var wdf = d3.time.format('%w.%A');
var timeScale = d3.time.second;
var filenameColors = d3.scale.category10();
var facts = crossfilter();

function data_hrZone(d) {
	if (d.HeartRate < 130) return 0;
	if (d.HeartRate < 139) return 1;
	if (d.HeartRate < 149) return 2;
	if (d.HeartRate < 163) return 3;
	if (d.HeartRate < 176) return 4;
	if (d.HeartRate < 189) return 5;
	return 6;
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


function group_get_length(group) {
  return {
    all:function () {
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
  .group(group_get_length(fileDim.group().reduceCount()))
  .formatNumber(d3.round)
  .valueAccessor(function(d) { return d; });
  
  
  
  
  

var chartTotalDistance = dc.numberDisplay("#chart-total-distance");

chartTotalDistance
  .group(facts.groupAll().reduceSum(function(d) { return d.DistancePoint; }))
  .formatNumber(function(d) {
    return d3.round(d / 1000,2) + "<small>km</small>";
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


var chartActivityTable = dc.dataTable("#chart-activity-table");

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
        return gdata;
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return d.key; },
    function(d) { return "<span class=\"badge\">"+d.value.size()+"</span>"; }
  ])
  .on('renderlet', function(chart) {
    chart.selectAll('tr.dc-table-group').style('display','none');
  });


var chartLapTypeTable = dc.dataTable("#chart-laptype-table");

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
        return gdata;
      }
  })
  .group(function(d) { return "Lap Type"; })
  .columns([
    function(d) { return d.key; },
    function(d) { return "<span class=\"badge\">"+d.value.size()+"</span>"; }
  ])
  .on('renderlet', function(chart) {
    chart.selectAll('tr.dc-table-group').style('display','none');
    
    chart.selectAll('.dc-table-row')
      .on('click', function(d) {
        dc.events.trigger(function () {
          chart.filter(d.key);
          chart.redrawGroup();
        });
      });
  });
  
  
var chartDeviceTable = dc.dataTable("#chart-device-table");

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
        return gdata;
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return d.key; },
    function(d) { return "<span class=\"badge\">"+d.value.size()+"</span>"; }
  ])
  .on('renderlet', function(chart) {
    chart.selectAll('tr.dc-table-group').style('display','none');
  });
  
  
  







var chartActivitySummaryTable = dc.dataTable("#chart-activity-summary-table");

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
        return gdata;
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return '<span title="'+d.value.entries()[0].value.ActivityStart+'">'+d.key+'</span> '+ "<small>"+d.value.size()+"</small>"; },
    function(d) { 
		var runTime = formatSeconds(d3.sum(d.value.entries(), function(e){return e.value.TimePoint;})/1000,false);
		var runDistance = d3.round(d3.sum(d.value.entries(), function(e){return e.value.DistancePoint;})/1000,2);
		return runTime + " / " + runDistance;
	},
    function(d) { return formatSeconds(d3.sum(d.value.entries(), function(e){return e.value.PaceSK;})/d.value.size(),false); },
    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.SpeedKH;})/d.value.size(),2); },
    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.SpeedMM})/d.value.size(),2); },

    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.HeartRate})/d.value.size(),1); },
    function(d) { return d3.round(d3.sum(d.value.entries(), function(e){return e.value.Cadence})/d.value.size(),1)*2; },

  ])
  .on('renderlet', function(chart) {
    chart.selectAll('tr.dc-table-group').style('display','none');
  });










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

function summaryPanel_create(name,timefn,accessfn) {

var perYearDim = facts.dimension(function(d) { return timefn(d.Time); });
var chartSummaryYearFiles = dc.numberDisplay("#chart-summary-"+name+"-activities");
var yearFilesSummaryGroup = group_reduceMap(perYearDim.group(), function(d) { return d.File+d.PointIndex; });

chartSummaryYearFiles
  .group({
	  value: function() {
		  if (accessfn) return accessfn(yearTimeSummaryGroup.all());
		  var now = timefn(new Date());
		  var ret = yearTimeSummaryGroup.all().filter(function(d) { return d.key.getTime() == now.getTime(); });
		  return ret.length ? ret[0] : null;
	  }
  })
  .formatNumber(function(d){
    return "<span class=\"badge\">"+d3.round(d)+"<span>";
  })
  .valueAccessor(function(d) {
	var ret = summaryPanel_calculate(d);
	// numberDisplay only allows a single value to be returned
	return ret.files;
  });
  
var chartSummaryYearDistance = dc.numberDisplay("#chart-summary-"+name+"-distance");
var yearDistanceSummaryGroup = group_reduceMap(perYearDim.group(), function(d) { return d.File+d.PointIndex; });

chartSummaryYearDistance
  .group({
	  value: function() {
		  if (accessfn) return accessfn(yearTimeSummaryGroup.all());
		  var now = timefn(new Date());
		  var ret = yearTimeSummaryGroup.all().filter(function(d) { return d.key.getTime() == now.getTime(); });
		  return ret.length ? ret[0] : null;
	  }
  })
  .formatNumber(function(d){
    return d3.round(d/1000,2)+"<small>km</small>";
  })
  .valueAccessor(function(d) {
	var ret = summaryPanel_calculate(d);
	// numberDisplay only allows a single value to be returned
	return ret.distance;
  });

var chartSummaryYearTime = dc.numberDisplay("#chart-summary-"+name+"-time");
var yearTimeSummaryGroup = group_reduceMap(perYearDim.group(), function(d) { return d.File+d.PointIndex; });

chartSummaryYearTime
  .group({
	  value: function() {
		  if (accessfn) return accessfn(yearTimeSummaryGroup.all());
		  var now = timefn(new Date());
		  var ret = yearTimeSummaryGroup.all().filter(function(d) { return d.key.getTime() == now.getTime(); });
		  return ret.length ? ret[0] : null;
	  }
  })
  .formatNumber(function(d){
    return formatSeconds(d3.round(d / 1000), true, true);
  })
  .valueAccessor(function(d) {
	var ret = summaryPanel_calculate(d);
	// numberDisplay only allows a single value to be returned
	return ret.time;
  });
}

summaryPanel_create('year',d3.time.year);
summaryPanel_create('month',d3.time.month);
summaryPanel_create('week',d3.time.week);
summaryPanel_create('day',d3.time.day);



var chartSpeedTable = dc.dataTable("#chart-speed-table");
var chartSpeedColors = colorbrewer.Greens[7];
var speedDim = facts.dimension(function(d) { return d3.round(d.SpeedMM,0); });
var speedCountGroup = group_reduceCountKey(speedDim.group(), function(d){return d.File; });
var speedQuantile = d3.scale.quantile().range(chartSpeedColors);

chartSpeedTable
  .dimension({
      filter: function(f) {
        speedDim.filter(f);
      },
      filterExact: function(v) {
        speedDim.filterExact(v);
      },
      filterFunction: function(f) {
        speedDim.filterFunction(f);
      },
      filterRange: function(r) {
        speedDim.filterRange(r);
      },
      bottom: function(sz) {
        var all = speedCountGroup.all();
		var extent = d3.extent(all,function(d){ return d.key; })
		
		//automatically generate quantile for the values contained in the group
		speedQuantile.domain(extent);
		
		// stores color (from the quantile scale) against file and count (for points)
		var ret = d3.map();
		all.forEach(function(d) {
			var kq = speedQuantile(d.key);
			if (!ret.has(kq)) {
				ret.set(kq,d3.map());
			}
			d.value.entries().forEach(function(e) {
				if (!ret.get(kq).has(e.key)) {
					ret.get(kq).set(e.key,0);
				}
				ret.get(kq).set(e.key, ret.get(kq).get(e.key) + e.value);
			});
		});
		
		return ret.entries();
      }
  })
  .group(function(d) { return "Activities"; })
  .columns([
    function(d) { return '<svg height=20 width=20><rect width="20" height="20" stroke="'+d.key+'" fill="'+d.key+'" '+(d.value.size() == 0 ? 'fill-opacity="0.3"' : '')+'></rect></svg>'; },
    function(d) { 
		var ext = speedQuantile.invertExtent(d.key);
		var speedMM = ext[0] + ((ext[1]-ext[0])/2);
		
		var speedMS = speedMM/60;
		var paceSK = 1000 / speedMS;
		var speedKH = speedMS*3.6;
		
		return d3.round(ext[0],0)+"-"+d3.round(ext[1],0) +' <small>'+formatSeconds(paceSK,false)+'<small>m/km</small></small> <small>'+d3.round(speedKH,2)+'<small>kmh</small></small>'; 
	},
    function(d) { return '<span class="badge">'+d.value.size()+'</span>'; },
    function(d) { return "<small>"+d3.sum(d.value.entries(),function(d){return d.value; })+"</small>"; }
  ])
  .on('renderlet', function(chart) {
    chart.selectAll('tr.dc-table-group').style('display','none');
  });





var chartHRZoneTable = dc.dataTable("#chart-hrzone-table");
var chartHRZoneColors = colorbrewer.Reds[7];

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
			0:{html:'<span>&le;129</span>',value:d3.map()},
			1:{html:'<span>130-139 <small>Z1</small></span>',value:d3.map()},
			2:{html:'<span>139-149 <small>Z2</small></span>',value:d3.map()},
			3:{html:'<span>149-163 <small>Z3</small></span>',value:d3.map()},
			4:{html:'<span>163-176 <small>Z4</small></span>',value:d3.map()},
			5:{html:'<span>176-189 <small>Z5</small></span>',value:d3.map()},
			6:{html:'<span>&ge;190</span>',value:d3.map()}
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
  ])
  .on('renderlet', function(chart) {
    chart.selectAll('tr.dc-table-group').style('display','none');
  });
  











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
    console.log('done loading data');
    return;
  }
  
  var toadd = data_toload.splice(0,Math.min(load_count,data_toload.length));
  
  data_toload_complete += toadd.length;
  
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
	
		/*
		var qqq2 = d3.queue();
		
	  activity.files.forEach(function(f) {
		
		qqq2.defer(function(d,cb){
		console.log("QQQ2 defer device",f);
			d3.csv(d.url, function(err,data) {
				if (err) { cb(err); return;}
				d.activity.Device = data.length ? data[0].Device : "Unknown";
		console.log("QQQ2 defer device",d.url,data[0].Device);
			});
		}, {activity: activity, url:'/device/'+f});
	  });
	  
	  qqq2.awaitAll(function(err,devices) {
		console.log("QQQ2 all",err,devices);
		cb(err,devices);
	  });
		*/

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
		console.log("QQQ dev",err,activities_per_file);
	});
	
	qqqPoints.awaitAll(function(err,points_per_file) {
		console.log("QQQ points",err,points_per_file);
		
      var lengthKeys = [];
      var elapsedTime = 0;
      var movingTime = 0;
	  var activityStart = 0;
	  var pointIndex = 0;
	  
	  var activity = points_per_file[0].activity;
	  var data = d3.merge(points_per_file.map(function(d){return d.points;}));
	  console.log('QQQ points data',activity,data);
	  for(var i = 0; i < data.length; i++) {
		  
		  var d = data[i];
		  
			if (pointIndex == 0) {
				//the first data point
			  console.log('activity',activity.File,activity.Length);
			  lengthKeys = d3.keys(activity.Length).filter(function(z) { return z !== 'Type'; });
			  activityStart = d.Time;
			}
			
			d.PointIndex = pointIndex;
			d.Activity = activity.Name;
			d.File = activity.File;
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
