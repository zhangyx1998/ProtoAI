import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to read and parse data.ts file
function readDataFromFile() {
    const dataFilePath = path.join(__dirname, 'data.ts');
    const dataContent = fs.readFileSync(dataFilePath, 'utf8');
    
    // Extract the combinedData array from the file
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
        if (timestampMatch) entry.timestamp = timestampMatch[1];
        
        // Extract payload
        const payloadMatch = objStr.match(/payload:\s*(?:hexStringToArrayBuffer\("([^"]+)"\)|"([^"]+)")/);
        if (payloadMatch) {
            entry.payload = payloadMatch[1] || payloadMatch[2]; // hex string or regular string
        }
        
        entries.push(entry);
    });
    
    return entries;
}

// Function to generate prompt text
function generatePrompt(data) {
    let prompt = `## Instructions

[Please type your instruction prompt here]

## Data

The following is a sequence of packets and user hints captured from a communication protocol. Each entry contains:

- **DATA-UP/DATA-DOWN packets**: Raw binary data with timestamp and payload (hex format)
- **USER-HINT entries**: Human-provided context about what was happening at specific timestamps

Please analyze this data to understand the communication protocol structure and infer the meaning of different packet fields.
The response structure should strictly follow the following for each packet. For each DATA-UP or DATA-DOWN package, the inferred section need to be provided.
No other suggestions needs to be provided.

### Response Structure:

export type InferredPacketProperties = {
    readonly title: string; // use one of the title from InferredPacketType
    readonly description: string; // Describes the packet's role or purpose within the protocol
    readonly confidence: number; // Confidence level of the inference (0 to 1)
    readonly fields: BinaryField[];
};

export type BinaryField = {
    // Name of the field
    readonly name: string;
    // Description of the field's purpose
    readonly description: string;
    // Start and end position of the field in bits
    // Adjacent fields must not overlap, but they may or may not
    //  be contiguous
    readonly range: [number, number];
};

export type Inference = {
    summary: {
        title: string // Name of the protocol
        overview: string // Short paragraph describing the protocol
        entries: InferredPacketType[] // Dictionary of inferred packet types
    },
    details: (Packet | UserHint)[]
};

export type InferredPacketType = {
    title: string; // A concise name for the packet type
    description: string; // Describes the packet's role or purpose within the protocol
    fields: BinaryField[]; // list of fields in the packet
};

### Combined Data Array:

`;

    data.forEach((entry, index) => {
        prompt += `**Entry ${index + 1}:**\n`;
        prompt += `- Type: ${entry.type}\n`;
        prompt += `- Timestamp: ${entry.timestamp}\n`;
        
        if (entry.type === 'USER-HINT') {
            prompt += `- Context: "${entry.payload}"\n\n`;
        } else {
            prompt += `- Payload: ${entry.payload}\n\n`;
        }
    });

    prompt += `### Additional Context:

- DATA-DOWN packets represent data sent from a controller/host to a device
- DATA-UP packets represent data sent from a device back to the controller/host
- USER-HINT entries provide contextual information about system state at specific timestamps, be aware that the user input is slower than the data packets because of human reaction time
- All payload data is represented in hexadecimal format
- Timestamps are in some unit of time`;

    return prompt;
}

// Function to write prompt to file
function writePromptToFile(promptContent) {
    const promptFilePath = path.join(__dirname, 'prompt.txt');
    fs.writeFileSync(promptFilePath, promptContent, 'utf8');
    console.log('Generated prompt.txt successfully');
}

// Main execution
try {
    // Read data from data.ts
    console.log('Reading data from data.ts...');
    const combinedData = readDataFromFile();
    
    // Generate prompt
    console.log('Generating prompt...');
    const promptContent = generatePrompt(combinedData);
    
    // Write to prompt.txt
    writePromptToFile(promptContent);
    
    // Initialize OpenAI client
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Send prompt to GPT and get response
    console.log('🤖 Sending prompt to GPT...');
    const response = await client.responses.create({
        model: "gpt-5",
        input: promptContent
    });
    
    // Save GPT response to file
    const gptOutputFile = path.join(__dirname, 'GPT_output.txt');
    fs.writeFileSync(gptOutputFile, response.output_text, 'utf8');
    console.log('💾 GPT response saved to GPT_output.txt');
    
    // Process the inferences using dataHandling.js function
    console.log('🔄 Processing inferences...');
    const { processInferences } = await import('./dataHandling.js');
    await processInferences(gptOutputFile);

} catch (error) {
    console.error('Error:', error.message);
}