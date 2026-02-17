const fs = require('fs');
const path = require('path');
const https = require('https');

const configPath = path.join(process.env.USERPROFILE, '.wrangler', 'config', 'default.toml');
const cfg = fs.readFileSync(configPath, 'utf8');
const token = cfg.match(/oauth_token\s*=\s*"([^"]+)"/)[1];

function cfApi(method, apiPath, body) {
    return new Promise((resolve, reject) => {
        const opts = { hostname: 'api.cloudflare.com', path: `/client/v4${apiPath}`, method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } };
        const req = https.request(opts, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve(JSON.parse(d))); });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    // Find zone
    const zones = await cfApi('GET', '/zones?name=grubsight.com');
    console.log('grubsight.com zone:', zones.result?.length ? `ID=${zones.result[0].id}, status=${zones.result[0].status}` : 'NOT FOUND');

    // Add custom domain to Pages
    const r1 = await cfApi('POST', '/accounts/24c5b14aa2682075334c8be529c6ea9f/pages/projects/grubsight/domains', { name: 'grubsight.com' });
    console.log('Add grubsight.com:', r1.success ? 'SUCCESS' : JSON.stringify(r1.errors));

    const r2 = await cfApi('POST', '/accounts/24c5b14aa2682075334c8be529c6ea9f/pages/projects/grubsight/domains', { name: 'www.grubsight.com' });
    console.log('Add www.grubsight.com:', r2.success ? 'SUCCESS' : JSON.stringify(r2.errors));
}
main();
