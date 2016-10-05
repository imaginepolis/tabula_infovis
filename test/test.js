
var infovis = require('tabula_infovis');

var chart = new infovis.HierarchicalBarchart('#hierarchical_chart');
chart.init();

chart.setBaseData({
	columns : [['data1', 25, 63, 12, 75]],	
})