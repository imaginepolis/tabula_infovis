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

var controlLevelUp = function(_this, index)
{
	_this.breadcrumb_level++;
	if(_this.breadcrumb_level > _this.breadcrumb_functions.length)
	{
		_this.breadcrumb_level--;
	}
	else
	{
		_this.breadcrumb_text.push(_this.categories[index])
		console.log(_this.breadcrumb_level);
		console.log(_this.breadcrumb_text);
		var newData = _this.breadcrumb_functions[_this.breadcrumb_level]();	
		_this.categories = newData.categories;

		
		_this.chart.load({
				columns : newData.columns, 
				categories : _this.categories,
				unload : true
			}
		);
	}
	
}

var initSetup = function(div, _this)
{
	var set_val = {
		bindto : div,
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
	this.breadcrumb_text = [];
	this.breadcrumb_level = -1;
	this.breadcrumb_functions = [];
	this.columns = [];
	this.categories = [];
	this.setup_values = initSetup(div, this);
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


module.exports = {
	HierarchicalBarchart : HierarchicalBarchart
}