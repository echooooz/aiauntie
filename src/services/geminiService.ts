import { GoogleGenAI, Type } from "@google/genai";
import { RecordType, DiaperType } from "../src/types";

const parsePrompt = `
You are an intelligent assistant for a baby tracking app. 
The user will speak a command describing a baby care activity.
Your job is to extract the details into a structured JSON object.

Current Reference Time (User's Local Time): \${CURRENT_TIME}

Rules:
1. **Time Calculation**: The user's input time is relative to the "Current Reference Time". STRICTLY respect the timezone offset.

2. **Category Mapping PRIORITY (Must follow STRICTLY)**:
   
   *** PRIORITY 1: PUMPING (Producing Milk) ***
   - If the text implies **extracting** milk or using a pump.
   - **Keywords**: "吸" (Suck/Pump), "泵" (Pump), "挤" (Express), "pump", "sucking".
   - **Common Phrases**: "吸奶" (Xi Nai), "吸出来的" (Sucked out), "吸了" (Sucked), "挤奶" (Express).
   - **HOMOPHONE CORRECTION**: The STT often hears "Xi" as "Qi/7" or "Xi/Wash".
     - IF YOU SEE: "七奶" (7 milk), "7奶", "洗奶" (Wash milk), "西乃", "气奶", "5点吸奶".
     - **ACTION**: Map to **PUMPING**.
     - **EXAMPLE**: "5点吸奶100毫升" -> type: PUMPING, amountMl: 100, timestamp: today 05:00. (DO NOT map to BOTTLE_MILK).

   *** PRIORITY 2: NURSING (Direct Breastfeeding) ***
   - Keywords: "Breastfeed", "Nursing", "Direct feed", "亲喂", "吃奶" (Eat milk - usually means baby eating directly).
   - Map to **NURSING**.

   *** PRIORITY 3: BOTTLE_MILK (Feeding Expressed Milk) ***
   - Keywords: "Bottle fed breast milk", "Frozen milk", "母乳瓶喂", "瓶喂母乳", "喂了母乳".
   - ONLY use this if the user explicitly says they are *feeding* the baby with a bottle of breast milk. If the user just says "Xi Nai 100ml", assume PUMPING.

   *** PRIORITY 4: BOTTLE_FORMULA ***
   - Keywords: "Formula", "Milk powder", "奶粉".

   *** PRIORITY 5: OTHER ***
   - Diaper: "Diaper", "Pee", "Poop", "换尿布", "尿了", "拉了".
   - Sleep: "Sleep", "Woke up", "Bedtime", "睡觉", "醒了".

3. **Data Extraction**:
   - Duration -> endTime
   - Volume (ml) -> amountMl
   - "Left"/"Right" -> side

Return a JSON object.
`;

export const parseVoiceCommand = async (transcript: string): Promise<any> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    throw new Error("API Key is missing. Please set it in the environment.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const currentTime = new Date().toString();
  
  const finalPrompt = parsePrompt.replace("\${CURRENT_TIME}", currentTime);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: transcript,
      config: {
        systemInstruction: finalPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: [
                RecordType.NURSING,
                RecordType.BOTTLE_MILK,
                RecordType.BOTTLE_FORMULA,
                RecordType.PUMPING,
                RecordType.DIAPER,
                RecordType.SLEEP,
                RecordType.OTHER,
              ],
            },
            timestamp: { type: Type.STRING, description: "ISO 8601 String of start time" },
            endTime: { type: Type.STRING, description: "ISO 8601 String of end time if applicable" },
            amountMl: { type: Type.INTEGER, description: "Volume in ml if applicable" },
            side: { type: Type.STRING, enum: ["left", "right", "both"], nullable: true },
            diaperType: { 
              type: Type.STRING, 
              enum: [DiaperType.WET, DiaperType.DIRTY, DiaperType.MIXED],
              nullable: true 
            },
            note: { type: Type.STRING, description: "Any extra details" },
          },
          required: ["type", "timestamp"],
        },
      },
    });

    let text = response.text;
    if (!text) throw new Error("No response from AI");
    
    // Sanitize Markdown code blocks if present
    if (text.startsWith("```")) {
       text = text.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
    }
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Parse Error:", error);
    throw error;
  }
};