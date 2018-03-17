const express = require('express'),
    app = express(),
    puppeteer = require('puppeteer'),
    MDN_URL = 'https://developer.mozilla.org/docs/Web/API/';

let browser = undefined;

const deprecatedBrowsers = [
  "IE Phone",
  "IE Mobile",
  "Firefox OS"
];

const browserIds = {
  "android": {
    "aliases": [
      "Android",
      "Android Webview"
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
      
    ]
  },
  "firefox": {
    "aliases": [
      "Firefox (Gecko)"
    ]
  },
  "firefox_android": {
    "aliases": [
      "Firefox Mobile (Gecko)"
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
      "Opera Mobile"
    ]
  },
  "safari": {
    "aliases": [
      "Safari (WebKit)"
    ]
  },
  "safari_ios": {
    "aliases": [
      "Safari Mobile"
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
  if (value === '(Yes)') return true;
  if (value === 'No support') return false;
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

async function appendPropertyData(props, data, interface) {
  for (let i = 0; i < props.length; i++) {
    const prop = props[i];
    let name = await prop.$('a code');
    if (!name) name = await prop.$('code');
    if (!name) throw Error('appendPropertyData() found no properties, is this right?');
    const content = await name.getProperty('textContent');
    const value = await content.jsonValue();
    const sanitized = value.replace(`${interface}.`, '').replace('()', '');
    const url = `https://developer.mozilla.org/docs/Web/API/${interface}/${sanitized}`;
    data.javascript.builtins[sanitized] = {
      "__compat": {
        "mdn_url": url,
        "support": "TODO"
      }
    };
  }
}

async function getPage(url) {
  console.log(`getting data for ${url}`);
  const page = await browser.newPage();
  await page.goto(url);
  return page;
}

async function getSupportData(page) {
  // debug data
  const node = await page.$('title')
  const prop = await node.getProperty('textContent');
  const title = await prop.jsonValue();
  const desktopRows = await page.$$('#compat-desktop tr');
  if (!desktopRows) throw Error(`${title}: desktopRows undefined`);
  const mobileRows = await page.$$('#compat-mobile tr');
  if (!mobileRows) throw Error(`${title}: mobileRows undefined`);
  const desktopBrowsers = await createSupportData(desktopRows[0], desktopRows[1]);
  const mobileBrowsers = await createSupportData(mobileRows[0], mobileRows[1]);
  return Object.assign(desktopBrowsers, mobileBrowsers);
}

app.use(express.static('static'));

app.get('/favicon.ico', (request, response) => {
  response.status(404);
})

app.get("/crawl/:interface/:prop", async (request, response) => {
  try {
    browser = await puppeteer.launch({
      args: ['--no-sandbox']
    });
    const interface = request.params.interface,
        prop = request.params.prop;
    const url = `${MDN_URL}${interface}${prop ? '/' + prop : ''}`;
    console.log(url);
    const page =
        await getPage(url);
    const supportData = await getSupportData(page);
    const schema = makeSchema(supportData, request.params.interface);
    const props = await page.$$('dt');
    if (props.length > 0) await appendPropertyData(props, schema, request.params.interface);
    await browser.close();
    response.type('application/json').json(schema);
  } catch (error) {
    await browser.close();
    response.status(503).end(error.message);
  }
});

var listener = app.listen(5000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});


