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
    await page.goto('https://puppeteer-queryselector-eval-example.glitch.me/cars.html');
    const selector = 'select';
    const name = await page.$eval(selector, node => node.name);
    response.send(name);
    await browser.close();
  } catch (error) {
    response.status(503).end(error.message);
  }
});

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});