/**
 * IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT
 *
 * You should never commit this file to a public repository on GitHub!
 * All public code on GitHub can be searched, that means anyone can see your
 * uploaded secrets.js file.
 *
 * I did it for your convenience using "throw away" API keys and passwords so
 * that all features could work out of the box.
 *
 * Use config vars (environment variables) below for production API keys
 * and passwords. Each PaaS (e.g. Heroku, Nodejitsu, OpenShift, Azure) has a way
 * for you to set it up from the dashboard.
 *
 * Another added benefit of this approach is that you can use two different
 * sets of keys for local development and production mode without making any
 * changes to the code.

 * IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT  IMPORTANT
 */

module.exports = {

    // testing database server
    
    // db: process.env.MONGODB || 'mongodb://127.0.0.1:27017/mly',
    // db: process.env.MONGODB || 'mongodb://mlyuser:mt1oOfL@128.199.114.58:26000/mly',

    db: process.env.MONGODB || 'mongodb://localhost:27017/MLY',

    srlApiUrl: process.env.SRLAPIURL || 'http://124.30.176.148:88',

    mvmApiUrl: process.env.MVMAPIURL || 'http://localhost:1337',

    redisPort: process.env.REDISPORT || '6379',

    redisHost: process.env.REDISHOST || '127.0.0.1',

    redisPassword: process.env.REDISPASSWORD || '',

    sessionSecret: process.env.SESSION_SECRET || 'Your Session Secret goes here',

    tokenSecret: process.env.TOKEN_SECRET || 'kungfuP@nda',

    apiSecret: process.env.API_SECRET || 'kungfu@Panda',

    notification: {
        url: process.env.NOTIFICATIONURL
    },

    sendgrid: {
        user: process.env.SENDGRID_USER || 'hslogin',
        password: process.env.SENDGRID_PASSWORD || 'hspassword00'
    },

    plivo: {
        authId: process.env.PLIVO_AUTHID || 'MAMTFKMTGZZTFIYJDOOO',
        authToken: process.env.PLIVO_AUTHTOKEN || 'ZTExMTZmMzFhN2UyYmRhMWFlOGIyZTE2ZDRmNDjl'
    },

    truemd: {
        apikey: '151d53c3c4802fce6cbc8d3484036c'
    },
    RESONATOR: process.env.RESONATOR || 'http://resonator',
    TIMEZONE: 'Asia/Kolkata',

    //Firebase config
    firebaseConfig: {
        apiKey: process.env.FIREBASEAPIKEY || "AIzaSyACpGpYDHWnVlfi1KGCuHAYq-gCwDjI4g4", //UI
        authDomain: process.env.FIREBASEAUTHDOMAIN || "mlytest-24591.firebaseapp.com", //UI
        firebaseDBURL: process.env.FIREBASEDBURL || "https://mlytest-24591.firebaseio.com", //API,UI
        storageBucket: process.env.FIREBASESTORAGEBUCKET || "mlytest-24591.appspot.com", //UI
        firebaseSA: process.env.FIREBASESA || "mlytest-fbd9fdd8ad26.json" //API
    }
};