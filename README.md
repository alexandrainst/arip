arip (Awesome real-time IoT platform)

====

arip is an object oriented approach towards exploiting Web sockets for the IoT. arip consists of
remote procedure calls, publish/subscribe and discoverability.

This means that a client can connect to the arip server, provide a description of it self (ex. what
rpc's does it provide), search for other clients and their descriptions, call rpc's, publish content
and subscribe to other clients publications.

====

Protocol description

Server



Client


====

Simple example

rpc usage
pub/sub
discoverability

====

Vote a lamppost

Description and code

====

Server libraries

*Python 

Client libraries

*Javascript

====

Future work

*Client libraries
**Arduino
**Python
**Java
*Code optimisation
**Merge the protocol code in fewer methods (for easier maintenance and alteration of the protocol)
**Conform better to json-rpc
**Better authentication and id management
**Optimising pub/sub, so that client A don't have to subscribe to the entire client B, but instead can subscribe to specific features of client B

====

Credits

This platform is greatly inspired by http://wamp.ws/.
Builds on top of the Python tornado library.