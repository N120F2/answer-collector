const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs')
//global answers
let answersMap = new Map();
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
app.post("/add", function (request, response) {
    console.log('Method: POST, /add');
    let login = request.body.login;
    let question = request.body.question;
    let answer = request.body.answer;
    if(login !== undefined && question !== undefined && answer !== undefined ){  
        //question  delete lead and ending whitespaces    
        //check allready added
        if(!answersMap.has(question)){
            //add to map 
            answersMap.set(question, answer);
            answersObj.question
        }else{

        }
        //map to obj, obj to json, json to file                
    }
    response.status(200);
    response.set('Content-Type', 'application/json;charset=utf-8');
    response.send('good');
});
app.get("/download", function (request, response) {
    console.log('Method: GET, /download');
    const file = dirForApp + '/file.ini';
    response.download(file, 'answers.txt');
});

//start app
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})