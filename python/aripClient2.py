 # Developer and idea: Lasse Steenbock Vestergaard (lasse.vestergaard@alexandra.dk)
 # 
 # The software is distributed under the MIT license
 # 
 # Copyright (C) 2014 The Alexandra Institute A/S www.alexandra.dk/uk
 # 
 # Permission is hereby granted, free of charge, to any person obtaining a copy of
 # this software and associated documentation files (the "Software"), to deal in the
 # Software without restriction, including without limitation the rights to use, copy,
 # modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 # and to permit persons to whom the Software is furnished to do so, subject to the
 # following conditions:
 # 
 # The above copyright notice and this permission notice shall be included in all
 # copies or substantial portions of the Software.
 # 
 # THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 # INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 # PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 # LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 # TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 # OR OTHER DEALINGS IN THE SOFTWARE.

from threading import Timer
import json
from twisted.internet import reactor
from autobahn.twisted.websocket import WebSocketClientProtocol
from autobahn.twisted.websocket import WebSocketClientFactory

class arip(WebSocketClientProtocol):

    def __init__(self, id, type, url):
        self.callCounter=0
        self.callbacks={}
        self.id=id
        self.type=type
        self.rpcs=[]
        self.theurl=url
        self.errorCallback=None
        self.publishCallback=None
        self.registrations=None
        self.connected=2
    
	##############################
    ##                          ##
    ##    Websocket methods     ##
    ##                          ##
    ##############################

    #Websocket creation
    def connect(self):
        #Connect to the websocket server
        print "1"
        
        factory = WebSocketClientFactory("ws://"+self.theurl+"?id="+self.id+"&type="+self.type)
        print "2"
        factory.protocol = arip
        print "3"
        
        #Make "localhost" a variable
        reactor.connectTCP("localhost", 8888, factory)
        
        print "4"
        reactor.run()
        print "5"
        self.connected=0

    #Connect
    def onConnect(self, request):
        print("Client connecting: {}".format(request.peer))
	
	#open
    def onOpen(self):
        self.connected=1
        self.sendMessage('{"request":"register_methods","params":'+json.dumps(self.rpcs)+'}'.encode('utf8'))

	#message
    def onMessage(self, payload, isBinary):
        mes=json.loads(payload.decode('utf8'))

        if 'result' in mes:
            self.callbacks[mes["req_id"]](mes["result"])
            del self.callbacks[mes["req_id"]]
        elif 'error' in mes:
            if self.errorCallback:
                self.errorCallback(mes)
        elif 'request' in mes:
            if mes["request"]=="publish":
                if self.publishCallback:
                    self.publishCallback(mes)
            elif mes["request"]=="call_method":
                fn=getattr(self,mes["params"][0],None)
                res=""
                if fn:
                    res=fn(*mes["params"][1])
                else:
                    res="Error occurred. The client could not parse the request as a function"
                self.sendMessage('{"request":"result", "content":"'+res+'", "req_id":"'+mes["req_id"]+'", "receiver":"'+mes["receiver"]+'"}')
        elif 'register' in mes:
            if self.registrations:
                self.registrations(mes)
        elif 'unregister' in mes:
            if self.registrations:
                self.registrations(mes)
	
    #close
    def onClose(self, wasClean, code, reason):
        self.connected=2
        print("WebSocket connection closed: {}".format(reason))
        
	##############################
    ##                          ##
    ##   arip server methods    ##
    ##                          ##
    ##############################
		
    def getAllEntities(self,callback):
        req_id=self.counterControl(callback)
        self.sendToServer('{"request":"get_all_entities", "req_id":"'+req_id+'"}')
	
    def getEntity(self, id, callback):
        req_id=self.counterControl(callback)
        self.sendToServer('{"request":"get_entity","params":["'+str(id)+'"], "req_id":"'+str(req_id)+'"}')
	
    def getEntitiesByType(self,type, callback):
        req_id=self.counterControl(callback)
        self.sendToServer('{"request":"get_entities_by_type","params":["'+type+'"], "req_id":"'+req_id+'"}')
	
    def getAllTypes(self,callback):
        req_id=self.counterControl(callback)
        self.sendToServer('{"request":"get_all_types", "req_id":"'+req_id+'"}')
	
    def subscribeToRegistrations(self):
        self.sendToServer('{"request":"subscribe_to_registrations"}')
	
    def unsubscribeFromRegistrations(self):
        self.sendToServer('{"request":"unsubscribe_from_registrations"}')
	
    def subscribeTo(self,id):
        self.sendToServer('{"request":"subscribe_to","params":["'+id+'"]}')
	
    def unsubscribeFrom(self,id):
        self.sendToServer('{"request":"unsubscribe_from","params":["'+id+'"]}')
	
	#params is a comma separated list
    #receiver is the id of the receiver
    def callMethod(self,methodName, params, receiver,callback):
        req_id=self.counterControl(callback)
        self.sendToServer('{"request":"call_method", "params":["'+str(methodName)+'",'+str(params)+'], "req_id":"'+str(req_id)+'", "receiver":"'+str(receiver)+'"}')
   
    def publish(self,content):
        self.sendToServer('{"request":"publish", "content":"'+content+'"}')
    
    ##############################
    ##                          ##
    ##   arip client methods    ##
    ##                          ##
    ##############################
    
    #parameters has to be a JSON list ex. [{"type":"string","name":"address"}]
    def registerFunction(self, name, params, returnType):
		#self.rpcs.append('{"methodName":"'+name+'","parameters":'+params+',"returnType":"'+returnType+'"}')
        self.rpcs.append({"methodName":name,"parameters":params,"returnType":returnType})
    
    def setErrorCallback(self, callback):
        self.errorCallback=callback
    
    def setPublisherCallback(self, callback):
        self.publishCallback=callback

    def setRegistrationsCallback(self, callback):
        self.registrations=callback
    
   	##############################
	##                          ##
    ##      Helper methods    	##
    ##                          ##
    ##############################
    
    def counterControl(self,callback):
        counter=self.callCounter
        self.callCounter +=1
        self.callbacks[counter]=callback
        return counter
    
    def sendToServer(self, content):
        if self.connected==1:
            self.sendMessage(json.dumps(content))
        elif self.connected==0:
            t=Timer(0.5, self.sendToServer, content)
            t.start()
        else:
            self.sendClose()
            self.connect()
            self.sendToServer(content)