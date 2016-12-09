var fs = require("fs");
var GSTable = require("../gstable.js");

var fs = require('fs');
var postJson = fs.readFileSync("./test/artifacts/test.json", "utf8");

var table = GSTable.create();
table.parseJSON(postJson);
console.log(table.rows);
console.log(table.toJSON());

