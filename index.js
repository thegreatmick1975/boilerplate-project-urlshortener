require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
let mongoose = require('mongoose');
let bodyParser = require('body-parser');
const dns = require('node:dns');

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Basic Configuration
const port = process.env.PORT || 3000;

const URLSchema = new mongoose.Schema({
  original_url: { type: String, required: true, unique: true },
  short_url: { type: String, required: true, unique: true },
});

let URLModel = mongoose.model('url', URLSchema);

// Middleware function to parse post requests
app.use('/', bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/shorturl/:short_url', function (req, res) {
  let short_url = req.params.short_url;
  // Find the original url from the database
  URLModel.findOne({ short_url: short_url }).then((foundURL) => {
    console.log(foundURL);
    if (foundURL) {
      let original_url = foundURL.original_url;
      res.redirect(original_url);
    } else {
      res.json({ message: 'The short url does not exist!' });
    }
  });
});

// Your first API endpoint
app.post('/api/shorturl', function (req, res) {
  let url = req.body.url;

  // Validate URL
  try {
    urlObj = new URL(url);
    console.log(urlObj);
    dns.lookup(urlObj.hostname, (err, address, family) => {
      // If the DNS domain does not exist no address returned
      if (!address) {
        res.json({ error: 'invalid url' });
      }

      // We have a valid URL!!
      else {
        let original_url = urlObj.href;
        let short_url = 1;
        // Get the latest short url
        URLModel.find({})
          .sort({ short_url: 'desc' })
          .limit(1)
          .then((latestURL) => {
            if (latestURL.length > 0) {
              // Increment the latest url by adding  1
              short_url = parseInt(latestURL[0].short_url) + 1;
            }
            resObj = {
              original_url: original_url,
              short_url: short_url,
            };
            // Create an entry in the database
            let newURL = new URLModel(resObj);
            newURL.save();
            res.json(resObj);
          });
      }
    });
  }
  // If the url has an invalid format
  catch {
    res.json({ error: 'invalid url' });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
