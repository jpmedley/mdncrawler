const express = require('express'),
    app = express(),
    puppeteer = require('puppeteer');

const browserIds = {
  "android": {

  },
  "chrome": {
    "aliases": [
      "Chrome"
    ]
  },
  "edge": {
    "aliases": [
      "Edge"
    ]
  },
  "edge_mobile": {

  },
  "firefox": {
    "aliases": [
      
    ]
  },
  "firefox_android": {

  },
  "ie": {
    "aliases": [
      
    ]
  },
  "opera": {
    "aliases": [
      
    ]
  },
  "safari": {
    "aliases": [
      
    ]
  }
}

function addBrowser(name, browsers) {
  for (let browser in browsers) {
    if (browser.aliases.includes(name)) {
      return true;
    } else {
      return false;
    }
  }
}

function contains(name, browsers) {
  for (let browser in browsers) {
    if (browser.aliases.includes(name)) {
      return true;
    } else {
      return false;
    }
  }
}

async function getBrowsers(row, browsers) {
  if (!browsers) {
    let browsers = {};
  }
  const cells = await row.$$('th');
  if (cells.length === 0) throw Error('The row that was passed to getBrowsers() has no <th> elements.');
  for (let i = 1; i < cells.length; i++) {
    const content = await cells[i].getProperty('textContent');
    const value = await content.jsonValue();
    console.log(value);
    //browsers.push(value);
  }
  return browsers;
}

app.use(express.static('static'));

app.get("/:interface", async (request, response) => {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(`https://developer.mozilla.org/en-US/docs/Web/API/${request.params.interface}`);
    const rows = await page.$$('#compat-desktop tr');
    const browsers = await getBrowsers(rows[0]);
    const string = browsers.concat(' ');
    response.send(string);
    await browser.close();
  } catch (error) {
    response.status(503).end(error.message);
  }
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});