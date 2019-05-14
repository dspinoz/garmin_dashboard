import requests
import json
import sys

import lxml.etree as ET
from bottle import route, run, template, static_file, response

xslt = ET.parse('tcx_to_csv.xsl')
transform = ET.XSLT(xslt)

create = True
insert = True
search = True

limit = 500

index = "activities"
subindex = "activities"

headers = {
    'Content-Type': "application/json",
    'cache-control': "no-cache"
}

def check_if_index_is_present(url):
    response = requests.request("GET", url, data="")
    json_data = json.loads(response.text)
    return json_data


if __name__ == "__main__":
  
  
  if create:
    url = "http://localhost:9200/{}".format(index)
    json_data = check_if_index_is_present(url)

    if(not 'error' in json_data):
        print("Deleted an index:",index)
        response = requests.request("DELETE", url)

    response = requests.request("PUT", url)
    if (response.status_code == 200):
        print("Created an index:",index)
    
  if insert:
    count = 0

    post_url = "http://localhost:9200/{}/{}".format(index, subindex)
    
    csv_header = None
    
    fd = open('activities/Activities_all.txt','r')
    for line in fd.readlines():
      count = count + 1
      if count == 1:
        csv_header = list(line.strip().split(','))
        next
        
      activity = {}
      for i,col in enumerate(line.strip().split(',')):
        activity[csv_header[i]] = col
      
      payload = json.dumps(activity)
      print(payload)
      
      response = requests.request("POST", post_url, data=payload, headers=headers)

      if(response.status_code!=201):
        print("Values not Posted in",index)
      
      #if count % 1000 == 0:
      #  print("Saving words...",count)
      #
      #if limit != 0 and count > limit:
      #  break
    
    fd.close()
    
    print("Saved",count,"activities")
  
  
    
  if search:
    search_term = "Aerobic HR*"
    
    print("Search Term:", search_term)
    payload = {
        "query": {
            "match": {
                "Name": str(search_term),
            }
        },
        "size": 50,
    }
    payload = json.dumps(payload)
    print(payload)
    url = "http://localhost:9200/{}/{}/_search".format(index, subindex)
    response = requests.request("GET", url, data=payload, headers=headers)
    response_dict_data = json.loads(str(response.text))
    print(response_dict_data)
    
    print("RESULTS (",response_dict_data['hits']['total'],")")
    for h in response_dict_data['hits']['hits']:
      print(h['_source']['Name'], h['_source']['File'])
    
