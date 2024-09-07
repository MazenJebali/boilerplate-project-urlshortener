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
  original_url: {
    type: String,
    required: true,
    unique: true
  },
  short_url: {
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
    const search = await sample.findOne({ original_url: req.original },"-_id original_url short_url");

    if (!search) {
      req.data = new sample({ original_url: req.original, short_url: req.shorturl });

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
  req.data = await sample.findOne({ short_url: req.params.short_url },"-_id original_url short_url").exec();
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
app.get("/api/shorturl/:short_url", loadShorturl, (req, res) => {
  res.redirect(req.data.original_url);
})

// Your first API endpoint
app.get('/api/hello', function (req, res) {
  res.json({ greeting: 'hello API' });
});
/*********************** */

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
