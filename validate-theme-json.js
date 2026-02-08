#!/usr/bin/env node
/**
 * Simple script to validate theme.json against WordPress schema
 * Usage: node validate-theme-json.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const themeJsonPath = path.join(__dirname, 'theme.json');
const schemaUrl = 'https://schemas.wp.org/trunk/theme.json';

// Simple JSON Schema validation (basic check)
function validateAgainstSchema(data, schema) {
    const errors = [];
    
    // Check if required properties exist
    if (schema.required) {
        for (const prop of schema.required) {
            if (!(prop in data)) {
                errors.push(`Missing required property: ${prop}`);
            }
        }
    }
    
    // Check for invalid properties (properties not in schema)
    if (schema.properties) {
        for (const key in data) {
            if (key !== '$schema' && !(key in schema.properties)) {
                // Check if it's in any nested schema
                let found = false;
                for (const prop in schema.properties) {
                    if (typeof schema.properties[prop] === 'object' && 
                        schema.properties[prop].properties && 
                        key in schema.properties[prop].properties) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    errors.push(`Invalid property: "${key}" is not a valid property in theme.json`);
                }
            }
        }
    }
    
    return errors;
}

// Fetch schema
https.get(schemaUrl, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        try {
            const schema = JSON.parse(data);
            const themeJson = JSON.parse(fs.readFileSync(themeJsonPath, 'utf8'));
            
            console.log('Validating theme.json...\n');
            
            const errors = validateAgainstSchema(themeJson, schema);
            
            if (errors.length > 0) {
                console.error('❌ Validation errors found:');
                errors.forEach(err => console.error(`  - ${err}`));
                process.exit(1);
            } else {
                console.log('✅ theme.json is valid!');
            }
        } catch (err) {
            console.error('Error:', err.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('Error fetching schema:', err.message);
    console.error('\nMake sure you have network access to download the schema.');
    process.exit(1);
});
