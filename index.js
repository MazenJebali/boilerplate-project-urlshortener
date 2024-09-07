require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { type } = require('express/lib/response');
const app = express(),
  DB = require('mongoose'),
  parser = require('body-parser'),
  dns = require('dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

DB.connect(process.env.URL);

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});
// create entity
const sample = DB.model("shortenedUrl", new DB.Schema({
  originalUrl: {
    type: String,
    required: true,
    unique: true
  },
  shortUrl: {
    type: String,
    required: true,
    unique: true
  }
}))

// middlewares
const generateShorturl = async (req, res, next) => {
  req.original = await req.body.url;
  let fil;
  dns.lookup(req.original, (error, address, family) => {

    // if an error occurs, eg. the hostname is incorrect!
    if (error) {
      req.shorturl = 0;
      console.error(error.message);
    } else {
      // if no error exists
      const code = new Date().getTime();
      req.shorturl = code;
      console.log(
        `The ip address is ${address} and the ip version is ${family}`
      );
    }
  });

  console.log(req.shorturl);
  next();
}

const saveShorturl = async (req, res, next) => {
  if (req.shorturl) {
    const data = new sample({ originalUrl: req.original, shortUrl: req.shorturl });

    data.save().then((r) => {
      console.log("link saved!");
    }).catch((err) => {
      console.log(err);
    });
  }
  else {
    console.log("noon valid URL");
  }
  next();
}

/****************** */

app.route("/api/shorturl").post(parser.urlencoded({ extended: true }),
  generateShorturl, saveShorturl, (req, res) => {
    res.json(req.response);
  })
  .get((req, res) => {
    res.send(req.shorturl);
  })

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
