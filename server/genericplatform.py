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

from tornado.web import MissingArgumentError
import tornado.httpserver
import tornado.websocket
import tornado.ioloop
import tornado.web
import json
import uuid

clients={}

class WSHandler(tornado.websocket.WebSocketHandler):
    #Register new connection
    def open(self):
        try:
            #Initial setup of the entity
            self.id=self.get_argument('id', uuid.uuid1().urn[9:]) if self.get_argument('id', uuid.uuid1()) != "" else uuid.uuid1().urn[9:]
            self.type=self.get_argument('type','default')
            self.observers=[]
            self.methods=[]
            self.subscribeToRegistrations=False
            self.stream.set_nodelay(True)

            #Test if id exists
            if not clients.has_key(self.id):
                for elem in clients.keys():
                    if(clients[elem].subscribeToRegistrations):
                        clients[elem].write_message('{"register":"'+self.id+'"}')

                clients[self.id]=self
            else:
                raise 'Existing id'
        
        #Close connection if id is not supplied or already existing
        except MissingArgumentError:
            self.write_message('{"error":"Id is not supplied. Please add an Id."}')
            self.close()
        except 'Existing id':
            self.write_message('{"error":"Id is taken. Try with an other Id."}')
            self.close()

    #Reads the recieved message and sends it to specific recipient or all observers
    def on_message(self, message):
    	print message
        message=json.loads(message)
        print message
        try:
            getattr(self, message["request"])(message)
        except AttributeError:
            self.write_message('{"error":"Method with the provided arguments does not exist."}')

    #Close connection and remove from observer lists
    def on_close(self):
        #Notify all observers that this entity is shutting down
        for elem in self.observers:
            clients[elem].write_message('{"unregister":"'+self.id+'"}')
        
        #Remove this entity from all observed entities lists
        for elem in clients.keys():
            for el in clients[elem].observers:
                if(el==self.id):
                    self.unsubscribe_from(elem)
                    break
        
        #Remove from clients list
        clients.pop(self.id, None)


    #######################################
    #                                     #
    #  Below are custom server functions  #
    #                                     #
    #######################################
    
    #Scenario 1 transactions
    #clientX | server | clientY
    #   --------->
    #   <---------
    
    #Get all entities in the system
    def get_all_entities(self, message):
        temp=[]
        for elem in clients.keys():
            tempdict={}
            tempdict['id']=clients[elem].id
            tempdict['type']=clients[elem].type
            temp.append(tempdict)
        self.write_message('{"result":'+json.dumps(temp)+', "req_id":"'+message["req_id"]+'"}')
    
    #Get specific entity by id
    def get_entity(self, message):
        try:
            cli=clients[message["params"][0]]
            tempdict={}
            tempdict['id']=cli.id
            tempdict['type']=cli.type
            tempdict['observers']=cli.observers
            tempdict['methods']=cli.methods
            
            self.write_message('{"result":'+json.dumps(tempdict)+', "req_id":"'+message["req_id"]+'"}')
        except KeyError:
            self.write_message('{"error":"Requested client does not exist."}')
            
    
    #Get entities by type
    def get_entities_by_type(self, message):
        tempList=[]
        try:
            for elem in clients.keys():
                if clients[elem].type == message["params"][0]:
                    tempList.append(clients[elem].id)
            typeIds={"type":message["params"][0],"idlist":tempList}
        
            self.write_message('{"result":"'+json.dumps(typeIds)+'", "req_id":"'+message["req_id"]+'"}' )
        except:
            self.write_message('{"error":"Wrong parameters."}')
        
    #Get all types
    def get_all_types(self, message):
        tempList=[]
        for elem in clients.keys():
            tempList.append(clients[elem].type)
        self.write_message('{"result":"'+json.dumps(sorted(set(tempList)))+'", "req_id":"'+message["req_id"]+'"}')
            
    #Scenario 1 transactions
    #clientX | server | clientY
    #   --------->
    
    #Subscribe to be notified when new entities connect
    def subscribe_to_registrations(self, message):
        self.subscribeToRegistrations=True
        
    #Unsubscribe from being notified when new entities connect
    def unsubscribe_from_registrations(self, message):
        self.subscribeToRegistrations=False
        
    #An entity can register all of it"s rpc methods
    def register_methods(self, message):
        try:
            self.methods=message["params"]
        except:
            self.write_message('{"error":"No arguments supplied"}')
        
    #Subscribe to a publisher (id)
    def subscribe_to(self, message):
        try:
            clients[message["params"][0]].observers.append(self.id)
        except:
            self.write_message('{"error":"Observer does not exist"}')
    
    #Unsubscribe from a publisher (id)
    def unsubscribe_from(self, message):
        try:
            clients[message].observers.remove(self.id)
            
            print self.id+" has successfully been unsubscribed from "+message
        except KeyError:
            self.write_message('{"error":"Observer does not exist"}')
        except IndexError:
            self.write_message('{"error":"The client is not observing this observer"}')
    
    #Scenario 4 transactions
    #clientX | server | clientY
    #   --------->
    #            --------->
    #            <---------
    #   <---------

    #Call a remote procedure
    def call_method(self, message):
        receiver=message["receiver"]
        message["receiver"]=self.id
        clients[receiver].write_message(json.dumps(message))
    
    def result(self, message):
        clients[message["receiver"]].write_message('{"result":'+json.dumps(message["content"])+',"req_id":"'+message["req_id"]+'"}')

    #Scenario 3 transactions
    #clientX | server | clientY
    #   --------->
    #            --------->

    #Publish content
    def publish(self, message):
        for elem in self.observers:
            clients[elem].write_message('{"request":"publish","content":'+json.dumps(message["content"])+',"sender":"'+self.id+'"}')

application = tornado.web.Application([(r"/ws", WSHandler)])

if __name__ == '__main__':
    http_server = tornado.httpserver.HTTPServer(application)
    http_server.listen(8888)
    tornado.ioloop.IOLoop.instance().start()