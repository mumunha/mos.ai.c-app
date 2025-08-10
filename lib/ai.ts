import OpenAI from 'openai';

// Configuration constants
const CHUNKING_THRESHOLD = 20000; // Only chunk documents larger than 20,000 characters
const MAX_CHUNK_SIZE = 1000;      // Default chunk size
const CHUNK_OVERLAP = 200;        // Overlap between chunks
const MAX_CHUNKS_PER_NOTE = 50;   // Performance limit

let cachedOpenAIClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cachedOpenAIClient) return cachedOpenAIClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option.'
    );
  }
  cachedOpenAIClient = new OpenAI({ apiKey });
  return cachedOpenAIClient;
}

export interface Task {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string; // ISO date string
}

export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  start_datetime: string; // ISO datetime string
  end_datetime?: string; // ISO datetime string
  all_day: boolean;
}

export interface ProcessingResult {
  summary: string;
  tags: string[];
  language: string;
  tasks: Task[];
  calendar_events: CalendarEvent[];
  chunks: Array<{
    text: string;
    embedding: number[];
    tokens: number;
  }>;
}

// Create embedding for text
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    const response = await getOpenAIClient().embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Limit text length
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error creating embedding:', error);
    throw error;
  }
}

// Generate summary and extract tags
export async function generateSummaryAndTags(text: string): Promise<{
  summary: string;
  tags: string[];
  language: string;
  tasks: Task[];
  calendar_events: CalendarEvent[];
}> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that analyzes text and provides:
1. A concise summary (2-3 sentences)
2. Relevant tags focusing on specific entities and key concepts (3-8 tags)
3. The detected language
4. Actionable tasks extracted from the content
5. Calendar events/appointments extracted from the content

For tags, prioritize:
- People names (first names, full names, roles/titles)
- Locations (cities, countries, venues, addresses)
- Companies, organizations, brands
- Specific topics, concepts, or domains (not generic words)
- Dates, events, projects, or initiatives
- Technical terms, methodologies, or frameworks
- Products, tools, or technologies mentioned

For tasks, identify:
- Action items, to-dos, assignments
- Things to follow up on or complete
- Deadlines and deliverables
- Responsibilities mentioned in the text

For calendar events, identify:
- Meetings, appointments, calls
- Specific dates and times mentioned
- Events, conferences, deadlines
- Scheduled activities

Respond in JSON format:
{
  "summary": "Brief summary here",
  "tags": ["specific_entity1", "key_concept2", "person_name3"],
  "language": "detected_language",
  "tasks": [
    {
      "title": "Task title",
      "description": "Optional description",
      "priority": "medium",
      "due_date": "2025-08-15T10:00:00Z"
    }
  ],
  "calendar_events": [
    {
      "title": "Event title",
      "description": "Optional description", 
      "location": "Optional location",
      "start_datetime": "2025-08-15T14:00:00Z",
      "end_datetime": "2025-08-15T15:00:00Z",
      "all_day": false
    }
  ]
}`
        },
        {
          role: 'user',
          content: text.slice(0, 4000) // Limit context
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 500
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from OpenAI');

    try {
      const result = JSON.parse(content);
      return {
        summary: result.summary || 'No summary available',
        tags: Array.isArray(result.tags) ? result.tags : [],
        language: result.language || 'unknown',
        tasks: Array.isArray(result.tasks) ? result.tasks : [],
        calendar_events: Array.isArray(result.calendar_events) ? result.calendar_events : []
      };
    } catch (parseError) {
      // Fallback parsing if JSON is malformed
      return {
        summary: content.slice(0, 200) + '...',
        tags: ['ai-generated'],
        language: 'unknown',
        tasks: [],
        calendar_events: []
      };
    }
  } catch (error) {
    console.error('Error generating summary and tags:', error);
    return {
      summary: 'Error processing content',
      tags: ['processing-error'],
      language: 'unknown',
      tasks: [],
      calendar_events: []
    };
  }
}

// Generate a concise title for a note based on its content
export async function generateNoteTitle(text: string): Promise<string> {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate a concise, descriptive title for this note content. The title should:
- Be 2-8 words long
- Capture the main topic or key insight
- Be clear and informative
- Not use generic words like "Note", "Text", "Content"
- Focus on the primary subject, action, or concept
- Use title case (capitalize main words)

Return only the title, nothing else.`
        },
        {
          role: 'user',
          content: text.slice(0, 2000) // Use first 2000 chars for title generation
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    });

    const title = response.choices[0].message.content?.trim();
    if (!title || title.length < 2) {
      return 'Untitled Note';
    }

    // Ensure title is reasonable length
    return title.length > 100 ? title.slice(0, 97) + '...' : title;
  } catch (error) {
    console.error('Error generating note title:', error);
    return 'Untitled Note';
  }
}

// Split text into chunks for embedding
export function splitIntoChunks(text: string, maxChunkSize = MAX_CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  // Input validation
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Only chunk documents larger than the threshold
  if (text.length <= CHUNKING_THRESHOLD) {
    return [text.trim()];
  }
  
  console.log(`Document is ${text.length} chars, chunking (threshold: ${CHUNKING_THRESHOLD})`);
  
  if (text.length <= maxChunkSize) {
    return [text.trim()];
  }

  const chunks: string[] = [];
  let start = 0;
  let iterations = 0;
  const maxIterations = Math.ceil(text.length / (maxChunkSize - overlap)) + 10; // Safety limit
  
  while (start < text.length && iterations < maxIterations) {
    iterations++;
    
    let end = Math.min(start + maxChunkSize, text.length);
    
    // Try to break at sentence boundaries (only if not at the end)
    if (end < text.length) {
      const lastSentence = text.lastIndexOf('.', end);
      const lastNewline = text.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastSentence, lastNewline);
      
      // Only use the break point if it's reasonable
      if (breakPoint > start && breakPoint > start + (maxChunkSize * 0.3)) {
        end = breakPoint + 1;
      }
    }
    
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    // Move start position, ensuring we make progress
    const nextStart = Math.max(start + 1, end - overlap);
    start = nextStart;
    
    // Additional safety check
    if (start >= text.length || chunks.length > MAX_CHUNKS_PER_NOTE) {
      break;
    }
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

// Create chunks with embeddings
export async function createChunksWithEmbeddings(text: string): Promise<Array<{
  text: string;
  embedding: number[];
  tokens: number;
}>> {
  try {
    const chunks = splitIntoChunks(text);
    
    if (chunks.length === 1) {
      console.log(`Small document (${text.length} chars) - creating single embedding`);
    } else {
      console.log(`Large document (${text.length} chars) - created ${chunks.length} chunks`);
    }
    
    if (chunks.length === 0) {
      console.warn('No chunks created from text');
      return [];
    }
    
    if (chunks.length > MAX_CHUNKS_PER_NOTE) {
      console.warn(`Large number of chunks (${chunks.length}), limiting to ${MAX_CHUNKS_PER_NOTE}`);
      chunks.splice(MAX_CHUNKS_PER_NOTE); // Limit chunks for performance
    }
    
    const results = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        
        if (chunk.length === 0) {
          console.warn(`Skipping empty chunk at index ${i}`);
          continue;
        }
        
        const embedding = await createEmbedding(chunk);
        results.push({
          text: chunk,
          embedding,
          tokens: Math.ceil(chunk.length / 4) // Rough token estimation
        });
        
        // Add small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error processing chunk ${i + 1}:`, error);
        // Continue with other chunks even if one fails
      }
    }
    
    console.log(`Successfully processed ${results.length}/${chunks.length} chunks`);
    return results;
  } catch (error) {
    console.error('Error in createChunksWithEmbeddings:', error);
    throw error;
  }
}

// Main processing function
export async function processNote(noteText: string): Promise<ProcessingResult> {
  try {
    // Generate summary and tags
    const summaryAndTags = await generateSummaryAndTags(noteText);
    
    // Create embeddings for chunks
    const chunks = await createChunksWithEmbeddings(noteText);
    
    return {
      ...summaryAndTags,
      chunks
    };
  } catch (error) {
    console.error('Error processing note:', error);
    throw error;
  }
}

// Transcribe audio (for Telegram voice messages)
export async function transcribeAudio(audioBuffer: Buffer, filename?: string): Promise<string> {
  try {
    console.log(`🎤 Starting transcription for ${filename || 'audio.ogg'}, size: ${audioBuffer.length} bytes`);
    
    // Use Blob constructor if available (Edge runtime), otherwise create a compatible object
    let audioFile;
    
    if (typeof Blob !== 'undefined') {
      // Edge runtime or browser environment
      const arrayBuffer = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: 'audio/ogg' });
      audioFile = Object.assign(blob, {
        name: filename || 'audio.ogg',
        lastModified: Date.now()
      });
    } else {
      // Node.js environment - create a File-like object that OpenAI expects
      audioFile = {
        name: filename || 'audio.ogg',
        type: 'audio/ogg',
        size: audioBuffer.length,
        stream() {
          const { Readable } = require('stream');
          return Readable.from(audioBuffer);
        },
        arrayBuffer: () => Promise.resolve(audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength) as ArrayBuffer),
        text: () => Promise.reject(new Error('text() not supported for audio files')),
        slice: () => { throw new Error('slice() not supported'); },
        lastModified: Date.now(),
        webkitRelativePath: '',
        bytes: () => Promise.resolve(audioBuffer)
      } as unknown as File;
    }
    
    console.log('📡 Calling OpenAI Whisper API...');
    const response = await getOpenAIClient().audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en' // Can be auto-detected by omitting this
    });
    
    console.log(`✅ Transcription completed: ${response.text.length} characters`);
    return response.text;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
}