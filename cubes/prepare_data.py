import sqlalchemy
from cubes.tutorial.sql import create_table_from_csv
import lxml.etree as ET
from xml.etree import ElementTree

import os
import re
import sys
import tempfile

namespaces = {	"g": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2", 
				"ext": "http://www.garmin.com/xmlschemas/ActivityExtension/v2"}

xslt = ET.parse('tcx_to_csv.xsl')
transform = ET.XSLT(xslt)

def activity_tcx_to_csv_str(path):
	tree = ElementTree.parse(path)
	
	print(path,tree,tree.getroot())
	
	for activity in tree.getroot().findall("g:Activities/g:Activity", namespaces):
		print("Activity: ",activity.attrib['Sport'], activity.find("g:Id", namespaces).text)
		
		lapNo = 0
		pointNo = 0
		for lap in activity.findall("g:Lap", namespaces):
			lapNo = lapNo + 1
			#print("  L ***",lapNo, lap,lap.attrib["StartTime"])
			
			for ext in lap.findall("g:Extensions", namespaces):
				print("    Extension detected **", ext)
			
			for point in lap.findall("g:Track/g:Trackpoint", namespaces):
				#print("    P **",point)
				pointNo = pointNo + 1
				
				yield {
					"index": pointNo,
					"lap": lapNo,
					"time": point.find("g:Time", namespaces).text,
					"position_lat": point.find("g:Position/g:LatitudeDegrees", namespaces).text,
					"position_lon": point.find("g:Position/g:LongitudeDegrees", namespaces).text,
					"heart_rate": point.find("g:HeartRateBpm/g:Value", namespaces).text,
					"distance": point.find("g:DistanceMeters", namespaces).text,
					"altitude": point.find("g:AltitudeMeters", namespaces).text,
					#TODO "cadence": point.find("g:Extensions/ext:TPX/ext:RunCadence", namespaces)},
				}
				
		print("Activity completed with ",lapNo,"laps and ",pointNo,"points")


engine = sqlalchemy.create_engine('sqlite:///data.sqlite')
metadata = sqlalchemy.MetaData(bind=engine)
print("Got engine. Creating table from CSV")


table_name = "activities"
schema = None

type_map = {"integer": sqlalchemy.Integer,
			"float": sqlalchemy.Numeric,
			"string": sqlalchemy.String(256),
			"text": sqlalchemy.Text,
			"date": sqlalchemy.Text,
			"boolean": sqlalchemy.Integer}

fields = [
	("index", "integer"),
	("time", "string"),
	("position_lat", "string"),
	("position_lon", "string"),
	("heart_rate", "integer"),
	("distance", "float"),
	("altitude", "float"),
	("lap", "integer"),
	("cadence", "float"), 
]


table = sqlalchemy.Table(table_name, metadata, autoload=False, schema=schema)
if table.exists():
	table.drop(checkfirst=False)

col = sqlalchemy.schema.Column('id', sqlalchemy.Integer, primary_key=True)
table.append_column(col)

field_names = []
for (field_name, field_type) in fields:
	col = sqlalchemy.schema.Column(field_name, type_map[field_type.lower()])
	table.append_column(col)
	field_names.append(field_name)

print("Field names",field_names)

table.create()

for root,dirs,files in os.walk("./activities"):
	for f in files:
		f_path = os.path.join(root,f)
		print(f,re.match('.*\.tcx$',f))
		if re.match('.*\.tcx$',f):
		
			conn = sqlalchemy.engine.Connection(engine)
			trans = conn.begin()
			
			try:
				points = activity_tcx_to_csv_str(f_path)
				
				
				for p in points:
					
					p['file'] = f
					
					if 'distance' not in p or not p['distance']:
						p['distance'] = 0
						
					if 'altitude' not in p or not p['altitude']:
						p['altitude'] = 0
						
					if 'cadence' not in p or not p['cadence']:
						p['cadence'] = 0
						
					#print(p)
					conn.execute(table.insert(), p)
				
				trans.commit()
				conn.close()
				
			except AttributeError as err:
				print("Error processing",f,err)
				trans.commit()
				conn.close()
				pass
			
