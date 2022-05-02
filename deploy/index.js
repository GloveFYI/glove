
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const deploy = require('./toSiasky');

console.log(process.env);

deploy(
    process.env.SKYNET_PORTAL_URL,
    process.env.SKYNET_REGISTRY_SEED,
    process.env.SKYNET_DATAKEY,
    'public'
).then(res => res);