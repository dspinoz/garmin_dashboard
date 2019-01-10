from cubes import Workspace
from cubes.compat import ConfigParser
import sys

#settings = ConfigParser()
#settings.read("cubes/slicer.ini")
#print("Got slicer configuration",settings)

#workspace = Workspace(config=settings)
workspace = Workspace()
print("Got workspace")

workspace.register_default_store("sql", url="sqlite:///data.sqlite")
print("Store registered")
workspace.import_model("./cubes/model.json")

print("Imported model")

browser = workspace.browser("activities")

print("Got browser")

result = browser.aggregate()

print("Aggregate:")
print(result)
print(result.summary)

for record in result:
    print("  ",record)

print("Aggregate: drilldown=['lap']")
result = browser.aggregate(drilldown=["lap"])

print(result)
print(result.summary)

for record in result:
    print("  ",record)
