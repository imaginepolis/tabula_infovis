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


module.exports = {
	HierarchicalBarchart : HierarchicalBarchart,
	Breadcrumb : Breadcrumb,
	DayHourHeatMap : DayHourHeatMap
}