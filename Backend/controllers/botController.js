import Groq from 'groq-sdk';
import RAGService from '../services/RAGService.js';

// Controller for the RAG Chatbot
export const chatWithBot = async (req, res) => {
  const { message, canvasState } = req.body;

  if (!message) {
    return res.status(400).json({ message: 'Message query is required' });
  }

  // Check for API key
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('[BotController] GROQ_API_KEY is missing from environment variables.');
    return res.status(500).json({ message: 'AI Chatbot is currently misconfigured (missing API key).' });
  }

  try {
    // 1. Perform RAG query (limit to top 2 documents to save token space)
    console.log(`[BotController] Querying RAG for: "${message.substring(0, 50)}..."`);
    const ragContext = await RAGService.search(message, 2);
    const contextString = ragContext.map((c, i) => `[Doc ${i + 1}] Title: ${c.title}\nContent: ${c.content}`).join('\n\n');

    // 2. Parse Canvas Context (limit to top 5 sample objects to save token space)
    const { elements = {}, selectedObjectIds = [], activeTool = 'select', brushOptions = {} } = canvasState || {};
    const canvasObjectsArray = Object.values(elements);
    const totalObjects = canvasObjectsArray.length;
    
    const sampleObjects = canvasObjectsArray.slice(0, 5).map(obj => {
      const cleaned = { ...obj };
      if (cleaned.geometry) {
        cleaned.geometry = { ...cleaned.geometry };
        if (Array.isArray(cleaned.geometry.points)) {
          cleaned.geometry.points = `[Array of ${cleaned.geometry.points.length} points simplified]`;
        }
      }
      return cleaned;
    });

    const hasSelection = selectedObjectIds.length > 0;
    const selectionPrompt = hasSelection 
      ? `Active selected shapes/elements: ${JSON.stringify(selectedObjectIds)}. If the user requests to style, color, fill, resize, move, or delete without explicitly mentioning the canvas background, you MUST target these active elements instead of creating new elements or coloring the background.`
      : `No shapes are currently selected. If the user requests a property modification like 'fill yellow' or 'make it red' when no elements are selected, apply it to the canvas background (using FILL_BACKGROUND) as the default common target.`;

    // 3. Setup system prompt with concise instructions and minimal few-shot examples (TPM optimization)
    const systemPrompt = `You are "DesignDeck AI Co-Pilot" inside a collaborative vector whiteboard.
You assist with drawing, styling, layout, timeline version history, or platform support.

KNOWLEDGE BASE:
${contextString || 'No matching guidelines found.'}

CANVAS STATE:
- Active Tool: "${activeTool}"
- Brush Options: ${JSON.stringify(brushOptions)}
- Selection Status: ${selectionPrompt}
- Total Shapes: ${totalObjects}
- Sample Elements: ${JSON.stringify(sampleObjects)}

ACTION RULES:
1. If the user requests any action (drawing, coloring, styling, moving, deleting, grids, or background changes), you MUST output a structured JSON actions block at the very end of your response inside a <actions>...</actions> tag.
2. If you fail to output the action block, the change will NOT occur. Never omit the actions block for modifications.
3. Format: <actions>[{"type": "ACTION_NAME", ...}]</actions>

ALLOWED TYPES:
- DRAW_SHAPE: {"type": "DRAW_SHAPE", "shape": "rectangle"|"circle"|"line"|"arrow", "x": number, "y": number, "width": number, "height": number, "color": "hex", "fillColor": "hex|transparent", "label": "text"}
- MODIFY_SHAPES: {"type": "MODIFY_SHAPES", "targetIds": ["id1"], "updates": {"style": {"color": "hex", "fillColor": "hex"}}}
  *Use MODIFY_SHAPES to style, color, fill, or modify specific elements/shapes. If shapes are selected, target the selectedObjectIds: ${JSON.stringify(selectedObjectIds)} and modify their style.*
- DELETE_SHAPES: {"type": "DELETE_SHAPES", "targetIds": ["id1"]}
- ARRANGE_GRID: {"type": "ARRANGE_GRID", "targetIds": ["id1"], "columns": number, "spacing": number}
- FILL_BACKGROUND: {"type": "FILL_BACKGROUND", "color": "hex"}
  *Use FILL_BACKGROUND ONLY when the user explicitly requests to fill, set, change, or remove the background/screen/canvas color. NEVER use FILL_BACKGROUND for commands like "fill yellow" if a shape is selected.*
- ADD_TEXT: {"type": "ADD_TEXT", "text": "string", "x": number, "y": number, "color": "hex", "fontSize": number}
  *Use ADD_TEXT to add text labels, notes, or messages to the canvas.*
- CLEAR_CANVAS / CHANGE_TOOL / CHANGE_COLOR / SET_STROKE_WIDTH / SET_FILL_MODE / SET_ZOOM / UNDO / REDO / DELETE_SELECTED / DUPLICATE_SELECTED / MOVE_SELECTED / RESIZE_SELECTED

EXAMPLES:
1. User: "Draw a green circle at 200, 200"
AI: Drawing a green circle at (200, 200).
<actions>[{"type": "DRAW_SHAPE", "shape": "circle", "x": 200, "y": 200, "color": "#00FF00"}]</actions>

2. User: "fill yellow" (with shapes selected)
AI: Filling the selected shape with yellow.
<actions>[{"type": "MODIFY_SHAPES", "targetIds": ["selected-shape-id"], "updates": {"style": {"fillColor": "#FFFF00"}}}]</actions>

3. User: "Color the background light gray"
AI: Setting the canvas background to light gray.
<actions>[{"type": "FILL_BACKGROUND", "color": "#F3F4F6"}]</actions>

4. User: "create a text hello at 300, 380"
AI: Creating text "hello" at (300, 380).
<actions>[{"type": "ADD_TEXT", "text": "hello", "x": 300, "y": 380}]</actions>

5. User: "How do I rollback?"
AI: Find the Timeline panel at the bottom and click 'Rollback' next to a checkpoint.
`;

    // 4. Connect to Groq SDK
    const groq = new Groq({ apiKey });

    // 5. Establish Stream Connection Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('[BotController] Invoking Groq Streaming API...');
    const stream = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      stream: true,
      temperature: 0.1, // Keep it highly deterministic for structured actions JSON
      max_tokens: 1500
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        // Send as Server-Sent Event chunk
        res.write(`data: ${JSON.stringify({ token })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
    console.log('[BotController] Streaming completed successfully.');
  } catch (error) {
    console.error('[BotController] Error during AI chat execution:', error);
    res.status(500).json({ message: 'Internal Server Error invoking AI bot' });
  }
};

export default {
  chatWithBot
};
