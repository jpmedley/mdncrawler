const express = require('express'),
    app = express(),
    puppeteer = require('puppeteer');

async function getBrowsers(row) {
  const browsers = [];
  const cells = await row.$$('td');
  for (let i = 1; i < cells.length; i++) {
    const content = await cells[i].getProperty('textContent');
    const value = await content.jsonValue();
    browsers.push(value);
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