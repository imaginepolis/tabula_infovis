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
	d3.selectAll("#trail").selectAll("*").remove();
	var g = d3.select("#trail")
		.selectAll("g")
		.data(_this.breadcrumbs, function(d) { return d.name + d.depth; });
	
	var entering = g.enter()
		.append("svg:g")
		.attr("transform", function(d, i) {
    		return "translate(" + i * (_this.b.w + _this.b.s) + ", 0)";
		})
		.on("mouseover", function(d,i){
			d3.selectAll(".trail_polygon")
				.style("opacity", 0.5);
			d3.select("#trail_polygon_" + i)
				.style("opacity", 1.0);
		})
		.on("mouseout", function(d,i){
			d3.selectAll(".trail_polygon")
				.style("opacity", 1.0);
		})
		.on("click", function(d,i){
			_this.breadcrumbs = _this.breadcrumbs.slice(0,i+1);
			updateBreadcrumbs(_this);
			if(_this.removeCallback)
				_this.removeCallback(d,i);
		});
	entering.append("svg:polygon")
		.attr("points", createBreadcrumbPoints)
		.attr("class", "trail_polygon")
		.attr("id", function(d, i) { 
			return "trail_polygon_" + i;
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
	// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
	this.b = { w: 75, h: 30, s: 3, t: 10};
	this.breadcrumbs = [];
	this.colorMap = [];
	this.colorScale = colorbrewer.Blues; 
	this.removeCallback;
};

Breadcrumb.prototype.subscribeRemoveCallback = function(func)
{
	this.removeCallback = func;
}

Breadcrumb.prototype.init = function(div)
{
	this.div = d3.select(div).append('div');
	this.div.attr("id", "breadcrumb_div");
	var trail = d3.select("#breadcrumb_div").append("svg:svg")
		.attr("width", 750)
		.attr("height", 50)
		.attr("id", "trail");
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

module.exports = {
	HierarchicalBarchart : HierarchicalBarchart,
	Breadcrumb : Breadcrumb
}