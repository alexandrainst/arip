# arip (Awesome real-time IoT platform)

arip is an object oriented approach towards exploiting Web sockets for the IoT. arip consists of
remote procedure calls, publish/subscribe and discoverability.

This means that a client can connect to the arip server, provide a description of it self (ex. what
rpc's does it provide), search for other clients and their descriptions, call rpc's, publish content
and subscribe to other clients publications.

## Simple example

1. In a terminal start genericplatform.py. On mac that is done by doing this (has only been tested with Python 2.7.5):
  * python genericplatform.py
2. Now the server is started and running in the terminal on localhost port 8888
3. put aripclient.js, test1.html and test2.html in the same folder in your webserver
4. Open test1.html in one browser session (ex. in incognito or use two different browsers)
5. Open test2.html in the other browser/incognito tap
6. Enable web developer tool in the browser, and see messages being transported
  1. Web developer tool in Chrome - the three stripe button at the top right --> Tools --> Developer tools
  2. Web developer tool in Firefox - Tools --> web developer --> web console
  
### Looking at the example client code (test1.html)

The arip lib uses parts from jquery, so jquery should be implemented (ex.):

<script src="http://code.jquery.com/jquery-1.10.1.min.js"></script>

Additionally the arip lib has to be implemented (if in same folder as the html file):

<script src="aripClient.js"></script>

Now we can add remote procedure calls (functions that other clients can call remotely):

<script type="text/javascript">
	function calculator(a,b){
    	return a+b;
    }
            
    function fullName(sirname,lastname){
    	return sirname+" "+lastname;
	}
</script>

Above is just two regular javascript functions, nothing else.

Now we will have to create and initialise arip:

var w=new arip("my_first","lamppost","localhost:8888/ws");

You will have to provide a unique id, a type, and the connection url. The type can be what ever, it's just used for grouping - maybe I want to search for all lampposts in arip.
Now you can register RPC's (remote procedure call), let's register the two function above:

w.registerFunction('calculator','[{"name":"a","type":"int"},{"name":"b","type":"int"}]', 'int');
w.registerFunction('fullName','[{"name":"sirname","type":"string"},{"name":"lastname","type":"string"}]', 'string');

You'll have to give an exact description of the functions. This means that each letter has to be the right case, you have to provide a return type, and all the parameters.
Parameters are described in json, so each parameter is a dict describing name of the parameter and the type.

If you want to listen for new client connections you'll have to provide a callback function that can catch and process the notification. This is done like this:

 w.setRegistrationsCallback(function(res){
    console.log("This is the registrations callback:");
	console.log(res);
});

When all functions and callbacks are registered you can connect to the server you started earlier:

w.connect();

Now you can chose to actually listen for new connections:

w.subscribeToRegistrations();

This means that the client will be notified when ever a new client connects to your arip instance.

Let's call some of the other features. we can start out by requesting the server for all registered clients:

w.getAllEntities(function(res){
	console.log(res);
});

In most cases you'll have to provide a callback function, since you don't really know when the server responds.

Finally we can now set up the client to publish data to all it's observers:

setInterval(function(){
	w.publish("Her er jeg");
},1000);

In the above example, I have chosen to use the build in javascript function setInterval, so that I can publish data every one second (for testing purposes).

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

* This platform is greatly inspired by http://wamp.ws/.
* Builds on top of the Python tornado library.