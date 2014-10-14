var express = require('express');
var config = require('config');
var router = express.Router();

var homePageTitle = config.get('Experiment.experimentName');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: homePageTitle });
});

router.get(config.get(Application.Routes.adminRoute), function(req, res) {

});

router.post(config.get(Application.Routes.adminRoute), function(req, res) {

});

router.get('/:id', function(req, res) {

});

router.post('/:id', function(req, res) {

});

module.exports = router;
