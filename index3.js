
var timeParser = d3.time.format.iso;
var timeFormat = d3.time.format('%c');
var hrf = d3.time.format('%H');
var wdf = d3.time.format('%w.%A');
var timeScale = d3.time.second;
var filenameColors = d3.scale.category10();


var interval_render_done = true;
var load_interval = setInterval(load_data, 200);
var load_count = 5000;
var load_complete = false;
var data_toload = [];
var data_toload_total = 0;
var data_toload_complete = 0;

function load_data() {
  //TODO if (facts.size() > 0 && !interval_render_done) { return; }
  
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
  
  setTimeout(function() {
    d3.select('.progress-bar').classed('progress-bar-success', true).style('width', ((data_toload_complete/data_toload_total)*100)+'%');
  }, 0);
          
  //TODO facts.add(toadd);
  interval_render_done = false; 
  //TODO redraw();
}

d3.csv('/activities.csv', function(activities) {
  console.log('activities',activities);
  //TODO redraw();
  
  var total = activities.length;
  var complete = 0;
  
  var queue = d3.queue();

  for(var i = 0; i < total; i++) {
    var a = activities[i];
    
    if (a.File == "" || a.Name == undefined || a.File[0] == '#') {
      console.log('Skipped',a);
      continue;
    }
    
    // length represents the type of workout, in minutes
    var lenRegex = /^([0-9]+)\-([0-9]+)\-([0-9]+)$/g;
    var lenMatch = lenRegex.exec(a.Length);
    if (lenMatch != null) {
      var start = 0;
      var lenWarmup = +lenMatch[1]*60*1000;
      var lenWorkout = +lenMatch[2]*60*1000;
      var lenCooldown = +lenMatch[3]*60*1000;
      
      var warmupEnd = start + lenWarmup;
      var workoutEnd = warmupEnd + lenWorkout;
      var cooldownEnd = workoutEnd + lenCooldown;
      
      a.Length = {
        Warmup: [0, warmupEnd], 
        Workout: [warmupEnd, workoutEnd], 
        CoolDown: [workoutEnd,cooldownEnd]};
    } else if (/^[0-9]+$/) {
      a.Length = {Workout: [0,+a.Length*60*1000]};
    } else {
      console.log("Activity has invalid length " + a.Length,a);
    }
    
    queue.defer(function(activity, cb) {
      console.log('/activities/'+activity.File);
      d3.csv('/activities/'+activity.File, function(d,i) {
        d._activity = activity;
      
        d.File = activity.File;
        d.Lap = +d.Lap;
        d.Distance = +d.Distance;
        d.Time = timeParser.parse(d.Time);
        d.TimeInterval = dateToInterval(d, 'Time', timeScale, 1);
        d.HeartRate = +d['Heart Rate'];
        delete d['Heart Rate'];
        
        if (d.HeartRate > 200) {
          console.log('**MAX HR',d.HeartRate,d);
        }
        
        return d;
      }, function(err,data) {
        d3.select('.progress-bar').classed('progress-bar-success', true).style('width', ((++complete/total)*100)+'%');
        cb(err,data);
      });
    }, a);
  }
  
  queue.awaitAll(function(err, activities) {
    console.log('got all', err, activities);
  
    data_toload_complete = 0;
    data_toload_total = 0;
    for(var ai = 0; ai < activities.length; ai++) {
      data_toload_total += activities[ai].length;
    }
  
    for(var ai = 0; ai < activities.length; ai++) {
      var a = undefined;
      var data = activities[ai];
      
      var lengthKeys = []
      var elapsedTime = 0;
      var movingTime = 0;
      
      for (var i = 0; i < activities[ai].length; i++) {
        var d = activities[ai][i];
        if (a == undefined || i == 0) {
          a = d._activity;
          
          lengthKeys = d3.keys(a.Length);
          
          elapsedTime = 0;
          movingTime = 0;
            
          //TODO stackActivity(a.File);
        }
        
        
	  //TODO dynamic stacks based on activity filename
	  //chartHRTime.stack(chartWeeksGroup, a.File, chartWeeksGroupAccessor(a.File))
      
        //data.forEach(function(d,i,arr) {
          d.PointIndex = i;
          d.Activity = a.Name;
          d.ActivityLength = a.Length;
          d.DistancePoint = i == 0 ? d.Distance : d.Distance - data[i-1].Distance;
          d.TimePoint = i == 0 ? 1000 : d.Time - data[i-1].Time;

          elapsedTime += d.TimePoint;
          d.TimeElapsed = elapsedTime;

          //calc speed with rolling window across multiple data points. sometimes distance is recorded as 0 between points, artifically creating "faster" points
          var window = 5;
          var right = Math.min(i+window,data.length-1);
          var left = Math.max(i-window,0);
          var first = data[left];
          var last = data[right];
          var t = last.Time - first.Time;
          var l = last.Distance - first.Distance;

          d.SpeedMS = (l/(t/1000));
          d.SpeedKH = d.SpeedMS * 3.6;
          d.SpeedMM = d.SpeedMS * 60;
          d.PaceSK = 1000 / d.SpeedMS;
          d.PaceSM = 1609.344 / d.SpeedMS;
          
          if (d.SpeedKH < 1) {
            d.LapType = "Stationary";
            d.TimeMoving = movingTime;
          } else {
            movingTime += d.TimePoint;
            d.TimeMoving = movingTime;

          if (lengthKeys.length == 1) {
            d.LapType = lengthKeys[0];
          } else if (lengthKeys.length == 3) {
            lengthKeys.forEach(function(k) {
              if (d.TimeMoving >= a.Length[k][0] &&
                  d.TimeMoving <= a.Length[k][1]) {
                d.LapType = k;
              }
            });
            if (!d.LapType) {
              d.LapType = "Unknown1";
            }
          } else {
            d.LapType = "Unknown2";
          }

          data_toload.push(d);
        }
      }
    }
    
    load_complete = true;
    
  });
});