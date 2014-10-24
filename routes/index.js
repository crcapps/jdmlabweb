var config = require('config');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var Shuffle = require('shuffle');
var moment = require('moment');
var archiver = require('archiver');

var shouldDownload = false;


var subjectsPath = path.join(__dirname, config.get('Application.subjectPath'));


var homePageTitle = config.get('Experiment.experimentName');
var adminTitle = homePageTitle + ' Administrative Console.';

/* Homepage */
router.get('/', function(req, res) {
  res.render('index', {title: homePageTitle});
});

/* Admin Console (set in configuration file) */
router.get(config.get('Application.Routes.adminRoute'),function(req, res) {
  res.render('modules/admin', {title: adminTitle});
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
  if (shouldDownload) {
    shouldDownload = false;
    var archive = archiver('zip');
    var outputFileName = "export-" + moment().format(config.get('Application.timeFormat')) + ".zip"
    var output = fs.createWriteStream(outputFileName);

    archive.on('error', function(err){
      throw err;
    });



    output.on('close', function () {
      res.set({"Content-Disposition":"attachment; filename=\"" + outputFileName + "\""});
      res.contentType("application/zip");
       res.send(fs.readFileSync(outputFileName));
    });

    archive.pipe(output);
    archive.bulk([
        { expand: true, cwd: __dirname + '/subjects', src: ['**/*'], dest: './'}
    ]);
    archive.finalize();

  }else {
    res.render('modules/admin', {output:returnHtml});
  }
});

/* Anything else is parsed as a Subject ID */
router.get('/:id',function(req, res, next) {
  var phase;
  var step;
  if (fs.existsSync(getSubjectFile(req.params.id))){
    try {
      var experiment = fs.readFileSync(getSubjectFile(req.params.id), {encoding:'UTF8'});
      var phaseStep = experiment.split(',').shift().split(' ');
      phase = phaseStep[0];
      step = phaseStep[1];
      if (phase === null || phase === '') {
        res.render('modules/debriefing');
        return;
      }
    } catch (err) {
      return next(err);
    }
    var returnHtml = doGet(req.params.id, phase, step);
    res.render('modules/' + phase, {data: returnHtml});
  } else {
  res.status(404);
  res.render('modules/invalid');
  }
  });

router.post('/:id', function(req, res) {
    var phase;
    var step;
    var body = req.body;
    var subjectFile = getSubjectFile(req.params.id);
    if (fs.existsSync(subjectFile)){
      try {
        var experiment = fs.readFileSync(getSubjectFile(req.params.id), {encoding:'UTF8'});
        experimentArray = experiment.split(',');
        var phaseStep = experimentArray.shift().split(' ');
        phase = phaseStep[0];
        step = phaseStep[1];
        if (phase === null || phase === '') {
          res.render('modules/debriefing');
          return;
        }
        experiment = experimentArray.join(',');
        fs.writeFileSync(subjectFile,experiment);
      } catch (err) {
        throw err;
      }
      doPost(req.params.id, phase, step, req.body);
      res.redirect('/' + req.params.id);
    } else {
    res.render('modules/invalid');
  }
});

module.exports = router;

function doGet(subject, phase, step) {
  switch(phase) {
    case "grid":
      return getGrid(step);
    case "slider":
      return getSlider(step);
    case "inventory":
      return getInventory(step);
    default:
      return '';
  }
}

function doPost(subject, phase, step, data) {
  switch(phase) {
    case 'consent':
      return postConsent(subject);
    case 'grid':
      return postGrid(subject, step, data);
    case 'slider':
      return postSlider(subject, step, data);
    case 'inventory':
      return postInventory(subject, step, data);
    default:
      return '';
  }

}

function getGrid(step) {
  var grid = 'grid' + step + '.csv';
  return parseGrid(grid);
}

function postGrid(subject, step, data) {
  var file = getSubjectFile(subject);
  if (fs.existsSync(file)) {
    var subjectPath = getSubjectPath(subject);
    var fileName = 'grid' + step + '.csv'
    var gridFile = path.join(subjectPath, fileName);
    fs.writeFileSync(gridFile, writeAllKeysAndValues(data));
  }
}

function getSlider(step) {
  var slider = 'slider' + step + '.csv';
  return parseSlider(slider);
}

function postSlider(subject, step, data) {
  var file = getSubjectFile(subject);
  if (fs.existsSync(file)) {
    var subjectPath = getSubjectPath(subject);
    var fileName = 'slider' + step + '.csv'
    var sliderFile = path.join(subjectPath, fileName);
    fs.writeFileSync(sliderFile, writeAllKeysAndValues(data));
  }
}

function getInventory(step) {
  var inventory = 'inventory' + step + '.html';
  return parseInventory(inventory);
}

function postInventory(subject, step, data) {
  var file = getSubjectFile(subject);
  if (fs.existsSync(file)) {
    var subjectPath = getSubjectPath(subject);
    var fileName = 'inventory' + step + '.csv'
    var inventoryFile = path.join(subjectPath, fileName);
    fs.writeFileSync(inventoryFile, writeAllKeysAndValues(data));
  }
}

function postConsent(subject) {
  var file = getSubjectFile(subject);
  if (fs.existsSync(file)) {
    var subjectPath = getSubjectPath(subject);
    var consentFile = path.join(subjectPath, 'consent.txt');
    var fd = fs.openSync(consentFile, 'w');
    fs.closeSync(fd);
    var now = moment().format(config.get('Application.timeFormat'));
    fs.writeFileSync(consentFile, now);
  }
}

function getSubjectPath(subject) {
  return path.join(subjectsPath, subject);
}

function getSubjectFile(subject) {
  return path.join(getSubjectPath(subject), 'subject.csv');
}

function writeAllKeysAndValues(inData) {
  var outData = "";
  var i = 0;
  var keys = new Array();
  for (var k in inData) {
    keys[i] = k;
    i++;
  }
  var keyString = keys.join(',');
  var j = 0;
  var values = new Array()
  for (var v in inData) {
    values[j] = inData[v];
    j++;
  }
  var valueString = values.join(',');
  outData = keyString + '\n' + valueString;
  return outData;
}

function setupExperiment() {
  var deck;
  var consent = 'consent,';
  var debriefing = ',debriefing';
  var inventoryArray = ['inventory 1', 'inventory 2', 'inventory 3', 'inventory 4'];
  deck = Shuffle.shuffle({deck: inventoryArray});
  var inventory = 'inventoryinstructions,' + deck.drawRandom(deck.length).join(',');
  var gridArray = ['grid 1,slider 1','grid 2,slider 2','grid 3,slider 3'];
  deck = Shuffle.shuffle({deck: gridArray});
  var grid = 'jdminstructions,' + deck.drawRandom(deck.length).join(',');
  var mixArray = [inventory,grid];
  deck = Shuffle.shuffle({deck: mixArray});
  mix = deck.drawRandom(deck.length).join(',');
  return consent + mix + debriefing;
}

function parseCommand (command) {
  var returnHtml = "";
  var subjects, failed, created, removed, ignored, duplicates, subject, file, i;
  switch (command[0].toUpperCase()) {
    case "CREATE SUBJECTS":
      subjects = command.slice(1).filter(function(v){return v!=='';});
      created = 0;
      failed = 0;
      duplicates = 0;
      for (i = 0; i < subjects.length; i++) {
        subject = subjects[i].replace(/\W/g, '');
        file = getSubjectFile(subject);
        if (fs.existsSync(file)) {
          duplicates++;
          failed++;
          returnHtml += "<span>Subject " + subject + " already exists.  Ignoring.</span><br />\n";
        } else {
          try {
            mkdirp.sync(getSubjectPath(subject));
            var fd = fs.openSync(file, 'w');
            fs.closeSync(fd);
            fs.appendFile(file,setupExperiment());
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
      subjects = command.slice(1).filter(function(v){return v!=='';});
      removed = 0;
      failed = 0;
      ignored = 0;
      for (i = 0; i < subjects.length; i++) {
        subject = subjects[i].replace(/\W/g, '');
        file = getSubjectFile(subject);
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
      subjects = fs.readdirSync(subjectsPath).filter(function (file) {
        return fs.statSync(file).isDirectory();
      });
      for (i = 0; i < subjects.length; i++) {
        returnHtml += "<span>" + subjects[i] + "</span><br />\n";
      }
      break;
    case 'EXPORT':
      shouldDownload = true;
      break;
    default:
      returnHtml += config.get('Errors.errorMalformedCommand');
      break;
  }
  return returnHtml;
}

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

function parseGrid(grid) {
  var gridPath = path.join(__dirname, config.get("Application.dataPath"));
  var gridFile = path.join(gridPath, grid);
  var data;
  try {
    data = fs.readFileSync(gridFile, 'utf8');
  } catch (err) {
    throw err;
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
      var isRowHeader = (column === 0) ? true : false;
      var isColumnHeader = (row === 0) ? true : false;
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

function parseSlider(slider) {
  var sliderPath = path.join(__dirname, config.get("Application.dataPath"));
  var sliderFile = path.join(sliderPath, slider);
  var data;
  try {
    data = fs.readFileSync(sliderFile, 'utf8');
  }
  catch (err) {
    throw err;
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
    slidersHtml += "</div>\n";
    slidersHtml += "<div class=\"sliderDiv\">\n";
    slidersHtml += "<span class=\"leftPole\">" +  sliderLeftPole + "</span>";
    slidersHtml += "<input class=\"slider\" type = \"range\" name = \"" + sliderName + "\" min=\"" + sliderMin +"\" + max=\"" + sliderMax + "\" step = \"" + sliderStep + "\" value = \"" + sliderValue +  "\" />\n";
    slidersHtml += "<span class=\"rightPole\">" +  sliderRightPole + "</span>\n";
    slidersHtml += "</div>\n";
    slidersHtml += "<div class=\"labelsDiv\">\n";
    slidersHtml += "<span class=\"midPoint\">" +  sliderMidPoint + "</span>";
    slidersHtml += "</div>\n";
    slidersHtml += "</div>\n";
  }
  slidersHtml += "<input type=\"hidden\" id=\"starttime\" name=\"starttime\" />\n";
  slidersHtml += "<input type=\"hidden\" id=\"time\" name=\"time\" />\n";
  slidersHtml += "<input type=\"hidden\" id=\"stoptime\" name=\"stoptime\" />\n";
  return slidersHtml;
}

function parseInventory(inventory) {
  var inventoryPath = path.join(__dirname, config.get("Application.dataPath"));
  var inventoryFile = path.join(inventoryPath, inventory);
  var data;
  try {
    data = fs.readFileSync(inventoryFile, 'utf8');
  } catch (err) {
    throw err;
  }
  return data;
}
