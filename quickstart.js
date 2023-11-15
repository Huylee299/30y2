const express = require("express");
const axios = require("axios");
const { google, GoogleApis } = require("googleapis");
const { OAuth2Client } = require('google-auth-library');
const { Readable } =  require('stream')
const bodyParser = require('body-parser');
const cors = require('cors')
const app = express();
const fs = require('fs');

const multer = require('multer');
// const upload = multer();
const port = 1234;
// const apiKey = "AIzaSyBuVvM-04zVmPv1pqk0I45wwgt1EajeMgg";
const apiUrl = "https://www.googleapis.com/youtube/v3";


const CLIENT_ID = "963915397031-ia2dkbnc9aekrqq184d8r6rmv5l2usa2.apps.googleusercontent.com";
const CLIENT_SECRET = "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";
const REDIRECT_URI = "http://localhost:1234/google/callback";
const TOKEN_PATH = 'token.json';

const oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const storage = multer.diskStorage({
    destination: (req, file, cbf) => {
        cbf(null, "./audio");
    },
    filename: (req, file, cbf) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cbf(null, file.fieldname + '-' + uniqueSuffix)
    }
})

const upload = multer({
    storage: storage
});


app.use(cors())


// app.use(upload.array()); 


app.use(bodyParser.json())

app.use(bodyParser.urlencoded({ extended: true }));



app.get('/login', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.upload'],
    });
    res.redirect(authUrl);
});

app.get('/google/callback', async (req, res) => {
    const { code } = req.query;
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Save tokens to a file for subsequent use
  await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(tokens));

  res.send('Authentication successful! You can now use the token for subsequent requests.');
})

// const youtube = google.youtube({
//     version: "v3",
//     auth: apiKey,
// });

app.get("/", (req, res) => {

    res.send("Hello World!");
});

app.get("/test-search", (req, res) => {
    res.send(req.query)
})

app.post("/test", upload.fields([{ name: 'fileInput', maxCount: 1 }, { name: 'thumb' , maxCount: 1 }]), async (req, res) => {
    // Read tokens from the file
    const tokenFile = await fs.promises.readFile(TOKEN_PATH);
    const tokens = JSON.parse(tokenFile);
    oAuth2Client.setCredentials(tokens);


    // Now you can use oAuth2Client to make authorized requests to the YouTube API
    const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
    await youtube.videos.insert({
        part: "snippet, status",
        resource: {
            snippet: {
                title: "audio",
                // description: "test description"
            },
            status: {
                privacyStatus: "public",
                selfDeclaredMadeForKids: "true"
            },
        },
        media: {
            // body: Readable.from(req.files.fileInput[0])
            body: fs.createReadStream(req.files['fileInput'][0].path)
        }
    }, (err, data) => {
        console.log(err);
        fs.unlinkSync(req.files['fileInput'][0].path)
        res.send("upload success");
    })

})

app.get("/search", async (req, res, next) => {
    try {
        const searchQuery = req.query.search_query;
        const url = `${apiUrl}/search?key=${apiKey}&type=video&part=snippet&q=${searchQuery}`;

        const response = await axios.get(url);
        const titles = response.data.items.map((item) => item.snippet.title);

        res.send(titles);
    } catch (err) {
        next(err);
    }
});

app.get("/search-with-googleapis", async (req, res, next) => {
    try {
        const searchQuery = req.query.a;
        console.log(searchQuery)
        const response = await youtube.search.list({
            part: "snippet",
            q: searchQuery,
        });
        
        const titles = response.data.items.map((item) => item.snippet.title);
        res.send(titles);
    } catch (err) {
        next(err);
    }
});

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});