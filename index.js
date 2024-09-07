require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { type, redirect } = require('express/lib/response');
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
  try {
    const urlname = new URL(req.original).hostname;

    dns.lookup(urlname, (error, address, family) => {
      if (error) {
        req.shorturl = 0;
        console.error(error.message);
        next();
      }
      else {
        const code = new Date().getTime();
        req.shorturl = code;
        console.log(`link verified,\n IP : ${address}\nVersion : ${family}`);
        next();
      }
    });
  }
  catch (error) {
    req.shorturl = 0;
    console.log(error);
    next();
  }
}

const saveShorturl = async (req, res, next) => {
  if (req.shorturl) {
    const search = await sample.findOne({ originalUrl: req.original });
    
    if (!search) {
      req.data = new sample({ originalUrl: req.original, shortUrl: req.shorturl });

      req.data.save().then((r) => {
        console.log("link saved!");
      }).catch((err) => {
        console.log(err);
      });
    }
    else {
      req.data = search;
    }
  };
  next();
}

const loadShorturl = async (req, res, next) => {
  req.data = await sample.findOne({ shortUrl: req.params.urlcode }).exec();
  next();
}

/****************** */

// API endpoints
app.post("/api/shorturl", parser.urlencoded({ extended: true }),
  generateShorturl, saveShorturl, (req, res) => {
    if (!req.shorturl) {
      res.json({ error: 'invalid url' });
    }
    else {
      res.json(req.data);
    }
  });
app.get("/api/shorturl/:urlcode", loadShorturl, (req, res) => {
  res.redirect(req.data.originalUrl);
})

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});
/*********************** */

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
