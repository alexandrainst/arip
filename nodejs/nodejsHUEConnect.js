var hue = require("node-hue-api"), HueApi = hue.HueApi, lightState = hue.lightState;

var hueInstance;
var state = lightState.create();
var username="e7b2a3326e52d8fd5a252b17672d07";
var lamps={};

    /****************************/
    /*                          */
    /*      Main section        */
    /*                          */
    /****************************/

//findBridges();

//hueInstance = new HueApi("192.168.0.100", username);
//setLightState(1, 50);
//hueInstance.lights().then(displayResult).done();
//hueInstance.lightStatus(2).then(displayResult).done();


    /****************************/
    /*                          */
    /*       HUE Config         */
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
                });
            }else{
                hueInstance = new HueApi(bridgeIp, username);
                
                hueInstance.lights(function(err, lights) {
                    if (err)
                        throw err;
                    lights.lights.forEach(function(ele, ind,arr){
                        delete ele.modelid;
                        delete ele.swversion;
                        lamps[ele.uniqueid]=ele;
                    });
                });
            }
            
        }else
            findBridges();
            console.log("Couldn't find any bridges. Trying again until application is stopped!");
    }
    

    /*****************************/
    /*                           */
    /* Specific light functions  */
    /*                           */
    /*****************************/  

//Alter light state
function setLightState(lightId, strength){
    var tempState;
    
    if(strength>0)
        tempState=state.on().brightness(strength);
    else
        tempState=state.off();

    hueInstance.setLightState(lightId, tempState, function(err, lights) {
        if (err)
            throw err;
        //Send to all arip listeners
    });
}

//Get light state
//Use each lights "reachable" property (state.reachable - true/false) to check availability
function getLightStatus(lightId){
    hueInstance.lightStatus(lightId, function(err, result) {
        if (err)
            throw err;
        
        var tempLamp=lamps[result.uniqueid];
        if(tempLamp.state.reachable!=result.state.reachable)
            //Send lamp to all arip listeners
        tempLamp.state=result.state;
    });
}

//Search for new lights every 10 seconds
setInterval(function(){ 
    searchForNewLights();
    
    lamps.forEach(function(i, res){
        getLightStatus(res.id);
    });
},10000);

//Check if new lights have been added to the system
function searchForNewLights(){
    hueInstance.searchForNewLights(function(err, result) {
        if (err)
            throw err;
        
        if(result){
            hueInstance.newLights(function(er, res) {
                if (er) throw er;
                //displayResult(res);
                res.lights.forEach(function(ele, ind,arr){
                        delete ele.modelid;
                        delete ele.swversion;
                        lamps[ele.uniqueid]=ele;
                        
                        //Send ele to all arip listeners
                    });
            });
        }
    });
}


//PUBLIC - get all lamps
function(){
    return lamps;
}

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