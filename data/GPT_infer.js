import OpenAI from "openai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// GPT_infer.js - Pure inference module
// This module only handles GPT inference processing
// Data reading should be handled by the calling module

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

// Main inference function (exported for use in other modules)
export async function runGPTInference(combinedData) {
    try {
        // Validate input parameter
        if (!combinedData || !Array.isArray(combinedData)) {
            throw new Error('combinedData parameter is required and must be an array');
        }
        
        console.log(`Processing ${combinedData.length} entries...`);
        
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
        const result = await processInferences(gptOutputFile);
        
        return result;

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

// This module only exports the runGPTInference function
// Use it by importing and calling with combinedData parameter