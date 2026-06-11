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
    // 1. Perform RAG query
    console.log(`[BotController] Querying RAG for: "${message.substring(0, 50)}..."`);
    const ragContext = await RAGService.search(message, 3);
    const contextString = ragContext.map((c, i) => `[Doc ${i + 1}] Title: ${c.title}\nContent: ${c.content}`).join('\n\n');

    // 2. Parse Canvas Context
    const { elements = {}, selectedObjectIds = [], activeTool = 'select', brushOptions = {} } = canvasState || {};
    const canvasObjectsArray = Object.values(elements);
    const totalObjects = canvasObjectsArray.length;
    
    // Clean objects to prevent massive coordinate lists from blowing up token limits (e.g. freehand drawing points)
    const sampleObjects = canvasObjectsArray.slice(0, 15).map(obj => {
      const cleaned = { ...obj };
      if (cleaned.geometry) {
        cleaned.geometry = { ...cleaned.geometry };
        if (Array.isArray(cleaned.geometry.points)) {
          cleaned.geometry.points = `[Array of ${cleaned.geometry.points.length} points simplified to save token space]`;
        }
      }
      return cleaned;
    });

    // 3. Setup system prompt with rules, context, and few-shot examples
    const systemPrompt = `You are "DesignDeck AI Co-Pilot", a premium assistant inside a real-time collaborative vector digital whiteboard.
You have direct read and write access to the canvas. Your goal is to assist users with drawing, styling, layout arrangement, version history, or platform support.

==================================================
KNOWLEDGE BASE CONTEXT (RAG):
Use the following retrieved platform guides to answer questions regarding how to use DesignDeck:
${contextString || 'No matching guidelines found.'}
==================================================

==================================================
CURRENT CANVAS STATE:
- Active Tool: "${activeTool}"
- Brush Options: ${JSON.stringify(brushOptions)}
- Number of Selected Shapes: ${selectedObjectIds.length}
- Selected Shape IDs: ${JSON.stringify(selectedObjectIds)}
- Total Shapes on Canvas: ${totalObjects}
- Sample of Current Canvas Elements (up to 15):
${JSON.stringify(sampleObjects, null, 2)}
==================================================

ACTION INSTRUCTION RULES:
If the user requests drawing, styling, deletion, moving, zooming, or clearing the board, you MUST output a structured JSON actions block at the very end of your response, enclosed in a <actions>...</actions> tag.
Format:
<actions>
[
  { "type": "DRAW_SHAPE", "shape": "rectangle|circle|line|arrow", "x": number, "y": number, "width": number, "height": number, "color": "string", "fillColor": "string", "label": "string" },
  ...
]
</actions>

LIST OF ALLOWED ACTIONS (17 TYPES):
1. {"type": "DRAW_SHAPE", "shape": "rectangle"|"circle"|"line"|"arrow", "x": number, "y": number, "width": number, "height": number, "color": "hex_color", "fillColor": "hex_color|transparent", "label": "text"}
2. {"type": "DRAW_MULTIPLE", "shapes": [array_of_draw_shape_objects]}
3. {"type": "ARRANGE_GRID", "targetIds": ["id1", "id2"], "columns": number, "spacing": number}
4. {"type": "ADD_TEXT", "x": number, "y": number, "text": "string", "color": "hex_color", "fontSize": number}
5. {"type": "FILL_BACKGROUND", "color": "hex_color"}
6. {"type": "CLEAR_CANVAS"}
7. {"type": "CHANGE_TOOL", "tool": "select"|"pen"|"eraser"|"rectangle"|"circle"|"line"|"arrow"|"text"|"fill"|"eyedropper"}
8. {"type": "CHANGE_COLOR", "color": "hex_color"}
9. {"type": "SET_STROKE_WIDTH", "width": number}
10. {"type": "SET_FILL_MODE", "fill": boolean}
11. {"type": "SET_ZOOM", "zoom": number}
12. {"type": "UNDO"}
13. {"type": "REDO"}
14. {"type": "DELETE_SELECTED"}
15. {"type": "DUPLICATE_SELECTED"}
16. {"type": "MOVE_SELECTED", "dx": number, "dy": number}
17. {"type": "RESIZE_SELECTED", "width": number, "height": number}
18. {"type": "MODIFY_SHAPES", "targetIds": ["id1", "id2"], "updates": {"style": {"color": "hex"}, "geometry": {"width": 100}}}
19. {"type": "DELETE_SHAPES", "targetIds": ["id1", "id2"]}

CRITICAL RULES:
1. Always output conversational markdown text explaining what you are doing first.
2. Place the <actions> block only at the bottom of your response.
3. Coordinates: If you draw items, use positive coordinates (e.g. x between 50 and 800, y between 50 and 600).
4. If the user asks general questions or asks how to use a feature, use the context to answer and DO NOT output an <actions> block.

FEW-SHOT LEARNING EXAMPLES:

Example 1 (Draw a single shape):
User: "Draw a green circle at 200, 200"
AI: I will draw a green circle for you at coordinate (200, 200).
<actions>[{"type": "DRAW_SHAPE", "shape": "circle", "x": 200, "y": 200, "color": "#00FF00"}]</actions>

Example 2 (Modify styles on selection):
User: "Make selected rectangles red and thick"
AI: I see you have selected elements. I am updating their stroke colors to red and setting the stroke width.
<actions>[
  {"type": "MODIFY_SHAPES", "targetIds": ["id-123"], "updates": {"style": {"color": "#FF0000", "width": 8}}}
]</actions>

Example 3 (Layout arrangement):
User: "Align all selected shapes in a grid"
AI: I am organizing your selected objects into a neat grid arrangement.
<actions>[{"type": "ARRANGE_GRID", "targetIds": ["id-1", "id-2", "id-3"], "columns": 3, "spacing": 60}]</actions>

Example 4 (General QA query using RAG):
User: "How do I rollback changes?"
AI: To rollback the canvas to a historical checkpoint, locate the Timeline Replay panel at the bottom, find the checkpoint event or tagged milestone, and click the 'Rollback' button next to it. This will restore the database state and clear the client cache.

Example 5 (Delete specific shapes by ID):
User: "remove the line" (And there is a stroke/line element with ID "stroke-987" in canvas elements state)
AI: I will remove the line (stroke-987) from the canvas.
<actions>[{"type": "DELETE_SHAPES", "targetIds": ["stroke-987"]}]</actions>

Example 6 (Delete selected shapes/drawings):
User: "delete this" (And there is an active selection in canvas state, e.g. selectedObjectIds: ["rect-111"])
AI: I will delete the selected shape for you.
<actions>[{"type": "DELETE_SELECTED"}]</actions>

Example 7 (AI Shape Correction / "make proper shape"):
User: "make proper shape" (And the user has selected a messy stroke element, e.g. selectedObjectIds: ["stroke-123"] with geometry bounds { "x": 100, "y": 150, "width": 200, "height": 200 } and style { "color": "#217BF4" })
AI: I will convert your messy sketch into a clean geometric circle shape in the same position.
<actions>[
  {"type": "DELETE_SHAPES", "targetIds": ["stroke-123"]},
  {"type": "DRAW_SHAPE", "shape": "circle", "x": 200, "y": 250, "width": 200, "height": 200, "color": "#217BF4"}
]</actions>
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
