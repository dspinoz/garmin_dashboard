from cubes import Workspace
from cubes.compat import ConfigParser

settings = ConfigParser()
settings.read("slicer.ini")

print("Got slicer configuration",settings)

workspace = Workspace(config=settings)

print("Got workspace")

browser = workspace.browser("ibrd_balance")

print("Got browser")

result = browser.aggregate()

print("Aggregate:")
print(result)
print(result.summary)

for record in result:
    print("  ",record)

print("Aggregate: drilldown=['year']")
result = browser.aggregate(drilldown=["year"])

print(result)
print(result.summary)

for record in result:
    print("  ",record)
