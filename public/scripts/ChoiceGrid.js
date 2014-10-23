function ChoiceGrid() {

	//Config Variables
	var totalInterval = 1; //Timer inverval for total time in milliseconds
	var activationDelay = 250; //Delay for activation of a grid square in milliseconds
	var choiceInterval = 1;
	var lagInterval = 1;
	//Members
	this.totalTimer = new Timer(totalInterval);
	this.choiceTimer = new Timer(choiceInterval);
	this.activationDelay = new DelayTimer(activationDelay);
	this.lagTimer = new Timer(lagInterval);
}

var initial = 0;
var movedAlternativeWise = 1;
var movedAttributeWise = 2;
var movedDiagonally = 3;
var movedNone = 4;
var madeChoice = 5;

var initialText = "";
var movedAlternativeWiseText = "ALT-WISE";
var movedAttributeWiseText = "ATT-WISE";
var movedDiagonallyText = "NEITHER";
var movedNoneText = "NONE";
var madeChoiceText = "CHOICE";

var hasMovedYet = false;

var totalMoves = 0;
var altMoves = 0;
var attMoves = 0;
var diagMoves = 0;
var noneMoves = 0;

var viewTime = 0;

var totalChoices = 0;

var lastCoords = ["-1","-1"];

var moveSummary = "SUMMARY MEASURES\nMovements\n,Raw,Proportion\n";

var moveLog = "";

var cellActive = false;

var choiceGrid = new ChoiceGrid();

var choices;

function moveType(rowOrigin, colOrigin, rowDestination, colDestination) {
	return (rowOrigin == -1 || colOrigin == -1) ? initial : (rowOrigin == rowDestination && colOrigin == colDestination) ? movedNone : (colOrigin != colDestination && rowOrigin != rowDestination) ? movedDiagonally : (colOrigin != colDestination) ? movedAlternativeWise : movedAttributeWise;
}

function doinit() {
	choices = document.querySelectorAll("div.gridrowheader").length - 1;

	moveLog += "STARTTIME:" + new Date().toUTCString() + "\n";
	moveLog += "Movement: 1=Alt-wise   2=Att-wise   3=Neither   4=None   5=Choice\n";
	moveLog += "Index,Row,Column,Lag Time,Display Time,Movement\n";
	choiceGrid.totalTimer.start();
}

function makeChoice(id,label,rank) {
	hasMovedYet = true;
	totalChoices++;
	totalMoves++;
	//totalMoves++;
	//noneMoves++;
	lastCoords = ["-1","-1"];
	choiceGrid.lagTimer.stop();
	//var choices = document.querySelectorAll("div.gridrowheader").length;
	if ((rank == "best" || rank == "worst") && totalChoices < choices) {
		if (!hasMovedYet) {
			//moveLog += "Index,Row,Column,Lag Time,Display Time,Movement\n";
			moveLog += (totalMoves + 1) + "," + id + ",(" + label + ")," + choiceGrid.lagTimer.time() + ',,';
		} else {
			moveLog += madeChoice + "\n" + (totalMoves + 1) + "," + id + ",(" + label + ")," + choiceGrid.lagTimer.time() + ',,'
		}
		var divs = document.getElementsByTagName('div');
		var targetId = id;
		for (var index = 0; index < divs.length; index++) {
			var theDiv = divs[index];
			var theId = theDiv.id.split(',');
			var row = theId[1];
			if (row == targetId) {
				divs[index].className = "eliminated";
			}
		}
		console.log(moveLog);
	} else {
	choiceGrid.totalTimer.stop();
	if (!hasMovedYet) {
		moveLog += (totalMoves + 1) + "," + id + ",(" + label + ")," + choiceGrid.lagTimer.time() + ',,';
		movelog += "\nTOTALTIME:" + choiceGrid.totalTimer.time();
	} else {
		moveLog += madeChoice + "\n" + (totalMoves + 1) + "," + id + ",(" + label + ")," + choiceGrid.lagTimer.time() + ',,'
		moveLog += "\nTOTALTIME:" + choiceGrid.totalTimer.time();
	}
	moveLog += " STOPTIME:" + new Date().toUTCString() + "\n";

	moveSummary += "Total," + (totalMoves + 1) + ",1.00\n";
	var altMoveProportion = altMoves/totalMoves;
	var attMoveProportion = attMoves/totalMoves;
	var neitherMoves = diagMoves;
	var neitherMoveProportion = neitherMoves/totalMoves;
	var noneMoveProportion = noneMoves/totalMoves;
	var averageTime = viewTime/totalMoves;
	moveSummary += movedAlternativeWiseText + "," + altMoves + "," + altMoveProportion.toFixed(2) + "\n";
	moveSummary += movedAttributeWiseText + "," + attMoves + "," + attMoveProportion.toFixed(2)  + "\n";

	moveSummary += movedDiagonallyText + "," + neitherMoves + "," + neitherMoveProportion.toFixed(2)  + "\n";
	moveSummary += movedNoneText + "," + noneMoves + "," + noneMoveProportion.toFixed(2)  + "\n";
	moveSummary += "Total viewings: " + totalMoves + "\n";
	moveSummary += "Average viewing time: " + averageTime + " milliseconds\n";

	document.getElementById('movelog').value = moveSummary + moveLog;
	document.getElementById("gridForm").submit();
	}

}



function mouseOverGrid(row,column) {
	var id = "cell:" + row + "," + column;
	var cell = document.getElementById(id);
	choiceGrid.activationDelay.start(function () {
		choiceGrid.lagTimer.stop();
		cellActive = true;
		cell.className = "showcontent";
		var type = moveType(lastCoords[1], lastCoords[0], row, column);
		switch (type) {
			case movedAlternativeWise:
				altMoves++;
				break;
			case movedAttributeWise:
				attMoves++;
				break;
			case movedDiagonally:
				diagMoves++;
				break;
			case movedNone:
				noneMoves++;
				break;
			default:
				break;
		}
		//moveLog += "MOVE:" + totalMoves + " DIR:" + type + " ALT:" + row + " ATT:" + column + " LAGTIME:" + choiceGrid.lagTimer.time();
		//moveLog += "Index,Row,Column,Lag Time,Display Time,Movement\n";
		if (!hasMovedYet) {
			moveLog += (totalMoves + 1) + ',' + row + "," + column + "," + choiceGrid.lagTimer.time() + ',';
		} else {
			moveLog += type + '\n' + (totalMoves + 1) + ',' + row + "," + column + "," + choiceGrid.lagTimer.time() + ',';
		}
		if (hasMovedYet) {
			totalMoves++;
			if (type == initial) {
				noneMoves++;
			}
		}
		hasMovedYet = true;
		lastCoords = [column,row];
		choiceGrid.choiceTimer.start();
	});
	console.log(moveLog);
}

function mouseOutGrid(row,column) {
	choiceGrid.choiceTimer.stop();
	var time = choiceGrid.choiceTimer.time();
	if (cellActive) {
		//moveLog += "Index,Row,Column,Lag Time,Display Time,Movement\n";
		moveLog += time + ',';
		viewTime += time;
		cellActive = false;
	}
	choiceGrid.lagTimer.start();
	choiceGrid.activationDelay.cancel();
	var id = "cell:" + row + "," + column;
	var cell = document.getElementById(id);
	cell.className = "gridcontent";
	console.log(moveLog);
}

window.onload = doinit;
