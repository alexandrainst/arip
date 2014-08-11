/* 
 * Developer and idea: Lasse Steenbock Vestergaard (lasse.vestergaard@alexandra.dk)
 * 
 * The software is distributed under the MIT license
 * 
 * Copyright (C) 2014 The Alexandra Institute A/S www.alexandra.dk/uk
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in the
 * Software without restriction, including without limitation the rights to use, copy,
 * modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE
 * OR OTHER DEALINGS IN THE SOFTWARE.
 */


function worp(id, type, url){
    var callCounter=0;
    var callbacks=new Array();
    this.id=id;
    this.type=type;
    var ws=null;
    var rpcs=[];
    var theurl=url;
    var errorCallback=null;
    var publishCallback=null;
    var registrations=null;
    var connected=false;
    
    /****************************/
    /*                          */
    /*    Websocket methods     */
    /*                          */
    /****************************/
    
    this.connect=function(){
        ws=new WebSocket('ws://'+theurl+'?id='+this.id+'&type='+this.type); //localhost:8888/ws
        
        ws.onopen=function(){
            connected=true;
            ws.send('{"request":"register_methods","params":['+rpcs+']}');
        };
        
        ws.onmessage=function(evt){
            console.log(evt.data);
            var obj = jQuery.parseJSON(evt.data);
            
            //Result of server requests or RPC"s
            if(obj.hasOwnProperty('result')){
                callbacks[obj.req_id](obj.result);
                delete callbacks[obj.req_id];
            }
            else if(obj.hasOwnProperty('error')){
                if(errorCallback)
                    errorCallback(obj);
            }
            else if(obj.hasOwnProperty('request')){
                if(obj.request==='publish'){
                    if(publishCallback)
                        publishCallback(obj);
                }
                else if(obj.request==='call_method'){
                    var fn=window[obj.params[0]];
                    var res='';
                    if(typeof fn === 'function')
                        res=fn.apply(null, obj.params[1]);
                    else
                        res='Error occurred. The client could not parse the request as a function';
                        
                    ws.send('{"request":"result", "content":"'+res+'", "req_id":"'+obj.req_id+'", "receiver":"'+obj.receiver+'"}');
                }
            }
            else if(obj.hasOwnProperty('register')){
                if(registrations)
                    registrations(obj);
            }
            else if(obj.hasOwnProperty('unregister')){
                if(registrations)
                    registrations(obj);
            }
        };
        
        ws.onclose=function(){};
    };
    
    /****************************/
    /*                          */
    /*   WORP server methods    */
    /*                          */
    /****************************/
    
    this.getAllEntities=function(callback){
        var req_id=counterControl(callback);
        sendToServer('{"request":"get_all_entities", "req_id":"'+req_id+'"}');
        //ws.send('{"request":"get_all_entities", "req_id":"'+req_id+'"}');
    };
    
    this.getEntity=function(id, callback){
        var req_id=counterControl(callback);
        sendToServer('{"request":"get_entity","params":["'+id+'"], "req_id":"'+req_id+'"}');
        //ws.send('{"request":"get_entity","params":["'+id+'"], "req_id":"'+req_id+'"}');
    };
    
    this.getEntitiesByType=function(type, callback){
        var req_id=counterControl(callback);
        sendToServer('{"request":"get_entities_by_type","params":["'+type+'"], "req_id":"'+req_id+'"}');
        //ws.send('{"request":"get_entities_by_type","params":["'+type+'"], "req_id":"'+req_id+'"}');
    };
    
    this.getAllTypes=function(callback){
        var req_id=counterControl(callback);
        sendToServer('{"request":"get_all_types", "req_id":"'+req_id+'"}');
        //ws.send('{"request":"get_all_types", "req_id":"'+req_id+'"}');
    };
    
    this.subscribeToRegistrations=function(){
        sendToServer('{"request":"subscribe_to_registrations"}');
        //ws.send('{"request":"subscribe_to_registrations"}');
    };
    
    this.unsubscribeFromRegistrations=function(){
        sendToServer('{"request":"unsubscribe_from_registrations"}');
        //ws.send('{"request":"unsubscribe_from_registrations"}');
    };
    
    this.subscribeTo=function(id){
        sendToServer('{"request":"subscribe_to","params":["'+id+'"]}');
        //ws.send('{"request":"subscribe_to","params":["'+id+'"]}');
    };
    
    this.unsubscribeFrom=function(id){
        sendToServer('{"request":"unsubscribe_from","params":["'+id+'"]}');
        //ws.send('{"request":"unsubscribe_from","params":["'+id+'"]}');
    };
    
    //params is a comma separated list
    //receiver is the id of the receiver
    this.callMethod=function(methodName, params, receiver,callback){
        var req_id=counterControl(callback);
        sendToServer('{"request":"call_method", "params":["'+methodName+'",'+params+'], "req_id":"'+req_id+'", "receiver":"'+receiver+'"}');
        //ws.send('{"request":"call_method", "params":["'+methodName+'",'+params+'], "req_id":"'+req_id+'", "receiver":"'+receiver+'"}');
    };
    
    //content has to be JSON object
    this.publish=function(content){
        sendToServer('{"request":"publish", "content":"'+content+'"}');
        //ws.send('{"request":"publish", "content":'+content+'}');
    };
    
    /****************************/
    /*                          */
    /*    WORP client methods   */
    /*                          */
    /****************************/
    
    //parameters has to be a JSON list ex. [{"type":"string","name":"address"}]
    this.registerFunction=function(name, params, returnType){
        rpcs.push('{"methodName":"'+name+'","parameters":'+params+',"returnType":"'+returnType+'"}');
    };
    
    this.setErrorCallback=function(callback){
        errorCallback=callback;
    };
    
    this.setPublishCallback=function(callback){
        publishCallback=callback;
    };
    
    this.setRegistrationsCallback=function(callback){
        registrations=callback;
    };
    
    /****************************/
    /*                          */
    /*      Helper methods      */
    /*                          */
    /****************************/
    
    var counterControl=function(callback){
        var counter=callCounter;
        callCounter++;
        callbacks[counter]=callback;
        return counter;
    };
    
    var sendToServer=function(content){
        console.log(content);
        if(connected)
            ws.send(content);
        else{
            var interval=setInterval(function(){
                if(connected){
                    clearInterval(interval);
                    ws.send(content);
                }
            },500);
        }
    };
};