var express = require('express');
var router = express.Router();
var request = require('request-promise')
var queryString = require('querystring')

/* GET home page. */
router.get('/', async function(req, res, next) {
//    res.sendFile(process.cwd()+'/views/supreme.html');
        res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <script src="ticket/${req.query.version}"></script>
    <meta charset="UTF-8">
    <title>Title</title>
</head>
<body>

</body>
</html>`)
});

module.exports = router;
