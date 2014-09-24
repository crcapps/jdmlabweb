var express = require('express');
var config = require('config');
var router = express.Router();

var homePageTitle = config.get('Experiment.experimentName');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: homePageTitle });
});

module.exports = router;
