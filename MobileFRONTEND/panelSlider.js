$.widget( "alexandra.panelSlider", {
    options: {
        currentView: null,
        panels:[]
    },
    
 
    _create: function() {
        this.element.addClass("panelSlider");
        this.options.currentView=this.options.panels[0];
        
        $.each(this.options.panels, function(i, val){
            $("#"+val).hide();
        });
        
        $("#"+this.options.currentView).show();
    },
 
    // Create a public method.
    addPanel: function( panel ) {
        this.options.panels.push(panel);
        
        $("#"+panel).hide();
    },
    
    removePanel: function(panel){
        for(var i=0;i<this.options.panels.length;i++){
            if(this.options.panels[i]==panel){
                if(panel==this.options.currentView)
                    this.options.currentView= i-1<0 ? this.options.panels[1] : this.options.panels[i-1];
                    
                this.options.panels.splice(i, 1);
                break;
            }
        }
    },
    
    slide: function(panelToShow, goingBack){
        var tempThis=this;
        var tempCurrentView=this.options.currentView;
        
        //Old panel
        var currentPanel=$("<div/>",{
            css:{
                "position":"absolute",
                "top":0,
                "left":0,
                "width":"100%"
            }
        });
        
        this.element.append(currentPanel);
        currentPanel.append($("#"+this.options.currentView));
        
        $("#"+this.options.currentView).hide("slide",{direction: goingBack ? "right" : "left"}, function(){
            tempThis.element.append($("#"+tempCurrentView));
            currentPanel.remove();
        });
        
        
        //New panel
        var newPanel=$("<div/>",{
            css:{
                "position":"absolute",
                "top":0,
                "left":0,
                "width":"100%"
            }
        });
        
        this.element.append(newPanel);
        newPanel.append($("#"+panelToShow));
        
        $("#"+panelToShow).show("slide",{direction: goingBack ? "left" : "right"},function(){
            tempThis.element.append($("#"+panelToShow));
            newPanel.remove();
        });
        
        this.options.currentView=panelToShow;
    }
});