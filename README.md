# arip (Awesome real-time IoT platform)

arip is an object oriented approach towards exploiting Web sockets for the IoT. arip consists of
remote procedure calls, publish/subscribe and discoverability.

This means that a client can connect to the arip server, provide a description of it self (ex. what
rpc's does it provide), search for other clients and their descriptions, call rpc's, publish content
and subscribe to other clients publications.

## Protocol description

### General description of terms

#### req_id
* The "req_id" property is used for keeping track of which callback function to call, when the response comes back to the client that did the initial request. It's all taken care of behind the scene, and the developer should not care about this at all - magic will automatically happen :-)

### Get requests
* get_all_entities
* get_all_types
* get_entity
* get_entities_by_type

#### Communication flow
* client X --> server
  1. {"request":"get_all_entities", "params":[],"req_id":"unique_id"}
  2. {"request":"get_entity", "params":['clientY'],"req_id":"unique_id"}
* server --> clientX
  1. {"result":"[{'id':'clientY','type':'lamppost'},{'id':'clientZ','type':'hat'}]","req_id":"unique_id"} 
  2. {"result":"{'id':'clientY','type':'lamppost'}","req_id":"unique_id"}
  
### Publish request
* publish

#### Communication flow
* clientX --> server
  1. {"request": "publish", "content":"some_custom_content"}
* server --> all subscribers
  1. {"request": "publish", "content":"some_custom_content", "sender":"clientX"}
  
### RPC request
* call_method

#### Communication flow
* clientX --> server
  1. {"request":"call_method", "params":["some_method",[param1, param2]],"req_id":"unique_id", "receiver":"clientY"}
* server --> clientY
  1. {"request":"call_method", "params":["some_method",[param1, param2]],"req_id":"unique_id", "receiver":"clientX"}
* clientY --> server
  1. {"request":"result","content":"some_content","receiver":"clientX","req_id":"unique_id"}
* server --> clientX
  1. {"result":"some_content", "req_id":"unique_id"}
  
### Subscription and registration requests
* register_methods
* subscribe_to_registrations
* unsubscribe_from_registrations
* subscribe_to
* unsubscribe_from

#### Communication flow
* clientX --> server
  1. {"request":"register_methods", "params":[{"methodName":"stringMethod","parameters":[{"name":"a","type":"int"},{"name":"b","type":"int"}],"returnType":"string"},{"methodName":"intMethod","parameters":[{"name":"a","type":"int"},{"name":"b","type":"int"}],"returnType":"int"}]}
  2. {"request":"subscribe_to","params":["clientY"]}

## Simple example
rpc usage
pub/sub
discoverability

## Vote a lamppost

### Description and code

## Server libraries
* Python 

## Client libraries
* Javascript

## Future work
* Client libraries
  * Arduino
  * Python
  * Java
* Code optimisation
  * Merge the protocol code in fewer methods (for easier maintenance and alteration of the protocol)
  * Conform better to json-rpc
  * Better authentication and id management
  * Optimising pub/sub, so that client A don't have to subscribe to the entire client B, but instead can subscribe to specific features of client B
  * Implement response to all requests
    * Right now no response is given to the client when it subscribes to an other client (no acknowledgement)

## Credits

This platform is greatly inspired by http://wamp.ws/.
Builds on top of the Python tornado library.