const express = require('express'),
    app = express(),
    puppeteer = require('puppeteer');

app.use(express.static('public'));

app.get("/", async (request, response) => {
  try {
    const browser = await puppeteer.launch({
      args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://sleet-dagger.glitch.me/cars.html');
    await page.waitForSelector('select');
    response.send(document.querySelector('select'));
  } catch (error) {
    response.status(503).end(error.message);
  }
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});