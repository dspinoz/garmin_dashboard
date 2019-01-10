import sqlalchemy
from cubes.tutorial.sql import create_table_from_csv
import lxml.etree as ET

import os
import re
import sys
import tempfile

xslt = ET.parse('tcx_to_csv.xsl')
transform = ET.XSLT(xslt)

def activity_tcx_to_csv_str(path):
	dom = ET.parse(path)
	return str(transform(dom))



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
			csvstr = activity_tcx_to_csv_str(f_path)

			print("Created csv")
			
			insert_command = table.insert()
			
			header_row = None
			
			for line in csvstr.splitlines():
				row = line.split(",")
				
				if not header_row:
					header_row = row
					continue
				
				record = dict(zip(field_names, row))
				print("record",record)
				
				if not record['distance']:
					record['distance'] = 0
					
				if not record['altitude']:
					record['altitude'] = 0
					
				if not record['cadence']:
					record['cadence'] = 0
					
				insert_command.execute(record)

