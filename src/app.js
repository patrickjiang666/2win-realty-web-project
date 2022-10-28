const puppeteer = require('puppeteer');
const { JSDOM } = require( "jsdom" );
const { window } = new JSDOM( "" );

const moment = require('moment');
const precisePlugin = require('moment-precise-range-plugin');

const $ = require( "jquery" )( window );
var fs = require("fs");
const NJMLS_BROKERAGES_URL = 'https://www.njmls.com/members/';
const NJMLS_LOGIN_URL = "https://njmls.xmlsweb.com/Login_back.asp";
const NJMLS_AGENT_DIR_URL = "https://njmls.xmlsweb.com/directory_page.asp?oconly=Y&officecode="
const prompt = require('prompt-sync')();

console.log("############################# App Running - ©2Win Realty - 2022 #############################\n");

(async () => {
    const userid = await prompt('NJMLS User Name: ');
    const pw = await prompt('Password: ', {echo: '*'});
    
    const startTime = process.hrtime();

    const browser = await puppeteer.launch({
        headless: true
    });
    const page = await browser.newPage();
    // await page.setDefaultNavigationTimeout(0);
    await page.setRequestInterception(true);
    page.on('request', request => {
        // if ([
        //     //'stylesheet', 
        //     'image', 
        //     'media', 
        //     'font',
        // ].indexOf( request.resourceType() ) !== -1 ) {
        //     console.log('request abort');
        //     request.abort();
        // } else {
            request.continue();
        // }
    });

    const officeListId = '#officeid';
    const writeStream = fs.createWriteStream('./realtor-list.csv');

    let officeListData = [], realtorCounter = 0;

    //Step 1: Get NJ Brokerage List
    officeListData = await fetchOfficeList(page, officeListId);

    //Step 2: Login to newjerseymls and return the signed in page
    let signedInPage = await authentication({userid, pw, page})

    //Step 3: Traverse the brokerage list, and scrape individual agent contacts
    officeListData = await fetchDetailByOfficeId({
        officeListData,
        brokerageLimit: 10,
        page,
        writeStream,
        realtorCounter
    });

    writeStream.end()

    writeStream.on('finish', () => {
        console.log('############################# Task Finished #############################\n\n############################# File is saved under same folder -- ./realtor-list.csv #############################')
    }).on('error', (err) => {
        console.log(err)
    })

    await browser.close();

    const totalTime = process.hrtime(startTime);
    const totalTimeInSeconds = (totalTime[0] * 1000000000 + totalTime[1]) / 1e6;
    const duration = moment(totalTime[0] * 1000).preciseDiff( moment(totalTimeInSeconds))
    console.log(`\n############################# The whole process took ${totalTimeInSeconds/1000} seconds. #############################\n\n\n`);
})();

class Realtor {
    constructor(name, title, cell, brokerage){
        this.name = name;
        this.title = title;
        this.cell = cell;
        this.brokerage = brokerage;
    }
}

async function fetchOfficeList(page, officeListId) {
    console.log(`\n############################# Start Fetching Entire NJ Brokerage List #############################\n`);
    await page.goto(NJMLS_BROKERAGES_URL);
    const officeListHandle = await page.$(officeListId);
    const officeList = await page.evaluate(officeList => officeList.outerHTML, officeListHandle);
    const selectHTMLNode = $(officeList);
    let data = []

    selectHTMLNode.find('option').map((idx, ele) => {
        idx > 0 && data.push([
            ele.attributes[0].value,
            ele.innerHTML,
        ])
    })
    
    // console.log(data);
    console.log(`------------------------- NJ has ${data.length} Brokerages -------------------------\n`);
    return data
}

async function fetchDetailByOfficeId({
    officeListData,
    brokerageLimit,
    page,
    writeStream,
    realtorCounter
}) {
    console.log(`\n############################# Start Fetching Realtor Data By Brokerage #############################\n`);
    let realtorListHandle = null, realtorDataListResult = []

    for (let i = 0; i < officeListData.length; i++) {
        await page.goto(`${NJMLS_AGENT_DIR_URL}${officeListData[i][0]}`, {
            waitUntil: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2']

        });
        console.log(page.url());
        realtorListHandle = await page.$$eval(
            'td[width="38%"] font[color="#000000"]',
            content => {
                return content.map(e => e.innerText.split('\n'))
            }
        );
        realtorListHandle
            .map(ele => {
                realtorCounter++;
                if(ele.length > 4)
                    ele = [ele[0],ele[2],ele[3],ele[4]]
                realtorDataListResult.push([officeListData[i][0], officeListData[i][1], ...ele])
                //writing line by line
                writeStream.write(realtorDataListResult[realtorDataListResult.length - 1].join(',') + '\n')
            })
        writeStream.write(['','','',''].join(',') + '\n', () => {
            // Finish writing one brokage to stream
            console.log(`------ ${officeListData[i][1]} - ${officeListData[i][0]} --- has ${realtorListHandle.length} agent(s). ------`);
            console.log(`------ We have scraped ${realtorCounter} agents from ${i+1} Brokerages. ------ Progress: ${(i+1)/brokerageLimit*100}% ------\n`);
            console.log(``);
        })
    }
    return realtorDataListResult
}

async function authentication({userid, pw, page}) {
    console.log(`\n############################# Logging into www.newjerseymls.com #############################\n`);
    await page.goto(NJMLS_LOGIN_URL);

    // Login
    await page.type('#MemberId', userid);
    await page.type('#MemberPassword', pw);
    await page.click('#submit1');
    if(page.url() == "https://njmls.xmlsweb.com/newdesktop/default.asp") {
        console.log(`------------------------- Authentication Successed, Navigating to ${page.url()} -------------------------\n`)
    } else {
        console.log(`------------------------- Authentication Failed, Navigating to ${page.url()} -------------------------\n`)
    }
    return page
}
