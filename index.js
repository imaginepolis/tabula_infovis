/**
 * index.js
 * Main file for Library
 * @author: Juan Camilo Ibarra
 * @Creation_Date: September 2016
 * @version: 0.1.0
 * @Update_Author : Juan Camilo Ibarra
 * @Date: September 2016
 */


var c3 = require('c3');
var d3 = require('d3');
var colorbrewer = require('colorbrewer');


//******************************************************
// Selection Manager
//******************************************************

var SelectionManager = function(params)
{
	this.selected = null;
	this.multiple = false;
	this.comparison_function = null;

	if(params)
	{
		this.multiple = params.multiple ? params.multiple : false;
		this.comparison_function = params.comparison_function ? params.comparison_function : false;
	}
}

SelectionManager.prototype.click = function(d)
{
	if(this.multiple)
	{

	}
	else
	{
		if(this.selected == null)
		{
			this.selected = d;		
		}
		else
		{
			if(this.comparison_function(this.selected, d))
			{
				this.selected = null;
			}
			else
			{

			}
		}
	}
	
}

SelectionManager.prototype.isSelected = function()
{
	if(this.selected == null)
	{
		return false;
	}
	else
	{
		return true;
	}
}


//******************************************************
// Breadcrumbs
//******************************************************

var createBreadcrumbPoints = function(d, i) {
	var b = d.b;
	var points = [];
	points.push("0,0");
	points.push(b.w + ",0");
	points.push(b.w + b.t + "," + (b.h / 2));
	points.push(b.w + "," + b.h);
	points.push("0," + b.h);
	if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
		points.push(b.t + "," + (b.h / 2));
	}
	return points.join(" ");
}

var updateBreadcrumbs = function(_this){
	d3.selectAll("#trail_" + _this.bc_name).selectAll("*").remove();
	var g = d3.select("#trail_" + _this.bc_name)
		.selectAll("g")
		.data(_this.breadcrumbs, function(d) { return d.name + d.depth; });
	
	var entering = g.enter()
		.append("svg:g")
		.attr("transform", function(d, i) {
    		return "translate(" + i * (_this.b.w + _this.b.s) + ", 0)";
		})
		.on("mouseover", function(d,i){
			d3.selectAll(".trail_polygon_" + _this.bc_name)
				.style("opacity", 0.5);
			d3.select("#trail_polygon_" + i)
				.style("opacity", 1.0);
		})
		.on("mouseout", function(d,i){
			d3.selectAll(".trail_polygon_" + _this.bc_name)
				.style("opacity", 1.0);
		})
		.on("click", function(d,i){
			if(_this.enable)
			{
				_this.breadcrumbs = _this.breadcrumbs.slice(0,i+1);
				updateBreadcrumbs(_this);	
			}
			if(_this.removeCallback)
				_this.removeCallback(d,i);
		});
	entering.append("svg:polygon")
		.attr("points", createBreadcrumbPoints)
		.attr("class", "trail_polygon")
		.attr("id", function(d, i) { 
			return "trail_polygon_" + i + "_" + _this.bc_name;
		})
		.style("fill", function(d, i) { return _this.colorMap[i]; });
		
	entering.append("svg:text")
      .attr("x", (_this.b.w + _this.b.t) / 2)
      .attr("y", _this.b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.name; });

	d3.select("#trail")
		.style("visibility", "");
}

var Breadcrumb = function(){
	this.div;
	this.bc_name;
	// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
	this.b = { w: 75, h: 30, s: 3, t: 10};
	this.breadcrumbs = [];
	this.colorMap = [];
	this.colorScale = colorbrewer.Blues; 
	this.removeCallback;
	this.enable = true;
};

Breadcrumb.prototype.subscribeRemoveCallback = function(func)
{
	this.removeCallback = func;
}

Breadcrumb.prototype.init = function(div)
{
	var _this = this;
	this.bc_name = div.replace("#","_");
	this.div = d3.select(div).append('div');
	this.div.attr("id", "breadcrumb_div_" + _this.bc_name);
	var trail = d3.select("#breadcrumb_div_" + _this.bc_name).append("svg:svg")
		.attr("width", 750)
		.attr("height", 50)
		.attr("id", "trail_" + _this.bc_name);
}

Breadcrumb.prototype.addBreadcrumb = function(new_breadcrumb)
{
	this.breadcrumbs.push({name : new_breadcrumb, depth : this.breadcrumbs.length + 1, b : this.b});
	this.colorMap = this.colorScale[9];
	this.colorMap = this.colorMap.slice(2,9);
	updateBreadcrumbs(this);
}

Breadcrumb.prototype.removeBreadcrumb = function()
{
	this.breadcrumbs.pop();
	updateBreadcrumbs(this);
}


//******************************************************
// Hierarchical Barchart
//******************************************************

var callLevelFunction = function(_this, index)
{
	if(index > _this.breadcrumb_functions.length - 1)
	{
		index = _this.breadcrumb_functions.length - 1;
	}
	else if(index < 0)
	{
		index = 0;
	}

	_this.breadcrumb_functions[index](_this.breadcrumb_text[index], function(newData){
		_this.categories = newData.categories;
		_this.columns = newData.columns;
		_this.chart.load({
				columns : _this.columns, 
				categories : _this.categories,
				unload : true
			}
		);
	});	

}

var controlLevelUp = function(_this, index)
{
	_this.breadcrumb_level++;
	if(_this.breadcrumb_level >= _this.breadcrumb_functions.length)
	{
		_this.breadcrumb_level--;
	}
	else
	{
		_this.breadcrumb_text.push(_this.categories[index])
		callLevelFunction(_this, _this.breadcrumb_level);
		_this.breadcrumb.addBreadcrumb(_this.breadcrumb_text[_this.breadcrumb_text.length - 1]);
	}
}

var initSetup = function(div, _this)
{
	_this.breadcrumb = new Breadcrumb();
	_this.breadcrumb.subscribeRemoveCallback(function(d,i){
		if(i != _this.breadcrumb_level)
		{
			_this.breadcrumb_text = _this.breadcrumb_text.slice(0,i + 1);
			_this.breadcrumb_level = i;
			callLevelFunction(_this, i);	
		}
	});
	_this.breadcrumb.init(div);
	_this.breadcrumb.addBreadcrumb("Todos");

	var chart_div = d3.select(div).append("div")
	chart_div.attr("id", "hierarchical_chart")

	var set_val = {
		bindto : "#hierarchical_chart",
		data : {
			columns : [],	
			type : 'bar',
			onclick : function(d, element)
			{
				controlLevelUp(_this, d.index);
			}
		},
		axis : {
			x : {
				type : 'category',	
				categories : []
			},
			
		}
	};

	return set_val;
}


var HierarchicalBarchart = function(div){
	this.chart = null;
	this.breadcrumb_text = ['none'];
	this.breadcrumb_level = 0;
	this.breadcrumb_functions = [];
	this.columns = [];
	this.categories = [];
	this.setup_values = initSetup(div, this);
	this.breadcrumb;
}

HierarchicalBarchart.prototype.setBreadcrumbFunctions = function(funcs)
{
	this.breadcrumb_functions = funcs;
}

HierarchicalBarchart.prototype.setColorValueFunction = function(func)
{
	this.setup_values.data['color'] = function(color, d)
	{
		var c = d.id ? func(d.value) : "#AAA";
		return c;
	};
}

HierarchicalBarchart.prototype.setup = function(key, extra)
{
	for(each in extra)
		this.setup_values[key][each] = extra[each];	
}

HierarchicalBarchart.prototype.init = function()
{
	this.chart = c3.generate(this.setup_values);
}

HierarchicalBarchart.prototype.setBaseData = function(data)
{
	this.categories = data.categories;
	this.columns = data.columns;
	this.chart.load({
		columns : data.columns, 
		categories : this.categories
	});
}

HierarchicalBarchart.prototype.getBreadcrumbs = function()
{
	return this.breadcrumb_text;
}

HierarchicalBarchart.prototype.addData = function(newData)
{
	var newLegend = newData.title;
	var d = [newLegend];
	for(i in this.categories)
	{
		var cat = this.categories[i];
		if(newData[cat] != undefined)
			d.push(newData[cat]);
		else
			d.push(0);
	}
	this.columns.push(d);

	var types = {
		"Accidentes" : "bar"
	}
	types[newLegend] = "line";
	this.chart.load({
		columns : this.columns, 
		categories : this.categories,
		types : types,
		unload : true
	});
}

HierarchicalBarchart.prototype.removeData = function(dataTitle)
{
	var toRemove = -1;
	for (i in this.columns)
	{
		var col = this.columns[i];
		if(col[0] == dataTitle)
			toRemove = i;
	}
	if(toRemove != -1)
		this.columns.splice(toRemove, 1);

	this.chart.unload({
		ids : [dataTitle]
	});
}

//******************************************************
// Day/Hour Heatmap
//******************************************************

var DayHourHeatMap = function()
{
	this.margin =  { top: 50, right: 0, bottom: 100, left: 30 };
	this.width = 960 - this.margin.left - this.margin.right;
	this.height = 430 - this.margin.top - this.margin.bottom;
	this.gridSize = Math.floor(this.width / 24);
	this.legendElementWidth = this.gridSize*2;
	this.buckets = 9;
    this.colors = ["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]; // alternatively colorbrewer.YlGnBu[9]
    this.days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    this.times = ["1a", "2a", "3a", "4a", "5a", "6a", "7a", "8a", "9a", "10a", "11a", "12a", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p", "9p", "10p", "11p", "12p"];
    this.svg = null;

    this.colorScale = null;
    this.legendData = null;
    this.tooltip_div = null;
}

DayHourHeatMap.prototype.setData = function(data)
{
	var _this = this;
	// var colorScale = d3.scaleQuantile()
	// 	.domain([0, _this.buckets - 1, d3.max(data, function (d) { return d.value; })])
	// 	.range(_this.colors);
	var cards = this.svg.selectAll(".hour")
		.data(data, function(d) {return d.day+':'+d.hour;});

	cards.append("title");

	cards.enter().append("rect")
		.attr("x", function(d) { return (d.hour - 1) * _this.gridSize; })
		.attr("y", function(d) { return (d.day - 1) * _this.gridSize; })
		.attr("rx", 4)
		.attr("ry", 4)
		.attr("class", "hour bordered")
		.attr("width", _this.gridSize)
		.attr("height", _this.gridSize)
		.style("fill", function(d) { return _this.colorScale(d.value); })
		.on("mouseover", function(d) {		
            _this.tooltip_div.transition()		
                .duration(200)		
                .style("opacity", .9);		
            _this.tooltip_div.html(_this.days[d.day -1] + " " + _this.times[d.hour - 1] + "<br/>"  + d.value)	
                .style("left", (d3.event.pageX) + "px")		
                .style("top", (d3.event.pageY - 28) + "px");	
            })					
        .on("mouseout", function(d) {		
            _this.tooltip_div.transition()		
                .duration(500)		
                .style("opacity", 0);	
        });

	cards.transition().duration(1000)
		.style("fill", function(d) { return _this.colorScale(d.value); });

	cards.select("title").text(function(d) { return d.value; });

	cards.exit().remove();

	var legend = _this.svg.selectAll(".legend")
		//.data([0].concat(_this.colorScale.quantiles()), function(d) { return d; });
		.data(_this.legendData);

	legend.enter().append("g")
		.attr("class", "legend");

	legend.enter().append("rect")
		.attr("x", function(d, i) { return _this.legendElementWidth * i; })
		.attr("y", _this.height)
		.attr("width", _this.legendElementWidth)
		.attr("height", _this.gridSize / 2)
		.style("fill", function(d, i) { return _this.colors[i]; });

	legend.enter().append("text")
		.attr("class", "mono")
		.text(function(d) { return "≥ " + Math.round(d); })
		.attr("x", function(d, i) { return _this.legendElementWidth * i; })
		.attr("y", _this.height + _this.gridSize);

	legend.exit().remove();
}

DayHourHeatMap.prototype.init = function(div_id)
{
	var _this = this;
	this.svg = d3.select(div_id).append("svg")
		.attr("width", _this.width + _this.margin.left + _this.margin.right)
		.attr("height", _this.height + _this.margin.top + _this.margin.bottom)
		.append("g")
		.attr("transform", "translate(" + _this.margin.left + "," + _this.margin.top + ")");

	var dayLabels = this.svg.selectAll(".dayLabel")
		.data(_this.days)
		.enter().append("text")
		.text(function (d) { return d; })
		.attr("x", 0)
		.attr("y", function (d, i) { return i * _this.gridSize; })
		.style("text-anchor", "end")
		.attr("transform", "translate(-6," + _this.gridSize / 1.5 + ")")
		.attr("class", function (d, i) { return ((i >= 0 && i <= 4) ? "dayLabel mono axis axis-workweek" : "dayLabel mono axis"); });

	var timeLabels = this.svg.selectAll(".timeLabel")
		.data(_this.times)
		.enter().append("text")
		.text(function(d) { return d; })
		.attr("x", function(d, i) { return i * _this.gridSize; })
		.attr("y", 0)
		.style("text-anchor", "middle")
		.attr("transform", "translate(" + _this.gridSize / 2 + ", -6)")
		.attr("class", function(d, i) { return ((i >= 7 && i <= 16) ? "timeLabel mono axis axis-worktime" : "timeLabel mono axis"); });

	_this.tooltip_div = d3.select("body").append("div")	
		.attr("class", "tooltip")				
		.style("opacity", 0);
}


//******************************************************
// Card Heatmap
//******************************************************

var CardHeatMap = function(params)
{
	this.div_id = params.bindto;
	this.div = d3.select(this.div_id);
	this.margin =  { top: 100, right: 0, bottom: 50, left: 50 };
	this.bbox = this.div.node().getBoundingClientRect();
	if(this.bbox.width == undefined && this.bbox.height == undefined)
		console.log("Div must have width and height")
	else
	{
		this.width = this.bbox.width - this.margin.left - this.margin.right;
		this.height = this.bbox.height - this.margin.top - this.margin.bottom;
	}
	
	this.gridSize = 0;
	this.legendElementWidth = Math.floor(this.width / 9);
	this.buckets = 9;
    this.colors = null
    this.svg = null;

    this.axis = {
    	x : params.axis ? (params.axis.x ? params.axis.x : null) : null,
    	y : params.axis ? (params.axis.y ? params.axis.y : null) : null,
    }

    this.colorScale = null;
    this.legendData = null;
    this.tooltip_div = d3.select("body").append("div")	
		.attr("class", "tooltip")				
		.style("opacity", 0);;
    var _this = this;
    this.svg = d3.select(_this.div_id).append("svg")
		.attr("width", _this.width + _this.margin.left + _this.margin.right)
		.attr("height", _this.height + _this.margin.top + _this.margin.bottom)
		.append("g")
		.attr("transform", "translate(" + _this.margin.left + "," + _this.margin.top + ")");

	this.click_callback = null;

	this.tooltip_format = null;

	this.selectionManager = new SelectionManager({
		comparison_function : function(d, e){
			if(d.x == e.x && d.y == e.y)
				return true;
			else
				return false;
		}
	});
}

CardHeatMap.prototype.setData = function(data)
{
	var _this = this;	
	d3.select(_this.div_id).selectAll(".hmdata").remove();
	var cards = this.svg.selectAll(".hmdata")
		.data(data, function(d){ return _this.axis.y.indexOf(d.y) + ":" + _this.axis.x.indexOf(d.x);});
	

	var gridWidth = Math.floor(_this.width / _this.axis.x.length);
	var gridHeight = Math.floor(_this.height / _this.axis.y.length);

	var delta = (Math.abs(gridWidth - gridHeight) / 2);

	_this.gridSize = d3.min([gridWidth, gridHeight]);

	var divHeight = (_this.gridSize * _this.axis.y.length) +  _this.margin.top + _this.margin.bottom;

	this.div.attr("style", "height:"+ divHeight +"px;");

	var cards_group = cards.enter().append("g")
		.attr("class", "hmdata");
	var rectcard = cards_group.append("rect");
	rectcard.attr("x", function(d, i) { 
			return ((_this.axis.x.indexOf(d.x)) * _this.gridSize); })
		.attr("y", function(d) { 
			return (_this.axis.y.indexOf(d.y)) * _this.gridSize; })
		.attr("rx", 4)
		.attr("ry", 4)
		.attr("class", function(d,i) {
			return	"hmdata uns_bordered " + "x_" + d.x + " y_" + d.y
		})
		.attr("width", _this.gridSize)
		.attr("height", _this.gridSize)
		.style("fill", function(d) { return _this.colorScale(d.value); })
	rectcard
		.on("mouseover", function(d) {
			if(!_this.selectionManager.isSelected()) 
			{
				d3.select(this).classed("uns_bordered", false);
	            d3.select(this).classed("sel_bordered", true);
	        }
				var tooltip_text = "";
				if(_this.tooltip_format)
				{
					tooltip_text = _this.tooltip_format(d);
				}
				else
				{
					tooltip_text = "x: " + d.x + " y: " + d.y + "<br/>v: "  + d.value;
				}

	            _this.tooltip_div.transition()		
	                .duration(200)		
	                .style("opacity", .9);		
	            _this.tooltip_div.html(tooltip_text)	
	                .style("left", (d3.event.pageX + (_this.gridSize / 2)) + "px")		
	                .style("top", (d3.event.pageY + (_this.gridSize / 2)) + "px");	
        })				
        .on("mouseout", function(d) {
        	if(!_this.selectionManager.isSelected())
        	{
    	        d3.select(this).classed("uns_bordered", true)	
	            d3.select(this).classed("sel_bordered", false)		
         	}		
     		_this.tooltip_div.transition()		
                .duration(500)		
                .style("opacity", 0);	
	        
        })
        .on("click", function(d,i){
        	_this.selectionManager.click(d);
	    	if(_this.click_callback && _this.selectionManager.isSelected())
	    	{
	    		_this.click_callback(d,i);
	    	}
	    	
        })
        ;

	cards.exit().remove();

	var legend = _this.svg.selectAll(".legend")
		.data(_this.legendData, function(d){return d;});

	var legend_group = legend.enter().append("g")
		.attr("class", "legend");
	legend_group.append("rect")
		.attr("x", function(d, i) { return _this.legendElementWidth * i; })
		//.attr("y", _this.height)
		.attr("y", -55)
		.attr("width", _this.legendElementWidth)
		.attr("height", 10)
		.attr("stroke", "#E6E6E6")
		.attr("stroke-width", 1)
		.style("fill", function(d, i) { return _this.colors[i]; })
	legend_group.append("text")
		.attr("class", "mono")
		.text(function(d) { 
			return "≥ " + Math.floor(d); 
		})
		.attr("x", function(d, i) { 
			return _this.legendElementWidth * i; 
		})
		//.attr("y", _this.height + 32);
		.attr("y", -32)		
	legend.exit().remove();

	d3.select(_this.div_id).selectAll(".xlabel").remove();
	var axis_x_labels = this.svg.selectAll(".xLabel")
		.data(_this.axis.x, function(d, i) { return i + ":" + d;})
	var axis_x_group = axis_x_labels.enter().append("g")
		.attr("class", "xlabel");
	axis_x_group.append("text")
		.text(function (d) { return d; })
		.attr("x", function(d, i) { return i * _this.gridSize; })
		.attr("y", 0)
		.style("text-anchor", "middle")
		.style("font-size", function(d){
			return _this.gridSize < 12 ? "6pt" : "9pt";
		})
		.attr("transform", "translate(" + _this.gridSize / 2 + ", -6)")
		.attr("class", function(d, i) { return "timeLabel mono axis"; })
		.on("mouseover", function(d) {		
            var value = 0;
            for(i in data)
            {
            	var datum = data[i];
            	if(datum.x == d)
            		value += datum.value
            }

            _this.tooltip_div.transition()		
                .duration(200)		
                .style("opacity", .9);		
            _this.tooltip_div.html("t: " + value)	
                .style("left", (d3.event.pageX + _this.gridSize) +"px")		
                .style("top", (d3.event.pageY + 20 ) + "px");	
            d3.select(_this.div_id).selectAll(".hmdata")
           		.filter(function(datum,i){
           			return datum.x == d ? null : this;
           		})
           		.style("fill", "#DCDCDC")
           	d3.select(this)
	           	.style("font-size", "9pt")
				.style("cursor", "none")
				.style("fill", "#000")
				.style("font-weight", "bold")
        })				
        .on("mouseout", function(d) {		
            _this.tooltip_div.transition()		
                .duration(500)		
                .style("opacity", 0);
            d3.select(_this.div_id).selectAll(".hmdata")
				.style("fill", function(datum) { return _this.colorScale(datum.value); })
			d3.select(this)
	           	.style("font-size", function(d){
					return _this.gridSize < 12 ? "6pt" : "9pt";
				})
				.style("cursor", "none")
				.style("fill", "#aaa")
				.style("font-weight", "normal")
            
        })
	axis_x_labels.exit().remove();

	d3.select(_this.div_id).selectAll(".ylabel").remove();
	var axis_y_labels = this.svg.selectAll(".yLabel")
		.data(_this.axis.y, function(d, i) { return i + ":" + d;})
	var axis_y_group = axis_y_labels.enter().append("g")
		.attr("class", "yLabel")
	axis_y_group.append("text")
		.text(function (d) { return d; })
		.attr("x", 0)
		.attr("y", function (d, i) { return i * _this.gridSize; })
		.style("text-anchor", "end")
		.attr("transform", "translate(-6," + _this.gridSize / 1.5 + ")")
		.attr("class", function (d, i) { return "dayLabel mono axis"; })
		.on("mouseover", function(d) {		
            var value = 0;
            for(i in data)
            {
            	var datum = data[i];
            	if(datum.y == d)
            		value += datum.value
            }

            _this.tooltip_div.transition()		
                .duration(200)		
                .style("opacity", .9);		
            _this.tooltip_div.html("t: " + value)	
                .style("left", (d3.event.pageX + 20) + "px")		
                .style("top", (d3.event.pageY + _this.gridSize) + "px");

            d3.select(_this.div_id).selectAll(".hmdata")
           		.filter(function(datum,i){
           			return datum.y == d ? null : this;
           		})
           		.style("fill", "#DCDCDC")
           	d3.select(this)
	           	.style("font-size", "9pt")
				.style("cursor", "none")
				.style("fill", "#000")
				.style("font-weight", "bold")

        })				
        .on("mouseout", function(d) {		
            _this.tooltip_div.transition()		
                .duration(500)		
                .style("opacity", 0);
            d3.select(_this.div_id).selectAll(".hmdata")
            	.style("fill", function(datum) { return _this.colorScale(datum.value); })
            d3.select(this)
	           	.style("font-size", function(d){
					return _this.gridSize < 12 ? "6pt" : "9pt";
				})
				.style("cursor", "none")
				.style("fill", "#aaa")
				.style("font-weight", "normal")
        })
	axis_y_labels.exit().remove();
}

//******************************************************
// Boxplot
//******************************************************

var Boxplot = function(params)
{
	//if(params == undefined) return;
	this.div_id = params.bindto;
	this.width = 960;
	this.height = 500;

	if(params)
	{
		this.width = params.width ? params.width : 960;
		this.height = params.height ? params.height : 500;
	}
	
	this.margin = {top: 20, right: 20, bottom: 30, left: 80};
    
	this.svg = d3.select(this.div_id).append("svg")
		.attr("class", "boxplot_svg")
    	.attr("width", this.width + this.margin.left + this.margin.right)
		.attr("height", this.height + this.margin.top + this.margin.bottom)
	this.g = this.svg.append("g")
		.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");


	this.x_axis = d3.scaleBand().rangeRound([0, this.width]).padding(0.1);
    this.y_axis = d3.scaleLinear().rangeRound([this.height, 0]);

    this.g.append("g")
    	.attr("class", "axis axis--x")
      	.attr("transform", "translate(0," + this.height + ")")

    this.g.append("g")
       	.attr("class", "axis axis--y")

    this.raw_data = null;


    this.tooltip_div = d3.select("body").append("div")	
		.attr("class", "tooltip")				
		.style("opacity", 0);

	this.transition = d3.transition().duration(3000);

	this.outlier_on = null;

	this.axis = {
		y : {
			ticks : 10
		},
		x : {}
	};
}



Boxplot.prototype.setData = function(data)
{
	//d3.selectAll(".boxplot_svg").remove();
	// this.svg = d3.select(this.div_id).append("svg")
	// 	.attr("class", "boxplot_svg")
 //    	.attr("width", this.width + this.margin.left + this.margin.right)
	// 	.attr("height", this.height + this.margin.top + this.margin.bottom)
	// this.g = this.svg.append("g")
	// 	.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");


	var _this = this;
	this.raw_data = data;
	var domain_data_raw = Object.keys(data);
	var domain_data = [];
	var array_data = [];
	var outliers = [];
	for(i in domain_data_raw)
	{
		var key = domain_data_raw[i];
		array_data.push({key : key, data : data[key]})
		var out_min = data[key].out_min;
		var out_max = data[key].out_max;
		if(out_min != null)
			outliers = outliers.concat(out_min);
		if(out_max != null)
			outliers = outliers.concat(out_max);

		domain_data.push({
			key : key,
			sample : data[key].sample,
			min : data[key].min,
			w1 : data[key].w1,
			q1 : data[key].q1,
			q2 : data[key].q2,
			q3 : data[key].q3,
			w2 : data[key].w2,
			max : data[key].max,
		});
	}




	this.x_axis.domain(domain_data_raw);
	var min_data = d3.min(d3.values(data), 
		function(d){
			return d.min;
		});
	var max_data = d3.max(d3.values(data), 
		function(d){
			return d.max;
		});
	var min_whisker = d3.min(d3.values(data), 
		function(d){
			return d.w1;
		});
	var max_whisker = d3.max(d3.values(data), 
		function(d){
			return d.w2;
		});
	var min_outliers = d3.min(outliers);
	var max_outliers = d3.max(outliers);


	this.y_axis.domain([d3.min([min_data, min_whisker, min_outliers]), d3.max([max_data, max_whisker, max_outliers])]);

	// this.svg.selectAll(".axis").remove();
 //  	this.g.append("g")
 //    	.attr("class", "axis axis--x")
 //      	.attr("transform", "translate(0," + this.height + ")")
 //    
 	// this.svg.selectAll(".axis--x") 	
 	// 	.call(d3.axisBottom(this.x_axis));

 	this.g.selectAll(".boxplot_legend_rect").remove();
 	var legend_rect = this.g.selectAll(".boxplot_legend_rect")
 		.data(domain_data, function(d, i){return i;})
 		.enter()
 		.append("clipPath")
 		.attr("id", function(d,i){ return "boxplot_rect_" + i})
 		.attr("class", "boxplot_legend_rect")
 		.append("rect")
 		.attr("x", function(d, i){ return _this.x_axis(d.key)})
 		.attr("y", function(d, i){ return _this.height + 10})
 		.attr("width", function(){ return _this.x_axis.bandwidth();})
 		.attr("height", 15)
 		.attr("opacity", 0)

 	this.g.selectAll(".axis--x").remove();
 	var legend_text = this.g.selectAll("text.axis--x")
 		.data(domain_data, function(d, i){ return i;})

 	legend_text
 		.enter()
 		.append("text")
 		.attr("class", "axis--x")
 		.attr("x", function(d, i) { return _this.x_axis(d.key);})
 		.attr("y", function(d, i) { return _this.height + 22;})
 		.attr("font-size", 10)
 		.attr("clip-path", function(d, i) {return "url(#boxplot_rect_" + i + ")"})
 		.text(function(d, i){ return d.key})


	this.g.selectAll(".boxplot_legend_rect_alpha").remove();
 	var legend_rect_alpha = this.g.selectAll(".boxplot_legend_rect_alpha")
 		.data(domain_data, function(d, i){return i;})
 		.enter()
 		.append("rect")
 		.attr("class", "boxplot_legend_rect_alpha")
 		.attr("x", function(d, i){ return _this.x_axis(d.key)})
 		.attr("y", function(d, i){ return _this.height + 10})
 		.attr("width", function(){ return _this.x_axis.bandwidth();})
 		.attr("height", 15) 
 		.attr("fill", "red")
 		.attr("opacity", 0)
 		.on("mouseover", function(d, i){
 			var pos_x = _this.x_axis(d.key);
 			var pos_y = _this.height + 10;
 			var text = d.key + "<br> sample: "+ d.sample ;
 			_this.tooltip_div.transition()		
                .duration(200)		
                .style("opacity", .9);		
            _this.tooltip_div.html(text)	
                .style("left", (d3.event.pageX) + "px")		
                .style("top", (d3.event.pageY - 20) + "px");
 		})
 		.on("mouseout", function(d,i){
 			 _this.tooltip_div.transition()		
                .duration(500)		
                .style("opacity", 0);
 		})


    // this.g.append("g")
    //   	.attr("class", "axis axis--y")
    

    
	this.svg.selectAll(".axis--y")
      	.call(
      		d3.axisLeft(this.y_axis)
      			.tickFormat(function(d){
      				var formatted = d;
      				if(_this.axis.y.format)
      					formatted = _this.axis.y.format(d);
      				return formatted;
      			})
      			.ticks( _this.axis.y.ticks)
      		)

   


    //this.svg.selectAll(".bar_boxplot").remove();
    var boxes = this.g.selectAll(".bar_boxplot")
    	.data(array_data, function(d,i){ return i;})

    //Remove data with old elements
    boxes.exit().remove();

    //Update old elements
    boxes
    	.attr("x", function(d){ return _this.x_axis(d.key)})
    	.transition(_this.transition)
    	.attr("y", function(d){ return _this.y_axis(d.data.q3)})
    	.attr("width", _this.x_axis.bandwidth())
    	.attr("height", function(d){ 
    		var conv = [_this.y_axis(d.data.q3), _this.y_axis(d.data.q1)];
    		return Math.abs(conv[0] - conv[1]);
    	})

    boxes.enter()
    	.append("rect")
    	.attr("class", "bar_boxplot")
    	.attr("x", function(d){ return _this.x_axis(d.key)})
    	.on("mouseover", function(d,i){
    		console.log(d);
    	})
    	.on("mouseout", function(d,i){

    	})
    	.transition(_this.transition)
    	.attr("y", function(d){ return _this.y_axis(d.data.q3)})
    	.attr("width", _this.x_axis.bandwidth())
    	.attr("height", function(d){ 
    		var conv = [_this.y_axis(d.data.q3), _this.y_axis(d.data.q1)];
    		return Math.abs(conv[0] - conv[1]);
    	})


    var line_median = this.g.selectAll("line.median")
    		.data(array_data, function(d,i){ return i;})

    line_median.exit().remove();

    line_median
		.attr("x1", function(d) { return _this.x_axis(d.key);})    
    	.attr("x2", function(d) { return _this.x_axis(d.key) + _this.x_axis.bandwidth();})
    	.transition(_this.transition)
    	.attr("y1", function(d) { return _this.y_axis(d.data.q2);})
		.attr("y2", function(d) { return _this.y_axis(d.data.q2);})

	line_median.enter()
    	.append("line")
    	.attr("class", "median")
    	.attr("x1", function(d) { return _this.x_axis(d.key);})
    	.attr("x2", function(d) { return _this.x_axis(d.key) + _this.x_axis.bandwidth();})
    	.attr("stroke", "black")
    	.attr("stroke-width", 1)
    	.attr("fill", "none")
    	.transition(_this.transition)
    	.attr("y1", function(d) { return _this.y_axis(d.data.q2);})
    	.attr("y2", function(d) { return _this.y_axis(d.data.q2);})


    var whiskers_top = this.g.selectAll("line.whisker_top")
    		.data(array_data, function(d,i){ return i;});

    whiskers_top.exit().remove();

    whiskers_top
    	.attr("x1", function(d) { return _this.x_axis(d.key);})
		.attr("x2", function(d) { return _this.x_axis(d.key) + _this.x_axis.bandwidth();})
		.transition(_this.transition)
		.attr("y1", function(d) { return _this.y_axis(d.data.w2);})
		.attr("y2", function(d) { return _this.y_axis(d.data.w2);})

	whiskers_top
    	.enter()
    	.append("line")
    	.attr("class", "whisker_top")
    	.attr("x1", function(d) { return _this.x_axis(d.key);})
    	.attr("x2", function(d) { return _this.x_axis(d.key) + _this.x_axis.bandwidth();})
		.attr("stroke", "black")
    	.attr("stroke-width", 1)
    	.attr("fill", "none")
    	.transition(_this.transition)
    	.attr("y1", function(d) { return _this.y_axis(d.data.w2);})
    	.attr("y2", function(d) { return _this.y_axis(d.data.w2);})

    	
    var whiskers_bottom = this.g.selectAll("line.whisker_bottom")
    	.data(array_data, function(d,i){ return i;})

    whiskers_bottom.exit().remove();

    whiskers_bottom
    	.attr("x1", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
		.attr("x2", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
		.transition(_this.transition)
		.attr("y1", function(d) { return _this.y_axis(d.data.w2);})
		.attr("y2", function(d) { return _this.y_axis(d.data.q3);})

	whiskers_bottom
    	.enter()
    	.append("line")
    	.attr("class", "whisker_bottom")
    	.attr("x1", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
    	.attr("x2", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
    	.attr("stroke", "black")
    	.attr("stroke-width", 1)
    	.attr("stroke-dasharray", "3,3")
    	.attr("fill", "none")
    	.transition(_this.transition)
    	.attr("y1", function(d) { return _this.y_axis(d.data.w2);})
    	.attr("y2", function(d) { return _this.y_axis(d.data.q3);})
    	

    var whisker_mid_top = this.g.selectAll("line.whisker_mid_top")
    	.data(array_data, function(d, i){ return i;})

    whisker_mid_top.exit().remove();

    whisker_mid_top
		.attr("x1", function(d) { return _this.x_axis(d.key);})
		.attr("x2", function(d) { return _this.x_axis(d.key) + _this.x_axis.bandwidth();})
		.transition(_this.transition)
		.attr("y1", function(d) { return _this.y_axis(d.data.w1);})
		.attr("y2", function(d) { return _this.y_axis(d.data.w1);})

    whisker_mid_top
    	.enter()
    	.append("line")
    	.attr("class", "whisker_mid_top")
    	.attr("x1", function(d) { return _this.x_axis(d.key);})
    	.attr("x2", function(d) { return _this.x_axis(d.key) + _this.x_axis.bandwidth();})
    	.attr("stroke", "black")
    	.attr("stroke-width", 1)
    	.attr("fill", "none")
    	.transition(_this.transition)
    	.attr("y1", function(d) { return _this.y_axis(d.data.w1);})
    	.attr("y2", function(d) { return _this.y_axis(d.data.w1);})
    	

    var whisker_mid_bottom = this.g.selectAll("line.whisker_mid_bottom")
    	.data(array_data, function(d, i){ return i;})

    whisker_mid_bottom.exit().remove();

    whisker_mid_bottom
		.attr("x1", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
		.attr("x2", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
		.transition(_this.transition)
		.attr("y1", function(d) { return _this.y_axis(d.data.w1);})
		.attr("y2", function(d) { return _this.y_axis(d.data.q1);})

	whisker_mid_bottom
    	.enter()
    	.append("line")
    	.attr("class", "whisker_mid_bottom")
    	.attr("x1", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
    	.attr("x2", function(d) { return _this.x_axis(d.key) + (_this.x_axis.bandwidth() / 2);})
    	.attr("stroke", "black")
    	.attr("stroke-width", 1)
    	.attr("stroke-dasharray", "3,3")
    	.attr("fill", "none")
		.transition(_this.transition)
    	.attr("y1", function(d) { return _this.y_axis(d.data.w1);})
    	.attr("y2", function(d) { return _this.y_axis(d.data.q1);})
    	



    var outliers = [];
    for(each in data)
    {
    	var outliers_data = data[each].out_max;
    	var outliers_indices = data[each].ind_out_max;
    	for(i in outliers_data)
    	{
    		outliers.push({
    			value : outliers_data[i],
    			column : each,
    			local_index : outliers_indices[i]
    		})
    	}
    }

	this.g.selectAll(".outlier").remove();
	if(outliers != null)
	{
		var outliers_points = this.g.selectAll("circle.outlier")
    		.data(outliers)

    	outliers_points
    		.enter()
    		.append("circle")
    		.attr("class", "outlier")
    		.attr("cx", function(d){ return _this.x_axis(d.column) + (_this.x_axis.bandwidth() / 2);})
    		.attr("r", 4)	
    		.attr("fill", "#555")
    		.attr("opacity", .5)
    		.on("mouseover", function(d, i)
    		{
    			var tooltip_x = _this.x_axis(d.column) + (_this.x_axis.bandwidth() / 2);
    			var tooltip_y = _this.y_axis(d.value);
    			d3.select(this)
    				.attr("r", 8);

    			_this.tooltip_div.transition()		
                	.duration(200)		
                	.style("opacity", .9);		
            	_this.tooltip_div.html(d.value)	
                	.style("left", (d3.event.pageX) + "px")		
                	.style("top", (d3.event.pageY) + "px");

                if(_this.outlier_on)
                {
                	_this.outlier_on.mouseover(d, i);
                }
    		})
    		.on("mouseout", function(d, i)
    		{
    			d3.select(this)
    				.attr("r",4);
    			_this.g.selectAll("#boxplot_tooltip").remove();

    			 _this.tooltip_div.transition()		
	                .duration(500)		
	                .style("opacity", 0);

	            if(_this.outlier_on)
                {
                	_this.outlier_on.mouseout(d, i);
                }
    		})
    		.transition(_this.transition)
    		.attr("cy", function(d){ return _this.y_axis(d.value);})
    		
    }
    
}

//******************************************************
// Gant Chart
//******************************************************

var GanttChart = function(params)
{
	var w = params.width;
	var h = params.heigth;
	var w = params.width;
	this.bindTo = params.bindto;
	this.tooltipDiv = params.tooltipDiv;
	var taskArray = params.data;

	var triangles;
	if(params.triangles==undefined){
		triangles = false;
	}else{
		triangles = params.triangles;
	}
	console.log(" --> ");
	console.log(params.triangles);
	console.log(triangles);

	this.svg = d3.selectAll(params.bindto)
		.append("svg")
		.attr("width", w)
		.attr("height", h)
		.attr("class", "svg");

	this.tooltip_div = d3.select("body").append("div")
		.attr("class", "tooltip")
		.style("background", "#DDDDDD")
		.style("width", "200px")
		.style("text-align", "left")
		.style("opacity", 0);

	var dateMin;
	if(params.minDate){
		dateMin = new Date(params.minDate);
	}else{
		dateMin = d3.min(taskArray, function(d) {
			return new Date(d.startTime);
		});
	}

	var dateMax;
	if(params.maxDate){
		dateMax = new Date(params.maxDate);
	}else{
		dateMax = d3.max(taskArray, function(d) {
			return new Date(d.endTime);
		});
	}

	this.timeScale = d3.scaleTime()
		.domain([dateMin, dateMax])
		//.range([0,w-150]);
		.range([0,w-100]);

	this.categories = new Array();

	for (var i = 0; i < taskArray.length; i++){
		this.categories.push(taskArray[i].type);
	}
	this.catsUnfiltered = this.categories; //for vert labels

	this.categories = this.checkUnique(this.categories);

	for (var i = 0; i < taskArray.length; i++){
		this.categories.push(taskArray[i].type);
	}
	this.catsUnfiltered = this.categories; //for vert labels

	this.categories = this.checkUnique(this.categories);

	this.makeGant(taskArray, w, h, triangles);
	if(params.title){
		var title = this.svg.append("text")
			.text(params.title)
			.attr("x", w/2)
			.attr("y", 25)
			.attr("text-anchor", "middle")
			.attr("font-size", 18)
			.attr("fill", "#009FFC");
	}


}

GanttChart.prototype.makeGant = function(tasks, pageWidth, pageHeight, triangles){
	var barHeight = 20;
	var gap = barHeight + 4;
	var topPadding = 75;
	//var sidePadding = 75;
	var sidePadding = 150;
	var colorScale = d3.scaleLinear()
		.domain([0, this.categories.length])
		.range(["#444444", "#AAAAAA"])
		.interpolate(d3.interpolateHcl);
	this.makeGrid(sidePadding, topPadding, pageWidth, pageHeight);
	this.drawRects(tasks, gap, topPadding, sidePadding, barHeight, colorScale, pageWidth, pageHeight, triangles);
	this.vertLabels(gap, topPadding, sidePadding, barHeight, colorScale);
}


GanttChart.prototype.drawRects = function(theArray, theGap, theTopPad, theSidePad, theBarHeight, theColorScale, w, h, triangles){

	_this = this;
	var categories = this.categories;

	var flag = true;
	var bigRects = this.svg.append("g")
		.selectAll("rect")
		.data(theArray)
		.enter()
		.append("rect")
		.attr("x", 0)
		.attr("y", function(d, i){
			return i*theGap + theTopPad - 2;
		})
		.attr("width", function(d){
			//return w-theSidePad/2;
			return w+theSidePad/2;
		})
		.attr("height", theGap)
		.attr("stroke", "none")
		.attr("fill", function(d){
			/*for (var i = 0; i < _this.categories.length; i++){
			 if(d.type == categories[i]){
			 if(flag){
			 flag = false;
			 return d3.rgb(theColorScale(0));
			 }else{
			 flag = true;
			 return d3.rgb(theColorScale(_this.categories.length-1));
			 }
			 }
			 }*/
			for (var i = 0; i < _this.categories.length; i++){
				//console.log("i : "+i);
				if (d.type == categories[i]){
					if(i%2 == 0){
						return d3.rgb(theColorScale(0));
					}else{
						return d3.rgb(theColorScale(_this.categories.length-2));
					}
					//return d3.rgb(theColorScale(i));
				}
			}

		})
		.attr("opacity", 0.4);

	var rectangles = this.svg.append('g')
		.selectAll("rect")
		.data(theArray)
		.enter();

	var timeScale = this.timeScale;

	var barScale =1;

	//start and final triangles
	if(triangles==true) {
		barScale = 0.80;
		var tth = 0.2 * theBarHeight;//The triangle heigth
		var startTriangles = this.svg.append("g")
			.selectAll("polyline")
			.data(theArray)
			.enter()
			.append("polyline")
			.attr("fill", "black")
			.attr("stroke", "black")
			.attr("stroke-width", "1")
			.attr("points", function (d, i) {
				var x = timeScale(new Date(d.startTime)) + theSidePad;
				var y = i * theGap + theTopPad + (0.85 * theBarHeight);
				return "" + x + "," + y + " " + (x - (tth * 0.7)) + "," + (y + tth) + " " + (x + (tth * 0.7)) + "," + (y + tth) + " " + x + "," + y;
			});
		var endTriangles = this.svg.append("g")
			.selectAll("polyline")
			.data(theArray)
			.enter()
			.append("polyline")
			.attr("fill", "black")
			.attr("stroke", "black")
			.attr("stroke-width", "1")
			.attr("points", function (d, i) {
				var x = timeScale(new Date(d.startTime)) + theSidePad + (timeScale(new Date(d.endTime)) - timeScale(new Date(d.startTime)));
				var y = i * theGap + theTopPad + (0.85 * theBarHeight);
				return "" + x + "," + y + " " + (x - (tth * 0.7)) + "," + (y + tth) + " " + (x + (tth * 0.7)) + "," + (y + tth) + " " + x + "," + y;
			});
	}

	var innerRects = rectangles.append("rect")
		.attr("rx", 3)
		.attr("ry", 3)
		.attr("x", function(d){
			return timeScale(new Date(d.startTime)) + theSidePad;
		})
		.attr("y", function(d, i){
			return i*theGap + theTopPad;
		})
		.attr("width", function(d){
			return (timeScale(new Date(d.endTime))-timeScale(new Date(d.startTime)));
		})
		.attr("height", barScale*theBarHeight)
		.attr("stroke", "none")
		.attr("fill", function(d){
			if(d.task.includes("RESUELTO")){
				return "#2ca25f";
			}else if(d.task.includes("ASIGNADO A CAMPO")){
				return "#3182bd";
			}else {
				for (var i = 0; i < _this.categories.length; i++) {
					if (d.type == _this.categories[i]) {
						return d3.rgb(theColorScale(i));
					}
				}
			}
		});



	var rectText = rectangles.append("text")
		.text(function(d){
			return d.task;
		})
		.attr("x", function(d){
			var startPosition = timeScale(new Date(d.startTime));
			var endPosition = timeScale(new Date(d.endTime));
			return ( endPosition-startPosition)/2 + startPosition + theSidePad;
		})
		.attr("y", function(d, i){
			return i*theGap + 14+ theTopPad;
		})
		.attr("font-size", 11)
		.attr("text-anchor", "middle")
		.attr("text-height", theBarHeight)
		.attr("fill", "#fff");

	rectText.on('mouseover', function(e) {
		var tag = "";
		if (d3.select(this).data()[0].details != undefined){
			tag = "<b>Task:</b> " + d3.select(this).data()[0].task + "<br/>" +
				"<b>Type:</b> " + d3.select(this).data()[0].type + "<br/>" +
				"<b>Starts:</b> " + d3.select(this).data()[0].startTime + "<br/>" +
				"<b>Ends  :</b> " + d3.select(this).data()[0].endTime + "<br/>" +
				"<b>Details:</b> " + d3.select(this).data()[0].details;
		} else {
			tag = "Task: " + d3.select(this).data()[0].task + "<br/>" +
				"Type: " + d3.select(this).data()[0].type + "<br/>" +
				"Starts: " + d3.select(this).data()[0].startTime + "<br/>" +
				"Ends: " + d3.select(this).data()[0].endTime;
		}

		_this.tooltip_div.transition()
			.duration(200)
			.style("opacity", .9);
		_this.tooltip_div.html(tag)
			.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY + 8) + "px");


	}).on('mouseout', function() {
		//var output = document.getElementById(_this.tooltipDiv);
		/*var output = document.getElementById("tag");
		 output.style.display = "none";*/

		_this.tooltip_div.transition()
			.duration(500)
			.style("opacity", 0);

	});

	innerRects.on('mouseover', function(e) {
		var tag = "";
		if (d3.select(this).data()[0].details != undefined){
			tag = "<b>Task:</b> " + d3.select(this).data()[0].task + "<br/>" +
				"<b>Type:</b> " + d3.select(this).data()[0].type + "<br/>" +
				"<b>Starts:</b> " + d3.select(this).data()[0].startTime + "<br/>" +
				"<b>Ends  :</b> " + d3.select(this).data()[0].endTime + "<br/>" +
				"<b>Details:</b> " + d3.select(this).data()[0].details;
		} else {
			tag = "Task: " + d3.select(this).data()[0].task + "<br/>" +
				"Type: " + d3.select(this).data()[0].type + "<br/>" +
				"Starts: " + d3.select(this).data()[0].startTime + "<br/>" +
				"Ends: " + d3.select(this).data()[0].endTime;
		}

		_this.tooltip_div.transition()
			.duration(200)
			.style("opacity", .9);
		_this.tooltip_div.html(tag)
			.style("left", (d3.event.pageX) + "px")
			.style("top", (d3.event.pageY + 8) + "px");


	}).on('mouseout', function() {
		_this.tooltip_div.transition()
			.duration(500)
			.style("opacity", 0);
	});
}


GanttChart.prototype.makeGrid = function(theSidePad, theTopPad, w, h){
	_this=this;
	_this.xAxis = d3.axisBottom(_this.timeScale);
	_this.xAxis.tickFormat(d3.timeFormat('%H %M'));
	_this.xAxis.tickSize(-h+theTopPad+20, 0, 0);
	_this.xAxis.ticks(8);

	var grid = this.svg.append('g')
		.attr('class', 'grid')
		//.attr('transform', 'translate(' +theSidePad + ', ' + (h - 50) + ')')
		.attr('transform', 'translate(' +theSidePad + ', ' + (h - 40) + ')')
		//.call(xAxis)//TODO review
		.call(_this.xAxis)
		.selectAll("text")
		.style("text-anchor", "middle")
		.attr("fill", "#000")
		.attr("stroke", "none")
		.attr("font-size", 10)
		.attr("dy", "1em");//*/
}

GanttChart.prototype.vertLabels = function(theGap, theTopPad, theSidePad, theBarHeight, theColorScale){
	var numOccurances = new Array();
	var prevGap = 0;
	_this = this;
	var categories = this.categories;

	for (var i = 0; i < categories.length; i++){
		numOccurances[i] = [categories[i], this.getCount(categories[i], _this.catsUnfiltered)];
	}
	var axisText = this.svg.append("g") //without doing this, impossible to put grid lines behind text
		.selectAll("text")
		.data(numOccurances)
		.enter()
		.append("text")
		.text(function(d){
			return d[0];
		})
		.attr("x", 10)
		.attr("y", function(d, i){
			if (i > 0){
				for (var j = 0; j < i; j++){
					prevGap += numOccurances[i-1][1]-1;
					return (d[1]*theGap/2 + prevGap*theGap + theTopPad);

				}
			} else{
				return d[1]*theGap/2 + theTopPad;
			}
		})
		.attr("font-size", 11)
		.attr("text-anchor", "start")
		.attr("text-height", 14)
		.attr("fill", function(d){
			for (var i = 0; i < categories.length; i++){
				if (d[0] == categories[i]){
					return d3.rgb(theColorScale(i)).darker();
				}
			}
		});
}

GanttChart.prototype.checkUnique = function(arr){
	var hash = {}, result = [];
	for ( var i = 0, l = arr.length; i < l; ++i ) {
		if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
			hash[ arr[i] ] = true;
			result.push(arr[i]);
		}
	}
	return result;
}

GanttChart.prototype.getCounts = function(arr){
	var i = arr.length, // var to loop over
		obj = {}; // obj to store results
	while (i) obj[arr[--i]] = (obj[arr[i]] || 0) + 1; // count occurrences
	return obj;
}

GanttChart.prototype.getCount = function(word, arr){
	return this.getCounts(arr)[word] || 0;
}

module.exports = {
	HierarchicalBarchart : HierarchicalBarchart,
	Breadcrumb : Breadcrumb,
	DayHourHeatMap : DayHourHeatMap,
	CardHeatMap : CardHeatMap,
	SelectionManager : SelectionManager,
	Boxplot : Boxplot,
	GanttChart: GanttChart
}
