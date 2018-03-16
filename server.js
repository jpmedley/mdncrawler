const express = require('express'),
    app = express(),
    puppeteer = require('puppeteer');

app.use(express.static('static'));

app.get("/:interface", async (request, response) => {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.goto(`https://developer.mozilla.org/en-US/docs/Web/API/${request.params.interface}`);
    const headers = await page.$$('#compat-desktop th');
    const browsers = [];
    for (let i = 0; i < headers.length; i++) {
      const header = await headers[i].getProperty('textContent')
      const name = header.toString();
      browsers.push(name);
    }
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