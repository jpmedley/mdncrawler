const express = require('express'),
    app = express(),
    puppeteer = require('puppeteer');

const browserIds = {
  "android": {
    "aliases": [
      
    ]
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
    "aliases": [
      
    ]
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


function getId(name) {
  for (let id in browserIds) {
    if (browserIds.id.aliases.includes(name)) {
      return id;
    } else {
      return undefined;
    }
  }
}

async function getBrowsers(row) {
  const browsers = [];
  const cells = await row.$$('th');
  if (cells.length === 0) throw Error('The row that was passed to getBrowsers() has no <th> elements.');
  for (let i = 1; i < cells.length; i++) {
    const content = await cells[i].getProperty('textContent');
    const value = await content.jsonValue();
    const id = getId(value);
    if (!id) throw Error('There is a browser name on the page that is not aliased in browserIds.');
    browsers.push(id);
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