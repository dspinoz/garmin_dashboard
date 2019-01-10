# Garmin Dashboard

A dashboard for viewing and analysing Garmin activity files (TCX)

![screenshot](https://github.com/dspinoz/garmin_dashboard/blob/master/wiki/screencapture.png)

## Garmin Connect

Export the activity from Garmin Connect in TCX format and place inside an `activities` folder

## Activities.txt

This file provides the list of activities to the dashboard, as well as providing some additional metadata.

Create `activities/Activities.txt` and use the following CSV-based formatting. Include the following as the first line in the file

`File,Name,Length,Note`

* File: activity_XXX.tcx (String)
  * Can use `&` to concatenate multiple activities together, i.e. join them together to form a single activity
* Name: Activity Name (String)
  * Provides groupings of activities 
* Length: Provide some hints regarding the length of the activity (String)
  * `*` Activity represents a "Race". The entire activity is a single lap
  * `a-b-c` Activity represents a warmup-workout-cooldown cycle in `minutes` for each `a` `b` and `c`
  * `^a/b` Activity represents a workout/rest interval in `minutes:seconds` for each `a` and `b`
* Note: (String)
