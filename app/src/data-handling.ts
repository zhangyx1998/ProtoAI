// Function to read and parse combinedData from data.ts file
function readCombinedData(dataContent: string) {    
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

// Function to merge GPT details with original combinedData (including USER-HINT entries)
export function mergeWithOriginalData(combinedData, gptDetails) {
    const result = [];
    
    // Since GPT now includes USER-HINT entries in details, we can process them directly
    // but we need to merge the original data structure (BigInt timestamps, ArrayBuffer payloads)
    // with the GPT inference data
    
    combinedData.forEach((originalEntry, index) => {
        if (index < gptDetails.length) {
            const gptEntry = gptDetails[index];
            
            if (originalEntry.type === 'USER-HINT') {
                // For USER-HINT entries, keep original structure
                result.push({
                    type: originalEntry.type,
                    timestamp: originalEntry.timestamp,
                    payload: originalEntry.payload // Keep as string from original
                });
            } else {
                // For DATA packets, merge original data with GPT inferences
                result.push({
                    type: originalEntry.type,
                    timestamp: originalEntry.timestamp,
                    payload: originalEntry.payload, // Keep original ArrayBuffer
                    inferred: gptEntry.inferred
                });
            }
        } else {
            // Fallback to original entry if no GPT detail available
            result.push(originalEntry);
        }
    });
    
    return result;
}

// Main processing function (from test.js)
export async function processInferences(content: string, combinedData = null) {
    try {
        let dataToProcess;
        if (combinedData && Array.isArray(combinedData)) {
            console.log('📖 Using provided combinedData...');
            dataToProcess = combinedData;
        } else {
            console.log('📖 Reading combinedData from data.ts...');
            dataToProcess = readCombinedData();
        }

        console.log('📖 Reading GPT response from file...');
        const fullFileContent = fs.readFileSync(gptOutputFile, 'utf8');
        
        console.log('🔄 Parsing GPT response...');
        
        // Parse the new GPT response structure (JSON object with summary and details)
        const gptResponse = JSON.parse(fullFileContent.trim());
        
        // Verify the response has the expected structure
        if (!gptResponse.summary || !gptResponse.details) {
            throw new Error('GPT response missing required summary or details structure');
        }
        
        console.log('🔄 Merging data with inferences...');
        
        // Merge the original combinedData with GPT details (preserving USER-HINT entries)
        const detailsWithInferences = mergeWithOriginalData(dataToProcess, gptResponse.details);
        
        // Create the final Inference structure
        const finalInference = {
            summary: gptResponse.summary,
            details: detailsWithInferences
        };
        
        console.log('✅ Processing completed successfully!');
        console.log(`📊 Protocol: ${finalInference.summary.title}`);
        console.log(`📖 Overview: ${finalInference.summary.overview.substring(0, 100)}...`);
        console.log(`📊 Processed ${finalInference.details.length} entries total`);
        
        // Count how many entries got inferences
        const inferredCount = finalInference.details.filter(entry => entry.inferred).length;
        console.log(`🧠 Applied inferences to ${inferredCount} data packets`);
        
        return finalInference;
    } catch (error) {
        console.error('❌ Processing failed:', error.message);
        console.error(error.stack);
        throw error;
    }
}
