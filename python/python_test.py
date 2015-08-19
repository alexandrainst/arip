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

from aripClient import arip

class python_test():

    def __init__(self, name):
        self.name=name

        #w=arip()
        w=arip("my_third","lamppost_scheduler","localhost:8888/ws")
        #w.configure("my_third","lamppost_scheduler","localhost:8888/ws")
        
        w.registerFunction("getName",[],"string")
        w.registerFunction("setName",[{"name":"name","type":"string"}],"")
        w.connect()
        
        w.getEntity("my_first",self.callback_entity)
        w.callMethod("calculator", "[12,4]","my_first", self.callback_method)
        w.setPublisherCallback(self.callback_publish)
        w.subscribeTo("my_first")
	
	#################################
	#							  	#
	#       Callback methods      	#
	#								#
	#################################

    def callback_entity(res):
        print res

    def callback_method(res):
        print "The result is: "+res

    def callback_publish(res):
        print res
		
		
	#################################
	#							  	#
	#    Specific client methods    #
	#								#
	#################################

    def getName():
        return self.name

    def setName(n):
        self.name=n
		
if __name__ == '__main__':
    python_test("John")