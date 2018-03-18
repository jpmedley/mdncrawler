const express = require('express'),
    app = express(),
    puppeteer = require('puppeteer'),
    MDN_URL = 'https://developer.mozilla.org/docs/Web/API/';

let browser = undefined;

const deprecatedBrowsers = [
  "IE Phone",
  "IE Mobile",
  "Firefox OS",
  "Firefox OS (Gecko)",
  "Mozilla Servo"
];

const browserIds = {
  "android": {
    "aliases": [
      "Android",
      "Android Webview",
      "Android webview"
    ]
  },
  "chrome": {
    "aliases": [
      "Chrome"
    ]
  },
  "chrome_android": {
    "aliases": [
      "Chrome for Android"
    ]
  },
  "edge": {
    "aliases": [
      "Edge",
      "Microsoft Edge"
    ]
  },
  "edge_mobile": {
    "aliases": [
      "Edge mobile"      
    ]
  },
  "firefox": {
    "aliases": [
      "Firefox (Gecko)",
      "Firefox"
    ]
  },
  "firefox_android": {
    "aliases": [
      "Firefox Mobile (Gecko)",
      "Firefox for Android"
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
  "opera_android": {
    "aliases": [
      "Opera Mobile",
      "Opera Android"
    ]
  },
  "safari": {
    "aliases": [
      "Safari (WebKit)",
      "Safari"
    ]
  },
  "safari_ios": {
    "aliases": [
      "Safari Mobile",
      "iOS Safari"
    ]
  },
  "samsung": {
    "aliases": [
      "Samsung Internet"
    ]
  }
};

function createSchema(browserList) {
  const schema = {};
  for (let i = 0; i < browserList.length; i++) {
    schema[browserList[i]] = { "tableIndex": i };
  }
  return schema;
}

function getId(name) {
  for (let id in browserIds) {
    if (browserIds[id].aliases.includes(name)) {
      return id;
    }
  }
  return undefined;
}

function convertSupportValue(value) {
  if (value.includes('Yes')) return true;
  if (value.includes('No') && value.includes('support')) return false;
  if (value === '?') return null;
  const number = Number(value);
  // "7.0" => "7"
  if (!isNaN(number)) return number.toString();
  // "7.0 (7.0)" => "7"
  if (/^[0-9]+\.*[0-9]*\s*(.*)$/.test(value)) {
    return Number(value.substring(0, value.indexOf(' '))).toString();
  }
  return value;
}

async function createSupportData(namesRow, supportRow) {
  const browsers = {};
  if (!namesRow || !supportRow) return { "messsage": "no support data" };
  const names = await namesRow.$$('th');
  const support = await supportRow.$$('td');
  if (!names || !support) return { "messsage": "no support data" };
  if (names.length === 0) {
    throw Error('The names row that was passed to createSupportData() has no <th> elements.');
  }
  for (let i = 0; i < names.length; i++) {
    const supportNode = await support[i].getProperty('textContent');
    const supportValue = await supportNode.jsonValue();
    const nameNode = await names[i].getProperty('textContent');
    const name = await nameNode.jsonValue();
    if (supportValue === 'Basic support') continue;
    if (name === 'Feature') continue;
    if (deprecatedBrowsers.includes(name)) continue;
    const id = getId(name);
    if (!id) {
      throw Error(`Browser name ${name} is not defined in browserIds.`);
    }
    browsers[id] = {};
    browsers[id].alias = name;
    browsers[id].key = i;
    browsers[id].support = convertSupportValue(supportValue);
  }
  return browsers;
}

function makeSchema(data, name) {
  const support = {};
  for (let browser in data) {
    support[browser] = {};
    support[browser].version_added = data[browser].support;
  }
  const schema = { "javascript": { "builtins": {} } };
  schema.javascript.builtins[name] = {
    "__compat": {
      "mdn_url": `https://developer.mozilla.org/docs/Web/API/${name}`,
      "support": support
    }
  };
  return schema;
}

function formatUrl(url) {
  const before = 'org/';
  const beforeIndex = url.indexOf(before);
  const after = 'docs';
  const afterIndex = url.indexOf(after);
  if (afterIndex - beforeIndex !== 4) {
    return url.substring(0, beforeIndex + before.length) + url.substring(afterIndex, url.length);
  }
  return url;
}

async function getProperties(page) {
  const props = await page.$$('dt');
  const model = {};
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    const a = await prop.$('a');
    if (a) {
      const hrefRaw = await a.getProperty('href');
      const hrefVal = await hrefRaw.jsonValue();
      const name = hrefVal.substring(hrefVal.lastIndexOf('/') + 1, hrefVal.length);
      model[name] = model[name] || {};
      model[name].url = formatUrl(hrefVal);
    } else {
      const htmlRaw = await prop.getProperty('innerHTML');
      const htmlVal = await htmlRaw.jsonValue();
      const code = await prop.$('code');
      if (!code) continue;
      const raw = await code.getProperty('textContent');
      const val = await raw.jsonValue();
      const name = val.substring(val.lastIndexOf('.') + 1, val.length);
      model[name] = model[name] || {};
    }
  }
  return model;
}

async function getSupport(page) {
  async function map(names, values) {
    const browsers = {};
    if (!names || !values) return browsers;
    const nameCells = await names.$$('th');
    const supportCells = await values.$$('td');
    for (let i = 1; i < nameCells.length; i++) {
      const supportNode = await supportCells[i].getProperty('textContent');
      const supportValue = await supportNode.jsonValue();
      const nameNode = await nameCells[i].getProperty('textContent');
      const nameValue = await nameNode.jsonValue();
      if (deprecatedBrowsers.includes(nameValue)) continue;
      const id = getId(nameValue);
      if (!id) {
        throw Error(`Browser name ${nameValue} is not defined in browserIds.`);
      }
      browsers[id] = {};
      browsers[id].version_added = convertSupportValue(supportValue);
    }
    return browsers;
  }
  const desktopRows = await page.$$('#compat-desktop tr');
  const mobileRows = await page.$$('#compat-mobile tr');
  if (!desktopRows || !mobileRows) return { "message": "no support data" };
  const desktopBrowsers = map(desktopRows[0], desktopRows[1]);
  const mobileBrowsers = map(mobileRows[0], mobileRows[1]);
  return Object.assign(desktopBrowsers, mobileBrowsers);
}

app.use(express.static('static'));

app.get('/favicon.ico', (request, response) => {
  response.status(404);
})


async function status(page) {
  const experimental = await page.$('.notice.experimental');
  const nonStandard = await page.$('.nonStandard');
  const deprecated = await page.$('.deprecated');
  return {
    experimental: (experimental ? true : false),
    standard_track: (nonStandard ? false : true),
    deprecated: (deprecated ? true : false)
  }
}


// 1. go to page
// 2. get basic support for that item
// 3. list out that page's sub-items
// 4. go to each sub-item page
// 5. repeat 2 to 4

async function crawl(url, name, model) {
  model[name] = model[name] || { "url": url };
  const page = await browser.newPage();
  const response = await page.goto(url, { timeout: 60000 });
  if (!response) throw new Error("OMG");
  model[name].browsers = await getSupport(page);
  model[name].properties = await getProperties(page);
  model[name].status = await status(page);
  for (var property in model[name].properties) {
    const propertyUrl = model[name].properties[property].url;
    if (propertyUrl) await crawl(propertyUrl, property, model[name].properties);
  }
  return model;
}

function isEmpty(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

function isName(obj) {
  const props = [ 'status', 'properties', 'browsers' ];
  for (let i = 0; i < props.length; i++) {
    if (!obj.hasOwnProperty(props[i])) return false;
  }
  return true;
}

function format(model) {
  const m = { __compat: {} };
  if (model.url) m.__compat.mdn_url = model.url;
  if (model.browsers) m.__compat.support = model.browsers;
  if (model.status) m.__compat.status = model.status;
  if (model.properties && !isEmpty(model.properties)) {
    for (let prop in model.properties) {
      const propModel = model.properties[prop];
      m[prop] = format(propModel);
    }
  }
  return m;
}

app.set('json spaces', 2);

// go to page
// get its support data, get its features
// go to feature page
// get its support data, get its features
app.get("/crawl/*", async (request, response) => {
  try {
    const fragment = request.originalUrl.replace('/crawl/', '');
    const name = fragment.substring(fragment.lastIndexOf('/') + 1, fragment.length);
    const url = `${MDN_URL}${fragment}`;
    browser = await puppeteer.launch({
      args: ['--no-sandbox']
    });
    const model = {};
    await crawl(url, name, model);
    const m = {
      javascript: {
        builtins: {}
      }
    };
    m.javascript.builtins[name] = format(model[name]);
    response.type('application/json').json(m);
    await browser.close();
  } catch (error) {
    response.status(503).end(error.message);
    await browser.close();
  }
});

var listener = app.listen(5000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
