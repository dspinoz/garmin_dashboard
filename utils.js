
function formatSeconds(seconds) {
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
  
  var str = (weeks ? weeks + "w " : "") +
         (days ? days + "d " : "") +
         (hours ? hours + "h " : "") +
         (mins ? mins + "m " : "") +
         (secs ? secs + "s " : "");
  
  return str;
}
