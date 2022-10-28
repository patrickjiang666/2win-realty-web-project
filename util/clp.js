// /**
//  * how to time an api
//  */
// const startTime = process.hrtime();
// (async () => {
//     await new Promise((resolve, reject) => setTimeout(resolve, 1000))
//     const totalTime = process.hrtime(startTime);
//     console.log('--------', startTime);
//     const totalTimeInMs = (totalTime[0] * 1000000000 + totalTime[1]) / 1e9;
//     console.log(totalTimeInMs);
// })()

// /**
//  * how to prompt user input
//  */
// const prompt = require('prompt-sync')();
// (async () => {

//     const name = await prompt('What is your name?');
//     console.log(`Hey there ${name}`);
    
//     const pw = await prompt('What is your pw?', {echo: '*'});
//     console.log(`Hey there ${pw} ${typeof(pw)}`);
// })()

/**
 * how to write csv file
 */

 var fs = require('fs')
 fs.appendFile('log.txt', 'new data', function (err) {
   if (err) {
     // append failed
   } else {
     // done
   }
 })