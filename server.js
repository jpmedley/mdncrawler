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
    "aliases": [
      
    ]
  },
  "firefox": {
    "aliases": [
      "Firefox (Gecko)"
    ]
  },
  "firefox_android": {
    "aliases": [
      
    ]
  },
  "ie": {
    "aliases": [
      "Internet Explorer"
    ]
  },
  "opera": {
    "aliases": [
      "Opera"
    ]
  },
  "safari": {
    "aliases": [
      "Safari (WebKit)"
    ]
  }
};

function getId(name) {
  for (let id in browserIds) {
    
    if (browserIds[id].aliases.includes(name)) {
      return id;
    }
  }
  return undefined;
}

async function getBrowsers(row) {
  const browsers = [];
  const cells = await row.$$('th');
  if (cells.length === 0) throw Error('The row that was passed to getBrowsers() has no <th> elements.');
  for (let i = 0; i < cells.length; i++) {
    const content = await cells[i].getProperty('textContent');
    const value = await content.jsonValue();
    if (value === 'Feature') continue;
    const id = getId(value);
    if (!id) throw Error(`Browser name ${value} is not defined in browserIds.`);
    browsers.push(id);
  }
  return browsers;
}

app.use(express.static('static'));

app.get("/:interface", async (request, response) => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.goto(`https://developer.mozilla.org/en-US/docs/Web/API/${request.params.interface}`);
    const rows = await page.$$('#compat-desktop tr');
    const browsers = await getBrowsers(rows[0]);
    const string = browsers.concat(' ');
    response.send(string);
    await browser.close();
  } catch (error) {
    response.status(503).end(error.message);
    await browser.close();
  }
});

//var listener = app.listen(process.env.PORT, function () {
var listener = app.listen(5000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});