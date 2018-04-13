function format_hr(d) {
  return d.toFixed(0);
}

function formatSeconds(seconds,human = true) {
  if (seconds == 0 || seconds == Infinity) {
    return human ? "0s" : "00:00";

  }
  var sec = 1;
  var sec_min = sec * 60;
  var sec_hour = sec_min * 60;
  var sec_day = sec_hour * 7.5;
  var sec_week = sec_day * 5;
  
  var weeks = Math.floor(seconds / sec_week);
  var days = Math.floor((seconds % sec_week) / sec_day);
  var hours = Math.floor(((seconds % sec_week) % sec_day) / sec_hour);
  var mins = Math.floor((((seconds % sec_week) % sec_day) % sec_hour) / sec_min);
  var secs = Math.floor(seconds % sec_min);
  
  var str = "";
  
  if (human) {
    str = (weeks ? weeks + "w " : "") +
         (days ? days + "d " : "") +
         (hours ? hours + "h " : "") +
         (mins ? mins + "m " : "") +
         (secs ? secs + "s " : "");
  } else {
    str = (weeks ? (weeks < 10 ? "0" + weeks : weeks)  + ":" : "") +
         (days ? (days < 10 ? "0" + days : days) + ":" : "") +
         (hours ? (hours < 10 ? "0" + hours : hours) + ":" : "") +
         (mins ? (mins < 10 ? "0"+mins : mins) + ":" : "00:") +
         (secs ? (secs < 10 ? "0" + secs : secs) + "" : "00");
  }
  
  return str;
}

function dateToInterval(d,attr,scale,interval) {
    var date = d[attr];
    var subHalf = scale.offset(date, -1 * interval / 2);
    var addHalf = scale.offset(date, interval / 2);
    return scale.range(subHalf, addHalf, interval)[0];
};

function remove_empty_bins(chart, group) {
  return {
    all:function () {
      return group.all().filter(function(d) {
        return chart.valueAccessor()(d) != 0;
      });
    }
  };
}


//https://github.com/dc-js/dc.js/issues/667
function nonzero_min(chart) {
  dc.override(chart, 'yAxisMin', function () {
    var min = d3.min(chart.data(), function (layer) {
      return d3.min(
        layer.values.filter(function(p) { return p.y != 0; }), 
        function (p) {
          return p.y + p.y0;
        });
    });
    return dc.utils.subtract(min, chart.yAxisPadding());
  });
  
  return chart;
}    


function reduceAddAvg(attr) {
  return function(p,v) {
    ++p.count
    p.sum += v[attr];
    p.avg = p.sum/p.count;
    return p;
  };
}
function reduceRemoveAvg(attr) {
  return function(p,v) {
    --p.count
    p.sum -= v[attr];
    p.avg = p.count ? p.sum/p.count : 0;
    return p;
  };
}
function reduceInitAvg() {
  return {count:0, sum:0, avg:0};
}
