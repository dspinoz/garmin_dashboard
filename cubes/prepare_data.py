from sqlalchemy import create_engine
from cubes.tutorial.sql import create_table_from_csv

FACT_TABLE = "ibrd_balance"
engine = create_engine('sqlite:///data.sqlite')
print("Got engine. Creating table from CSV")

create_table_from_csv(engine,
                      "IBRD_Balance_Sheet__FY2010.csv", 
                      table_name=FACT_TABLE,
                      fields=[
                            ("category", "string"),
                            ("category_label", "string"),
                            ("subcategory", "string"),
                            ("subcategory_label", "string"),
                            ("line_item", "string"),
                            ("year", "integer"),
                            ("amount", "integer")],
                      create_id=True
                  )

print("Done")
