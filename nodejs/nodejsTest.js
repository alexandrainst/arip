var Arip = require("./aripClientNode");

//https://github.com/peter-murray/node-hue-api
var hue = require("node-hue-api");

//https://github.com/node-schedule/node-schedule/wiki/Recurrence-Rule-Scheduling
var schedule = require('node-schedule');


//Scheduler variables
var lampposts={};
var activeVotings={};
var SUMsuggestions=0;

//HUE variables
//var host="192.168.1.3";
var username="e7b2a3326e52d8fd5a252b17672d07";
var connectionUrl="localhost:8888/ws";
var hueInstance;
//var state = lightState.create();
var HueApi = hue.HueApi;
var lightState = hue.lightState;

var lamps={};

    /****************************/
    /*                          */
    /*      Main functions      */
    /*                          */
    /****************************/

findBridges();

var w=new Arip("LamppostScheduler","scheduler",connectionUrl);
    w.registerFunction('createSuggestion','[{"name":"lampId","type":"string"},{"name":"date","type":"string"},{"name":"dimmLevel","type":"int"}]', '');
    w.registerFunction('deleteSuggestion','[{"name":"suggestionId","type":"string"}]', '');
    w.registerFunction('voteOnSuggestion','[{"name":"suggestionId","type":"string"},{"name":"vote","type":"int"}]', '');
    w.registerFunction('getAllActiveSuggestions','[]', 'JSONObject');
    w.registerFunction('getAllLampposts','[]', 'JSONObject');
    
    w.connect();
    
    //displayBridges2();
    //createSuggestion(2,"2015-06-10T14:14:00",0);
    //console.log(new Date());
    
    /****************************/
    /*                          */
    /* General public functions */
    /*                          */
    /****************************/
    
    //PUBLIC - Suggest specific voting: which lamp, dimm level (0-1)
    //Date is in "2015-03-25T12:00:00"
    createSuggestion = function(lampId,date,dimmLevel){
        var tempSug=new Suggestion(lampId,new Date(date),dimmLevel);
        activeVotings[tempSug.suggestionId]=tempSug;
        
        //Publish creation of suggestion
        w.publish({"created":JSON.stringify(tempSug)});
    }
    
    //PUBLIC - delete voting
    deleteSuggestion = function (suggestionId){
        activeVotings[suggestionId].scheduledSuggestion.cancel();
        
        delete activeVotings[suggestionId];
        
        //Publish deletion of suggestion
        w.publish({"deleted":JSON.stringify(activeVotings[suggestionId])});
    }
    
    //PUBLIC - vote is 0 or 1
    voteOnSuggestion = function (suggestionId, vote){
        vote > 0 ? activeVotings[suggestionId].votesUp++ : activeVotings[suggestionId].votesDown++;     
        w.publish({"voting":JSON.stringify(activeVotings[suggestionId])});
    }
    
    //PUBLIC - Get all active votings
    getAllActiveSuggestions = function(){
        return activeVotings;
    }
    
    //PUBLIC - get all lampposts
    getAllLampposts = function(){
        return lamps;
    }
    
    /****************************/
    /*                          */
    /* HUE connection functions */
    /*                          */
    /****************************/
    
    //Find HUE bridges
    function findBridges(){
        hue.nupnpSearch(function(err, result) {
            err ? hue.upnpSearch().then(displayBridges).fail(displayError).done() : displayBridges(result);
        });
    }

    //Helper function for finding bridges and connect
    function displayBridges(bridge) {
        if(bridge.length>0){
            //Choosing the bridge in the physical surroundings
            var bridgeIp=bridge[0].ipaddress;
            
            if(username=="" || username==undefined){
                hueInstance = new HueApi();
        
                hueInstance.createUser(bridgeIp, null, null, function(err, user) {
                    if (err)
                        throw err;
                    username=user;
                    displayBridges(bridge);
                    
                    console.log("User didn't exist. New user created");
                    
                });
            }else{
                hueInstance = new HueApi(bridgeIp, username);
                
                hueInstance.lights(function(err, lights) {
                    if (err)
                        throw err;
                    lights.lights.forEach(function(ele, ind,arr){
                        delete ele.modelid;
                        delete ele.swversion;
                        ele.state={};
                        lamps[ele.id]=ele;
                    });
                });
                
                console.log("Connection established with user account");
            }
            
        }else{
            findBridges();
            console.log("Couldn't find any bridges. Trying again until application is stopped!");
        }
    }
    
    

    //Testing function - should be removed
    //Only for testing at AI
   /* function displayBridges2(){
        hueInstance = new HueApi(host, username);
            
        hueInstance.lights(function(err, lights) {
            if (err)
                throw err;
                lights.lights.forEach(function(ele, ind,arr){
                    delete ele.modelid;
                    delete ele.swversion;
                    ele.state={};
                    lamps[ele.id]=ele;
                });
            });
    }*/
    
    
    /*****************************/
    /*                           */
    /*   Specific HUE functions  */
    /*                           */
    /*****************************/  

//Alter light state
function setLightState(lightId, strength){
    var tempState = lightState.create();
    
    if(strength>0)
        tempState.on().brightness(strength);
    else
        tempState.off();

    hueInstance.setLightState(lightId, tempState, function(err, lights) {
        if (err)
            throw err;
        
        //Update specific lamp in list
        lamps[lightId].state.on=tempState._values.on;
        lamps[lightId].state.brightness=tempState._values.bri;
        
        //Send to all arip listeners
        //w.publish({"lampStateChanged":JSON.stringify(lamps[lightId])});
        w.publish({"lampStateChanged":lamps[lightId]});
    });
}

//Search for new lights every 10 seconds
setInterval(function(){ 
    searchForNewLights();
    
    for (var key in lamps) {
        getLightStatus(lamps[key].id);
    }
},10000);

//Get light state
function getLightStatus(lightId){
    hueInstance.lightStatus(lightId, function(err, result) {
        if (err)
            throw err;
        
        var tempLamp=lamps[lightId];
        
        if(tempLamp.state.reachable!=result.state.reachable || tempLamp.state.on!=result.state.on || tempLamp.state.brightness!=result.state.bri){   
            tempLamp.state.on=result.state.on;
            tempLamp.state.brightness=result.state.bri;
            tempLamp.state.reachable=result.state.reachable;
            
            w.publish({"lampStateChanged":tempLamp});
        }
    });
}

//Check if new lights have been added to the system
function searchForNewLights(){
    hueInstance.searchForNewLights(function(err, result) {
        if (err)
            throw err;
        
        if(result){
            hueInstance.newLights(function(er, res) {
                if (er) throw er;
                
                if(res.hasOwnProperty("lights")){
                    res.lights.forEach(function(ele, ind,arr){
                        delete ele.modelid;
                        delete ele.swversion;
                        ele.state={};
                        lamps[ele.id]=ele;
                        
                        //Send ele to all arip listeners
                        w.publish({"newLamp":JSON.stringify(ele)});
                    });
                }
            });
        }
    });
}     
    
    /****************************/
    /*                          */
    /*   Scheduler functions    */
    /*                          */
    /****************************/
    
    //PRIVATE - Helper object for scheduling
    function Suggestion(lampId, date, dimmLevel){
        this.suggestionId=lampId+"_"+SUMsuggestions++;
        this.lampId=lampId;
        this.date=date;
        this.dimmLevel=dimmLevel;
        this.votesUp=0;
        this.votesDown=0;
        this.scheduledSuggestion = schedule.scheduleJob(date, (function(){
            if(this.votesUp>=this.votesDown){
                setLightState(this.lampId, this.dimmLevel);
                w.publish({"votingExecuted":JSON.stringify(this)});
            }else{
                w.publish({"votingCanceled":JSON.stringify(this)});
            }
            
            
            delete activeVotings[this.suggestionId];
        }).bind(this));  
    };
    
    
    /****************************/
    /*                          */
    /*       Debugging          */
    /*                          */
    /****************************/

//Debugging
function displayResult(result) {
    console.log(JSON.stringify(result, null, 2));
};

//HUE bridge error handling
function displayError(err){
    console.log(err);
}