import requests
import json
import sys

create = False
insert = False
search = True

limit = 500

index = "dictionary"
subindex = "words"

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
    
    
    fd = open('/usr/share/dict/words','r')
    
    
    for line in fd.readlines():
      count = count + 1
      word = line.strip()
    
      payload ={
      "word":word,
      }
      
      payload = json.dumps(payload)
      
      response = requests.request("POST", post_url, data=payload, headers=headers)

      if(response.status_code!=201):
        print("Values not Posted in",index)
      
      if count % 1000 == 0:
        print("Saving words...",count)
    
      if limit != 0 and count > limit:
        break
    
    fd.close()
    
    
    print("Saved",count,"words")
  
  
    
  if search:
    search_term = ".*man"
    
    print("Search Term:", search_term)
    payload = {
        "query": {
            "regexp": {
                "word": str(search_term),
            }
        },
        "size": 50,
        "sort": [

        ]
    }
    payload = json.dumps(payload)
    url = "http://localhost:9200/{}/{}/_search".format(index, subindex)
    response = requests.request("GET", url, data=payload, headers=headers)
    response_dict_data = json.loads(str(response.text))
    print(response_dict_data)
    
    print("RESULTS (",response_dict_data['hits']['total'],")")
    for h in response_dict_data['hits']['hits']:
      print(h['_source']['word'], h['_score'])
    
