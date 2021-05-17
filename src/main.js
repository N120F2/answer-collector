const express = require("express");
const bodyParser = require("body-parser");

//server generation
const port = 8080;
const app = express();
//for debug
function setHeadrsForCORS(response) {
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, OPTIONS, POST')
    response.set("Access-Control-Allow-Headers", "X-Requested-With")
    response.set("Access-Control-Allow-Headers", "Content-Type")
}
// body parser
app.use(bodyParser.json({ extended: false }));
//temp cors for debug
app.use(function (request, response, next) {
    setHeadrsForCORS(response);
    next();
});
//stataic site
const dirForApp = __dirname.slice(0, -3);
app.use(express.static(dirForApp));
app.get("/", function (request, response) {
    console.log('Method: GET, /');
    response.status(200);
    response.set('Content-Type', 'text/html;charset=utf-8');
    response.sendFile(dirForApp + "/index.html");
});

//start app
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})