const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs');
const docx = require("docx");
//global answers
let answersMap = new Map();
try {
    let answersData = fs.readFileSync('./data/answers.json')
    console.log('Raw data: ' + answersData);
    if (answersData == '') answersData = '{}';
    let ansersObj = JSON.parse(answersData);
    answersMap = new Map(Object.entries(ansersObj));
    console.log('Answers loaded');
} catch (err) {
    if (err.errno == -4058) {
        try {
            const data = fs.writeFileSync('data/answers.json', JSON.stringify({}))
            console.log('New file created');
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    } else {
        console.error(err);
        process.exit(1);
    }
}
//user contributions
let userContributionsMap = new Map();
try {
    let contributionsData = fs.readFileSync('./data/contribution.json')
    console.log('Raw data contributions: ' + contributionsData);
    if (contributionsData == '') contributionsData = '{}';
    let contributionsObj = JSON.parse(contributionsData);
    userContributionsMap = new Map(Object.entries(contributionsObj));
    console.log('Contributions loaded');
} catch (err) {
    if (err.errno == -4058) {
        try {
            const data = fs.writeFileSync('data/contribution.json', JSON.stringify({}))
            console.log('New file created');
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    } else {
        console.error(err);
        process.exit(1);
    }
}
//increment contribution
function incrementContrubution(login) {
    let contributionValue = userContributionsMap.get(login);
    if (contributionValue === undefined) {
        userContributionsMap.set(login, 1);
    } else {
        userContributionsMap.set(login, userContributionsMap.get(login) + 1);
    }
    //write to file
    let contrObj = Object.fromEntries(userContributionsMap)
    try {
        const data = fs.writeFileSync('data/contribution.json', JSON.stringify(contrObj))
        console.log('Contributions updated');
    } catch (err) {
        console.error(err)
    }
}
//log all data
function logData(login, question, answer) {
    let content = `Login: ${login};\nQustion:\n"${question}";\nAnswer:\n"${answer}";\nDate: ${new Date()}\n###\n`
    fs.appendFile('.log/dataLog.log', content, (err) => {
        if (err) {
            console.error(err);
            return
        }
    })
}
//update answer data
function updateAnswersFile(answMap) {
    let answObj = Object.fromEntries(answMap)
    try {
        const data = fs.writeFileSync('data/answers.json', JSON.stringify(answObj))
        console.log('Answers updated');
    } catch (err) {
        console.error(err)
    }
}
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
    //setHeadrsForCORS(response);
    next();
});
//stataic site
const dirForApp = __dirname.slice(0, -3);
//exclude scripts
app.use((req, res, next) => {
    //console.log(req.url);
    var result = req.url.match(/^\/(src|data|\.log)\/.+(.*)$/)
    if (result) {
        return res.status(403).end('403 Forbidden')
    }
    next();
})
app.use(express.static(dirForApp + "/public"));
app.get("/", function (request, response) {
    console.log('Method: GET, /');
    response.status(200);
    response.set('Content-Type', 'text/html;charset=utf-8');
    response.sendFile(dirForApp + "public/index.html");
});
app.post("/add", function (request, response) {
    console.log('Method: POST, /add');
    let login = request.body.login;
    let question = request.body.question;
    let answer = request.body.answer;
    let result = null;
    if (login !== undefined && question !== undefined && answer !== undefined) {
        //log all approved  request
        logData(login, question, answer);
        //question  delete lead and ending whitespaces
        let trimmedQuestion = question.trim();
        //.localeCompare()    
        //check allready added
        if (!answersMap.has(trimmedQuestion)) {
            //add to map 
            answersMap.set(trimmedQuestion, answer);
            console.log('New question added!');
            incrementContrubution(login);
            updateAnswersFile(answersMap);
            result = "added";
        } else {
            console.log('Already added question!');
            result = "no_added";
        }
        //map to obj, obj to json, json to file  
        response.status(200);
        response.set('Content-Type', 'application/json;charset=utf-8');
        response.send(result);
    } else {
        response.status(400);
        response.set('Content-Type', 'application/json;charset=utf-8');
        response.send('bad');
    }
});
app.get("/download", function (request, response) {
    console.log('Method: GET, /download');
    const file = dirForApp + 'data/answers.json';
    response.download(file, 'answers.txt');
});
app.get("/contributors", function (request, response) {
    console.log('Method: GET, /contributors');
    let contributorsJson = null;
    try {
        let contributorsObj = Object.fromEntries(userContributionsMap)
        contributorsJson = JSON.stringify(contributorsObj);
    } catch (err) {
        console.error(err);
        response.sendStatus(500);
    }
    response.status(200);
    response.set('Content-Type', 'application/json;charset=utf-8');
    response.send(contributorsJson);
});
async function generateDOCX() {
    let tableRows =[];
    //cell width
    let widthProp = {
        size: 5000,
        type: docx.WidthType.DXA,
    };
    //generate rows
    for (let entry of answersMap) {
        let tableRow = new docx.TableRow({
            children: [
                new docx.TableCell({
                    children: [ new docx.Paragraph({children: [new docx.TextRun({text:entry[0], size: 28})]})],
                    width: widthProp
                }),
                new docx.TableCell({
                    children: [ new docx.Paragraph({children: [new docx.TextRun({text:entry[1], size: 28})]})],
                    width: widthProp
                }),
            ],
        });
        tableRows.push(tableRow);
    }
    //generate table
    const table = new docx.Table({
        rows: tableRows
    });
    //generate doc
    const doc = new docx.Document({
        sections: [{
            properties: {},
            children:
                [
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun("Answers prepared using answer-collector."),
                            new docx.ExternalHyperlink({
                                child: new docx.TextRun({
                                    text: "Github",
                                    style: "Hyperlink",
                                }),
                                link: "https://github.com/N120F2/answer-collector",
                            }),
                        ]
                    }),
                    table
                ],
        }]
    });

    return new Promise((resolve, reject) => {
        //export to file
        docx.Packer.toBuffer(doc).then((buffer) => {
            fs.writeFileSync("data/answers.docx", buffer);
            resolve("File generated");
        })
        .catch(()=>{
            reject("Error while generating file");
        });
    })
}
app.get("/download_docx", function (request, response) {
    console.log('Method: GET, /download_json');
    generateDOCX()
    .then((msg)=>{
        console.log(msg);
        const file = dirForApp + 'data/answers.docx';
        response.download(file, 'answers.docx');     
    })
    .catch((msg)=>{
        console.log(msg);
        response.sendStatus(500);
    });   
});

//start app
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})