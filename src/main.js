const express = require("express");
const bodyParser = require("body-parser");
const fs = require('fs');
const docx = require("docx");
const { Client, Pool } = require('pg');

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
//database conect obj
let conectDbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'answersdb',
    password: 'root',
    port: 5432,
};
//database acces methods
function incrementContrubutionOnDB(login) {
    return new Promise(async (resolve, reject) => {
        let result = null;
        const client = new Client(conectDbConfig);
        let queryInsert =
            `INSERT INTO contributors("userName", contribution) VALUES ('` + login + `', 1);`;
        let queryUpdate =
            `UPDATE contributors SET contribution = contribution+1  WHERE "userName" = '` + login + `';`;


        try {
            await client.connect();
            const res = await client.query(queryUpdate);
            if (res.rowCount == 1) {
                resolve('updated');
            } else {
                const res = await client.query(queryInsert);
                resolve('inserted');
            }
        } catch (err) {
            console.log(err.stack);
            reject(error);
        } finally {
            await client.end();
        }

    })

}
function addAnswerToDB(trimmedQuestion, answer, login) {
    return new Promise(async (resolve, reject) => {
        let result = null;
        const client = new Client(conectDbConfig);
        let query =
            `INSERT INTO answers(question, answer)
        SELECT '`+ trimmedQuestion + `', '` + answer + `'
        WHERE NOT EXISTS (SELECT * FROM answers WHERE question  = '` + trimmedQuestion + `');`;

        try {
            await client.connect();
            const res = await client.query(query);
            if (res.rowCount == 1) {
                try {
                    const res = await incrementContrubutionOnDB(login);
                    console.log(res)
                } catch (err) {
                    console.log(err.stack);
                }
                resolve('added');
            } else {
                resolve('no_added');
            }
        } catch (err) {
            console.log(err.stack);
            reject(error);
        } finally {
            await client.end();
        }


    })


}
function getAnswers() {
    return new Promise(async (resolve, reject) => {
        let result = null;
        const client = new Client(conectDbConfig);
        let query =
            `SELECT * FROM answers;`;
        try {
            await client.connect();
            const res = await client.query(query);
            let answersObj = {};
            for (let row of res.rows) {
                answersObj[row.question] = row.answer;
            }
            resolve(answersObj)
        } catch (err) {
            console.log(err.stack);
            reject(error);
        } finally {
            await client.end();
        }
    })
}
function getContributors() {
    return new Promise(async (resolve, reject) => {
        let result = null;
        const client = new Client(conectDbConfig);
        let query =
            `SELECT * FROM contributors;`;
        try {
            await client.connect();
            const res = await client.query(query);
            let contributorsObj = {};
            for (let row of res.rows) {
                contributorsObj[row.userName] = row.contribution;
            }          
            resolve(contributorsObj)
        } catch (err) {
            console.log(err.stack);
            reject(error);
        } finally {
            await client.end();
        }
    })


}
//server generation
const port = 8080;
const app = express();
// body parser
app.use(bodyParser.json({ extended: false }));
//stataic site
const dirForApp = __dirname.slice(0, -3);
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
        addAnswerToDB(trimmedQuestion, answer, login)
            .then((result) => {
                console.log(result);
                response.status(200);
                response.set('Content-Type', 'application/json;charset=utf-8');
                response.send(result);
            })
            .catch((result) => {
                console.log(result);
                response.status(500);
                response.set('Content-Type', 'application/json;charset=utf-8');
                response.send(result);
            });
    } else {
        response.status(400);
        response.set('Content-Type', 'application/json;charset=utf-8');
        response.send('bad');
    }
});

app.get("/contributors", function (request, response) {
    console.log('Method: GET, /contributors');
    getContributors().then((contributorsObj) => {
        contributorsJson = JSON.stringify(contributorsObj);
        response.status(200);
        response.set('Content-Type', 'application/json;charset=utf-8');
        response.send(contributorsJson);
    })
    .catch(()=>{
        response.sendStatus(500);
    });
});
async function generateDOCX(answersObj) {
    let tableRows = [];
    //cell width
    let widthProp = {
        size: 5000,
        type: docx.WidthType.DXA,
    };
    //generate rows
    for (let key in answersObj) {
        let tableRow = new docx.TableRow({
            children: [
                new docx.TableCell({
                    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: key, size: 28 })] })],
                    width: widthProp
                }),
                new docx.TableCell({
                    children: [new docx.Paragraph({ children: [new docx.TextRun({ text: answersObj[key], size: 28 })] })],
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
            .catch(() => {
                reject("Error while generating file");
            });
    })
}
app.get("/download", function (request, response) {
    console.log('Method: GET, /download');
    /*const file = dirForApp + 'data/answers.json';
    response.download(file, 'answers.txt');*/
    getAnswers().then((result) => {
        try {
            const data = fs.writeFileSync('data/answers.json', JSON.stringify(result))
            console.log('File created');
            const file = dirForApp + 'data/answers.json';
            response.download(file, 'answers.txt');
        } catch (err) {
            console.error(err);
            response.sendStatus(500);
        }
    }).catch(() => {
        response.sendStatus(500);
    });

});
app.get("/download_docx", function (request, response) {
    console.log('Method: GET, /download_json');
    getAnswers()
        .then((result) => {
            generateDOCX(result)
                .then((msg) => {
                    console.log(msg);
                    const file = dirForApp + 'data/answers.docx';
                    response.download(file, 'answers.docx');
                })
                .catch((msg) => {
                    console.log(msg);
                    response.sendStatus(500);
                });

        }).catch(() => {
            response.sendStatus(500);
        });

});
//start app
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`)
})