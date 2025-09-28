import fs from 'fs';

// Function to read and parse combinedData from data.ts file
function readCombinedDataFromFile() {
    const dataContent = fs.readFileSync('../data/data.ts', 'utf8');
    
    // Extract the combinedData array
    const combinedDataMatch = dataContent.match(/const combinedData[\s\S]*?= \[([\s\S]*?)\];/);
    if (!combinedDataMatch) {
        throw new Error('Could not find combinedData array in data.ts');
    }
    
    // Parse the array content (simplified parsing for this specific format)
    const arrayContent = combinedDataMatch[1];
    const entries = [];
    
    // Split by object boundaries and parse each entry
    const objectMatches = arrayContent.match(/\{[\s\S]*?\}/g) || [];
    
    objectMatches.forEach((objStr, index) => {
        const entry = {};
        
        // Extract type
        const typeMatch = objStr.match(/type:\s*"([^"]+)"/);
        if (typeMatch) entry.type = typeMatch[1];
        
        // Extract timestamp
        const timestampMatch = objStr.match(/timestamp:\s*(\d+)n/);
        if (timestampMatch) entry.timestamp = BigInt(timestampMatch[1]);
        
        // Extract payload
        const payloadMatch = objStr.match(/payload:\s*(?:hexStringToArrayBuffer\("([^"]+)"\)|"([^"]+)")/);
        if (payloadMatch) {
            const hexString = payloadMatch[1];
            const stringPayload = payloadMatch[2];
            
            if (hexString) {
                // Convert hex string to ArrayBuffer
                const cleanHexString = hexString.replace(/\s+/g, '');
                const byteArray = new Uint8Array(cleanHexString.length / 2);
                for (let i = 0; i < cleanHexString.length; i += 2) {
                    const byteString = cleanHexString.substr(i, 2);
                    const byteValue = parseInt(byteString, 16);
                    byteArray[i / 2] = byteValue;
                }
                entry.payload = byteArray.buffer;
            } else if (stringPayload) {
                entry.payload = stringPayload;
            }
        }
        
        entries.push(entry);
    });
    
    return entries;
}

// Function to apply GPT inferences to combinedData
function applyGPTInferences(combinedData, gptInferences) {
    // Create a deep copy of the combinedData array
    const updatedData = JSON.parse(JSON.stringify(combinedData, (key, value) => {
        // Handle BigInt serialization
        if (typeof value === 'bigint') {
            return value.toString() + 'n';
        }
        // Handle ArrayBuffer serialization
        if (value instanceof ArrayBuffer) {
            return Array.from(new Uint8Array(value));
        }
        return value;
    }));

    // Convert back BigInt and ArrayBuffer after parsing
    const processedData = updatedData.map(entry => {
        if (entry.timestamp && typeof entry.timestamp === 'string' && entry.timestamp.endsWith('n')) {
            entry.timestamp = BigInt(entry.timestamp.slice(0, -1));
        }
        if (entry.payload && Array.isArray(entry.payload)) {
            entry.payload = new Uint8Array(entry.payload).buffer;
        }
        return entry;
    });

    // Track inference index for data packets only
    let inferenceIndex = 0;

    // Apply inferences to data packets
    const result = processedData.map(entry => {
        // Only apply inferences to DATA-UP and DATA-DOWN packets
        if (entry.type === 'DATA-UP' || entry.type === 'DATA-DOWN') {
            if (inferenceIndex < gptInferences.length) {
                return {
                    ...entry,
                    inferred: gptInferences[inferenceIndex++]
                };
            }
        }
        // Return USER-HINT entries unchanged
        return entry;
    });

    return result;
}

// Helper function to convert ArrayBuffer to hex string for display
function arrayBufferToHexString(buffer) {
    const uint8Array = new Uint8Array(buffer);
    return Array.from(uint8Array)
        .map(byte => byte.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');
}

// Function to process GPT response and apply inferences
function processGptResponse(combinedData, gptResponseText) {
    try {
        // Parse the GPT response (already in the correct format)
        const gptInferences = JSON.parse(gptResponseText);
        
        // Apply inferences to the combined data
        const updatedCombinedData = applyGPTInferences(combinedData, gptInferences);
        
        // Log the results for verification
        console.log('Updated combinedData with inferences:');
        updatedCombinedData.forEach((entry, index) => {
            console.log(`\nEntry ${index + 1}:`);
            console.log(`  Type: ${entry.type}`);
            console.log(`  Timestamp: ${entry.timestamp}`);
            
            if (entry.type === 'USER-HINT') {
                console.log(`  Context: "${entry.payload}"`);
            } else {
                console.log(`  Payload: ${arrayBufferToHexString(entry.payload)}`);
                if (entry.inferred) {
                    console.log(`  Inferred: ${entry.inferred.title} (confidence: ${entry.inferred.confidence})`);
                    console.log(`  Description: ${entry.inferred.description}`);
                    console.log(`  Fields: ${entry.inferred.fields.length} fields defined`);
                    
                    // Show field details
                    entry.inferred.fields.forEach((field, fieldIndex) => {
                        console.log(`    Field ${fieldIndex + 1}: ${field.name} [${field.range[0]}-${field.range[1]}] - ${field.description}`);
                    });
                }
            }
        });
        
        return updatedCombinedData;
    } catch (error) {
        console.error('Error processing GPT response:', error);
        return combinedData; // Return original data on error
    }
}

// Main processing function (from test.js)
export async function processInferences(gptOutputFile = './GPT_output.txt') {
    try {
        console.log('📖 Reading combinedData from data.ts...');
        const combinedData = readCombinedDataFromFile();
        
        console.log('📖 Reading GPT response from file...');
        const fullFileContent = fs.readFileSync(gptOutputFile, 'utf8');
        
        // Extract only the JSON part (ends with ']' followed by blank lines)
        const jsonEndMatch = fullFileContent.match(/^]\s*$/m);
        if (!jsonEndMatch) {
            throw new Error('Could not find end of JSON array in GPT response file');
        }
        
        const jsonEndIndex = jsonEndMatch.index + jsonEndMatch[0].length;
        const gptResponse = fullFileContent.substring(0, jsonEndIndex).trim();
        
        console.log('🔄 Applying inferences...');
        
        // Parse the GPT response and apply inferences directly (without console output)
        const gptInferences = JSON.parse(gptResponse);
        const updatedData = applyGPTInferences(combinedData, gptInferences);
        
        // Save the results to a file
        const outputFile = '../data/processed_data.json';
        const jsonOutput = JSON.stringify(updatedData, (key, value) => {
            // Handle BigInt serialization for JSON
            if (typeof value === 'bigint') {
                return value.toString() + 'n';
            }
            // Handle ArrayBuffer serialization for JSON
            if (value instanceof ArrayBuffer) {
                return {
                    type: 'ArrayBuffer',
                    data: Array.from(new Uint8Array(value))
                };
            }
            return value;
        }, 2);
        
        fs.writeFileSync(outputFile, jsonOutput, 'utf8');
        
        console.log('✅ Processing completed successfully!');
        console.log(`📁 Results saved to: ${outputFile}`);
        console.log(`📊 Processed ${updatedData.length} entries total`);
        
        // Count how many entries got inferences
        const inferredCount = updatedData.filter(entry => entry.inferred).length;
        console.log(`🧠 Applied inferences to ${inferredCount} data packets`);
        
        return updatedData;
        
    } catch (error) {
        console.error('❌ Processing failed:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Export functions for use in other modules
export {
    readCombinedDataFromFile,
    applyGPTInferences,
    arrayBufferToHexString,
    processGptResponse
};
