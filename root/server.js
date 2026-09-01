import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static('public'));

app.post('/api/parse-equation', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    const apiKey = req.headers['x-gemini-key'] || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        error: 'Missing Gemini API Key. Please enter your key in the top settings input.' 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
      You are an expert math OCR parser. 
      Extract the 3D surface mathematical equation from this image in terms of x and y, where z = f(x, y).
      Convert it strictly to a single-line string compatible with math.js syntax.
      
      Formatting Rules:
      1. Do NOT include "z =", "f(x,y) =", or markdown code blocks.
      2. Always use explicit multiplication (e.g., "2*x", "x*y", "sin(x)*cos(y)").
      3. Solve for z if necessary. If it's a 2D equation like y = x^2, re-map it as x^2.
      4. Output ONLY the raw mathematical string expression.
    `;

    const imagePart = {
      inlineData: {
        data: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const cleanExpr = result.response.text().trim().replace(/`/g, '');

    res.json({ success: true, expression: cleanExpr });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});