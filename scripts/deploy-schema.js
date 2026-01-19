
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, 'create-tables.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

const projectRef = 'xlwtcazmcczhzmmzzdcg';
const accessToken = 'sbp_3ca0adb1748f10f92f71476f41cdef8a8493c4b2';

async function deploy() {
    console.log('Deploying schema to project:', projectRef);

    // Note: usage of Supabase Management API query endpoint
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('Deployment Failed:', response.status, text);
        process.exit(1);
    }

    const result = await response.json();
    console.log('Deployment Success:', JSON.stringify(result, null, 2));
}

deploy();
