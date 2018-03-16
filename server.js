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

  },
  "edge_mobile": {

  },
  "firefox": {

  },
  "firefox_android": {

  },
  "ie": {

  },
  "opera": {

  },
  "safari": {

  }
}

async function getBrowsers(row, browsers) {
  if (!browsers) browsers = {};
  const cells = await row.$$('th');
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