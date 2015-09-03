var TYPE_STRING = 1,
    TYPE_INTEGER = 2,
    TYPE_REAL = 3,
    TYPE_BOOLEAN = 4,
    TYPE_ANGLE = 5;

exports.create = function() {
  
  var _this = {};
  _this.columnTypes = [];
  _this.columnNames = [];

  // UTIL FUNCTIONS
  function flipHash(hash) {
    var flipped = {};
    for (key in hash) {
      flipped[hash[key]] = key;
    }
    return flipped;
  }

  function empty(v) {
    var t = typeof v; 
    return t === 'undefined' || ( t === 'object' ? ( v === null || Object.keys( v ).length === 0 ) : [false, 0, "", "0"].indexOf( v ) >= 0 );
  };


  function isFloat(n) {
      return n === +n && n !== (n|0);
  }

  function isInteger(n) {
      return n === +n && n === (n|0);
  }

  function validRow(row) {
    for (var i = 0; i < row.length; i++) {
      var rowValue = row[i];
      switch (_this.columnTypes[i]) {
        case TYPE_INTEGER: 
          if (!isInteger(rowValue)) {
            throw new Exception("Row value '" + rowValue + "' at index " + i + "is not a valid integer.");
          }
          break;
        case TYPE_REAL:
          if (!isFloat(rowValue)) {
            throw new Exception("Row value '" + rowValue + "' at index " + i + "is not a valid real number.");
          }
        case TYPE_ANGLE:
          if (!(isFloat(rowValue)) || isInteger(rowValue) || !(rowValue >= 0 && rowValue <= 360)) {
            throw new Exception("Row value '" + rowValue + "' at index " + i + "is not a valid angle number (between 0 and 360).");
          } 
      }
    }
  }

  // PARSING FUNCTIONS
  function parseHeader(headerInfo) {
    headerInfo.forEach(function(property, idx) {
      var value = property["Value"];
      switch (property["Name"]) {
        case "rowCount": 
          _this.rowCount = value;
          break;
        case "columnCount":
          _this.columnCount = value;
          break;
        default:
          var propertyInfo = property["Name"].split("-");
          var idx = parseInt(propertyInfo[1]) - 1;
          switch (propertyInfo[2]) {
            case "type":
              _this.columnTypes[idx] = value;
              break;
            case "name": 
              _this.columnNames[idx] = value;
              break;
          }
      }
    })
  }

  function parseRow(rowString) {
    var currentColumn = "";
    var row = [];
    for (var i = 0; i < rowString.length; i++) {
      if (rowString[i] == "|") {
        row.push(currentColumn);
        currentColumn = "";
        i++;
      } else if (rowString[i] == "\\") {
        i++;
      }
      if (rowString[i] == "|") {
        row.push("");
      } else {
        currentColumn += rowString[i];
      }
    }
    return row;
  }

  // Parse the json into this object (maybe turn this into an initializer at some point?)
  _this.parseJSON = function(jsonString) {
    _this.columnNames = [];
    _this.columnTypes = [];
    _this.rowLabels = [];
    _this.rows = [];

    var tableInfo = JSON.parse(jsonString);
    var headerIndex;
    tableInfo['Children'].forEach(function(row, idx){
      headerIndex = row["Name"].indexOf("_headers");
      if (headerIndex > 0) {
        _this.tableName = row["Name"].substr(0, headerIndex);
        parseHeader(row["Properties"]);
      } else {
        row["Properties"].forEach(function(rowInfo, idx) {
          // Need to put in a smarter parser that parses escaped |
          var parsedRow = parseRow(rowInfo["Value"]);
          var rowIdx = parseInt(rowInfo["Name"]) - 1;
          _this.rowLabels[parsedRow[0]] = rowIdx;
          var rowData = [];
          for (var i = 1; i < parsedRow.length; i++) {
            idx = i - 1;
            switch (_this.columnTypes[idx]) {
              case TYPE_BOOLEAN:
                rowData[idx] = parsedRow[i] == "True";
                break;
              case TYPE_INTEGER:
                rowData[idx] = parseInt(parsedRow[i]);
                break;
              case TYPE_REAL:
                rowData[idx] = parseFloat(parsedRow[i]);
                break;
              case TYPE_ANGLE:
                rowData[idx] = parseFloat(parsedRow[i]);
                break;
              default:
                rowData[idx] = parsedRow[i];
            }
          }
          _this.rows[rowIdx] = rowData;
        })
      }
    })
  }

  _this.toJSON = function() {
    jsonObj = {
      "Children": [],
      "Name": "",
      "Properties": []
    };
    
    // Form Header
    headerInfo = [
      {
        "Name":"rowCount",
        "Value":_this.rowCount
      },
      {
        "Name":"columnCount",
        "Value":_this.columnCount
      }
    ];
    
    for (var i = 0; i < _this.columnTypes.length; i++) {
      headerInfo.push({
        "Name":["0", i + 1, "name"].join("-"),
        "Value":_this.columnNames[i]
      });
      headerInfo.push({
        "Name":["0", i + 1, "type"].join("-"),
        "Value":_this.columnTypes[i]
      });
    }
    
    jsonObj["Children"].push({
      "Children":[],
      "Name":_this.tableName + "_headers",
      "Properties":headerInfo
    });
    
    var rows = [];
    var rowLabels = flipHash(_this.rowLabels);
    for (var i = 0; i < _this.rowCount; i++) {
      newRow = rowLabels[i] + "|";
      for (var c = 0; c < _this.columnCount; c++) {
        if (_this.rows[i]) {
          if (_this.columnTypes[c] == TYPE_BOOLEAN) {
            newRow += _this.rows[i][c] ? "True" : "False";
          } else if (_this.columnTypes[c] != TYPE_STRING) {
            newRow += empty(_this.rows[i][c]) ? 0 : _this.rows[i][c];
          } else {
            newRow += _this.rows[i][c].replace("\\", "\\\\").replace("|", "\\|");
          }
        }
        newRow += "|";
      }
      
      rows.push({
        "Name": (i + 1).toString(),
        "Value": newRow
      });
    }
    
    jsonObj["Children"].push({
      "Children":[],
      "Name":_this.tableName,
      "Properties":rows
    });
    
    return JSON.stringify(jsonObj);
  }

  return _this;
}