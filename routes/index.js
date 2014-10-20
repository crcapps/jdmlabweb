var config = require('config');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var path = require('path');
var mkdirp = require('mkdirp');
var config = require('config');
var rimraf = require('rimraf');
var shuffle = require('shuffle');
var subjectsPath = path.join(__dirname, config.get('Application.subjectPath'));

var subjectsPath = path.join(__dirname, config.get('Application.subjectPath'));

var homePageTitle = config.get('Experiment.experimentName');
var adminTitle = homePageTitle + ' Administrative Console.'

/* Homepage */
router.get('/', function(req, res) {
  res.render('index', {title: homePageTitle});
});

/* Admin Console (set in configuration file) */
router.get(config.get('Application.Routes.adminRoute'),function(req, res) {
  res.render('modules/admin/admin', {title: adminTitle});
});

router.post(config.get('Application.Routes.adminRoute'),function(req, res) {
  var html = '';
  var returnHtml = '';
  var user = config.get('Experiment.primaryInvestigatorLogin');
  var pass = config.get('Experiment.primaryInvestigatorPassword');
  var body = req.body;


  var commands = body.commands.split('\n');
  for (var i = 0; i < commands.length; i++) {
            commands[i] = commands[i].replace(/\r$/, '').replace(/\n$/, '');
          }
  if (user === commands[0] && pass === commands[1]) {
    returnHtml = parseCommand(commands.slice(2));
  } else {
    returnHtml += config.get('Errors.errorInvalidCredentials');
  }
  res.render('modules/admin/admin', {output:returnHtml});
});

/* Anything else is parsed as a Subject ID */
router.get('/:id',function(req, res) {
  var section = '';
  var step = '';
  if (fs.existsSync(getSubjectFile(req.params.id))){
  res.render('modules/' + section + '/' + section, {instrument:step});
} else {
  res.status(404);
  res.render('error', {
      message: config.get('Errors.errorInvalidSubject'),
      error: {}
  });
}
});

router.post('/:id', function(req, res) {});

module.exports = router;



function getSubjectPath(subject) {
  return path.join(subjectsPath, subject);
}

function getSubjectFile(subject) {
  return path.join(getSubjectPath(subject), 'subject.csv');
}

function setupExperiment() {
  var consent = 'consent,';
  var debriefing = ',debriefing';
  var inventoryArray = ['survey1', 'survey2', 'survey3'];
  var inventory = 'inventoryInstructions,' + shuffle.shuffle(inventoryArray).join(',');
  var gridArray = ['grid1,slider1','grid2,slider2','grid3,slider3'];
  var grid = 'gridInstructions,' + shuffle.shuffle(gridArray).join(',');
  var mixArray = [inventory,grid];
  var mix = shuffle.shuffle(mixArray).join(',');
  return consent + mix + debriefing;
}

function writeData (filename, data) {
  try {
    fs.appendFileSync(filename, data, 'utf8');
  } catch (err) {
    throw err;
  }
}

function parseCommand (command) {
  var returnHtml = "";

  switch (command[0].toUpperCase()) {
    case "CREATE SUBJECTS":
      var subjects = command.slice(1).filter(function(v){return v!==''});
      var created = 0;
      var failed = 0;
      var duplicates = 0;
      for (var i = 0; i < subjects.length; i++) {
        var subject = subjects[i].replace(/\W/g, '');
        var file = getSubjectFile(subject);
        if (fs.existsSync(file)) {
          duplicates++;
          failed++;
          returnHtml += "<span>Subject " + subject + " already exists.  Ignoring.</span><br />\n";
        } else {
          try {
            mkdirp.sync(getSubjectPath(subject));
            var fd = fs.openSync(file, 'w');
            fs.closeSync(fd);
            writeData(file,setupExperiment());
            created++;
          }
          catch (err) {
            returnHtml = "<span>Error writing file for subject " + subject + " Error: " + err + "</span><br />\n";
            failed++;
          }

          returnHtml += "<span>Subject " + subject + " created.</span><br />\n";
        }
      }
      returnHtml += "<span>" + created + " new records created.</span><br />\n";
      returnHtml += "<span>" + failed + " records failed to create: " + duplicates + " were duplicate records ignored.</span><br />\n";
      break;
    case "DELETE SUBJECTS":
      var subjects = command.slice(1).filter(function(v){return v!==''});
      var removed = 0;
      var failed = 0;
      var ignored = 0;
      for (var i = 0; i < subjects.length; i++) {
        var subject = subjects[i].replace(/\W/g, '');
        var file = getSubjectFile(subject);
        if (fs.existsSync(file)) {
          try {
            rimraf.sync(getSubjectPath(subject));
            returnHtml += "<span>Removed file for subject " + subject + "</span><br />\n";
            removed++;
          }
          catch (err) {
            returnHtml += "<span>Error removing file for subject " + subject + ".  Error: " + err + "</span><br />\n";
            failed++;
            }
        } else {

          returnHtml += "<span>Subject " + subject + " doesn't exist.  Ignoring.</span><br />\n";
          ignored++;
        }
      }
      returnHtml += "<span>" + removed + " records removed.</span><br />\n";
      returnHtml += "<span>Failure removing " + failed + " records: " + ignored + " were nonexistent records ignored.</span><br />\n";
      break;
    case "LIST SUBJECTS":
      var subjects = fs.readdirSync(subjectsPath).filter(function (file) {
        return fs.statSync(file).isDirectory();
      });
      for (var i = 0; i < subjects.length; i++) {
        returnHtml += "<span>" + subjects[i] + "</span><br />\n";
      }
      break;
    /*case "EXPORT":
      var subjects = fs.readdirSync("./subjects").filter(function(v){ return /\.csv/.test(v); });
      var ex ='';
      for (var i = 0; i < subjects.length; i++) {
        try {
          var file = fs.readFileSync("./subjects/" + subjects[i],"utf8");
          ex += "BEGIN SUBJECT " + subjects[i].replace(".csv", "") + "\n\n";
          ex += file;
          ex += "\n\nEND SUBJECT " + subjects[i].replace(".csv", "") + "\n\n";
        }
        catch (err) {
          ex += "\n\nEXPORT OF SUBJECT " + subjects[i].replace(".csv", "") + " FAILED!!!\n\n";
        }
      }
      res.set({"Content-Disposition":"attachment; filename=\"export.csv\""});
      res.contentType("text/plain");
         res.send(ex);
      return;
    case "SHOW SUBJECTS":
      var subjects = command.slice(1).filter(function(v){return v!==''});
      var ex ='';
            for (var i = 0; i < subjects.length; i++) {
              try {
                var file = fs.readFileSync("./subjects/" + subjects[i] + ".csv","utf8");
                ex += "BEGIN SUBJECT " + subjects[i].replace(".csv", "") + "\n\n";
                ex += file;
                ex += "\n\nEND SUBJECT " + subjects[i].replace(".csv", "") + "\n\n";
              }
              catch (err) {
                ex += "\n\nEXPORT OF SUBJECT " + subjects[i].replace(".csv", "") + " FAILED!!!\n\n";
              }
            }
            res.set({"Content-Disposition":"attachment; filename=\"export.csv\""});
            res.contentType("text/plain");
               res.send(ex);
            return;*/
    default:
      returnHtml += config.get('Errors.errorMalformedCommand');
  }
  return returnHtml;
}

/*
function gridEliminationMode(mode) {
  switch (mode.toString().replace('\r','')) {
    case "RANKMODE SingleChoice":
      return "single";
    case "RANKMODE BestFirst":
      return "best";
    case "RANKMODE WorstFirst":
      return "worst";
    default:
      return "other";
  }
}

function parseGrid(gridFile) {
  var data;
  try {
  data = fs.readFileSync('./grid/' + gridFile, 'utf8');
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return getErrorHtml(errorNoGridFile);		}
   else {
      throw err;
    }
  }
  var gridHtml = "<div class=\"gridwrapper\">\n";
  var lines = data.split('\n');
  var elimMode = lines.slice(0,1);
  var rankMode = gridEliminationMode(elimMode);
  lines.splice(0,1);
  var row = 0;
  var column = 0;
  for (var l in lines) {
    var line = lines[l];
    var theLine = line.split(',');
    for (var c in theLine)
    {
      var col = theLine[c];
      var id = column + "," +row;
      var isRowHeader = (column == 0) ? true : false;
      var isColumnHeader = (row == 0) ? true : false;
      var isHeader = (isRowHeader || isColumnHeader) ? true : false;
      var cssclass = (isRowHeader) ? "gridrowheader" : (isColumnHeader) ? "gridcolumnheader" : "gridsquare";
      var spanclass =  isHeader ? "gridheader" : "gridcontent";
      var mouseover = isHeader ?  "" : " onmouseover=\"mouseOverGrid(" + id + ");\"";
      var mouseout = isHeader ? "" : " onmouseout=\"mouseOutGrid(" + id + ");\"";
      gridHtml += "<div id=\"" + id +"\" class=\"" + cssclass + "\"" + mouseover + mouseout + ">\n";
      gridHtml += "<span id=\"cell:" + id + "\" class=\"" + spanclass +  "\">";
      gridHtml += "<span class=\"Centerer\"></span><span class=\"Centered\">";
      if (isRowHeader && !isColumnHeader) {
         gridHtml += "<a id=\"choice:" + row + "\" href=\"#\" onclick=\"makeChoice(" + row + ",\'" + col + "\', \'"  + rankMode + "\');\">" + col + "</a>";
      }
      else {
        gridHtml += col;
      }
      gridHtml += "</span></span>\n";
      gridHtml += "</div>\n";
      column ++;
    }
    gridHtml += "<div style=\"clear:both\">\n";
    row++;
    column = 0;
  }
  row = 0;
  gridHtml += "</div>\n";
  gridHtml += "<input type=\"hidden\" id=\"movelog\" name=\"movelog\" />\n";
  return gridHtml;
}

function parseSliders(slidersFile) {
  var data;
  try {
    data = fs.readFileSync(slidersFile, 'utf8');
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return getErrorHtml(errorNoSlidersFile);		} else {
      throw err;
    }
  }
  var slidersHtml = "";
  var lines = data.split('\n');
  lines.splice(0, 1);
  var row = 0;
  var column = 0;
  for (var l in lines) {
    var line = lines[l];
    var theLine = line.split(',');
    //name,max,min,step,value,question,minlabel,maxlabel,midlabel
    var sliderName = theLine[0];
    var sliderMax = theLine[1];
    var sliderMin = theLine[2];
    var sliderStep = theLine[3];
    var sliderValue = theLine[4];
    var sliderQuestion = theLine[5];
    var sliderLeftPole = theLine[6];
    var sliderRightPole = theLine[7];
    var sliderMidPoint = theLine[8];
    slidersHtml += "<div class=\"sliderWrapper\">\n";
    slidersHtml += "<div class=\"topLabelDiv\"";
    slidersHtml += "<span class=\"topLabel\">" +  sliderQuestion + "</span>";
    slidersHtml += "</div>\n"
    slidersHtml += "<div class=\"sliderDiv\">\n";
    slidersHtml += "<span class=\"leftPole\">" +  sliderLeftPole + "</span>";
    slidersHtml += "<input class=\"slider\" type = \"range\" name = \"" + sliderName + "\" min=\"" + sliderMin +"\" + max=\"" + sliderMax + "\" step = \"" + sliderStep + "\" value = \"" + sliderValue +  "\" />\n";
    slidersHtml += "<span class=\"rightPole\">" +  sliderRightPole + "</span>\n";
    slidersHtml += "</div>\n"
    slidersHtml += "<div class=\"labelsDiv\">\n";
    slidersHtml += "<span class=\"midPoint\">" +  sliderMidPoint + "</span>";
    slidersHtml += "</div>\n"
    slidersHtml += "</div>\n"
  }
  slidersHtml += "<input type=\"hidden\" id=\"starttime\" name=\"starttime\" />\n";
  slidersHtml += "<input type=\"hidden\" id=\"time\" name=\"time\" />\n";
  slidersHtml += "<input type=\"hidden\" id=\"stoptime\" name=\"stoptime\" />\n";
  slidersHtml += "<button onclick=\"submitSliders();\">Submit</button>\n";
  return slidersHtml;
}

function parseSurvey(survey) {
  var data;
  try {
  data = fs.readFileSync('./survey/survey' + survey + '.html', 'utf8');
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      return getErrorHtml(errorNoSurveyFile);		} else {
        throw err;
    }
  }
  data += "<input type=\"submit\">\n";
  return data;
}



function writeGrid(inData, grid) {
  var outData = "";
  var gridNumber = getNumberText(grid);
  outData += "\nBEGIN CHOICE GRID ";
  outData += gridNumber;
  outData += "\n";
  outData += inData["movelog"];
  outData += "\nEND CHOICE GRID ";
  outData += gridNumber;
  return outData;
}

function writeAllKeys(inData) {
  var outData = "";
  for (var k in inData) {
    outData += k;
    outData += ",";
  }
  outData += "\n";
  for (var k in inData) {
    outData += inData[k];
    outData += ",";
  }
  return outData;
}

function writeSliders(inData, slider) {
  var startTime = inData['starttime'];
  var stopTime = inData['stoptime'];
  var outData = "";
  var sliderNumber = getNumberText(slider);
  outData += "\nBEGIN SLIDERS";
  outData += sliderNumber
  outData += "\n";
  outData += "START TIME: " + startTime + "\n";
  outData += "Rating finished in " + inData['time'] + " milliseconds.\n"
  delete inData['time'];
  delete inData['starttime'];
  delete inData['stoptime'];
  outData += writeAllKeys(inData);
  outData += "STOP TIME: " + stopTime + "\n";
  outData += "END SLIDERS ";
  outData += sliderNumber;
  return outData;
}

function getNumberText(number) {
  switch (number) {
      case 1:
        return "ONE";
      case 2:
        return "TWO";
      case 3:
        return "THREE";
      case 4:
        return "FOUR";
    }
}

function writeSurvey(inData, survey) {
  var outData = "";
  var surveyNumber = getNumberText(survey);
  outData += "\nBEGIN SURVEY "
  outData += surveyNumber;
  outData += "\n";
  outData += writeAllKeys(inData);
  outData += "END SURVEY ";
  outData += surveyNumber;
  return outData;
}
*/
