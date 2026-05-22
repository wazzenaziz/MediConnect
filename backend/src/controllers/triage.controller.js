const SPECIALTIES = [
  "General Practitioner",
  "Dermatologist",
  "Cardiologist",
  "Neurologist",
  "Gastroenterologist",
  "Pediatrician",
  "Gynecologist",
  "Orthopedist",
  "Ophthalmologist",
  "ENT Specialist",
  "Psychiatrist",
  "Urologist",
  "Endocrinologist",
  "Pulmonologist",
];

const SYSTEM_PROMPT = `You are a medical triage assistant for a healthcare scheduling app.

Your job: given a patient's free-text symptoms, classify them into ONE medical specialty from this fixed list:
${SPECIALTIES.map((s) => `- ${s}`).join("\n")}

Rules:
- Choose exactly ONE specialty from the list above. Do not invent new ones.
- If symptoms are vague, common, or could be handled in primary care, choose "General Practitioner".
- "confidence" is a number between 0 and 1 reflecting how certain you are.
- "reasoning" is one or two short sentences explaining your choice in plain language a patient can understand. Do NOT give a diagnosis or medical advice — only explain which type of doctor is best suited.

Return ONLY valid JSON in this exact shape:
{"specialty": "<one from the list>", "confidence": <0-1>, "reasoning": "<short explanation>"}`;

const triage = async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      message: "AI service is not configured on the server.",
    });
  }

  const { symptoms } = req.body;

  try {
    const groqRes = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: symptoms },
          ],
        }),
      },
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq API error:", groqRes.status, errText);
      return res.status(502).json({
        message: "AI service returned an error. Please try again.",
      });
    }

    const data = await groqRes.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(502).json({
        message: "AI service returned an empty response.",
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({
        message: "AI service returned malformed JSON.",
      });
    }

    const specialty = SPECIALTIES.includes(parsed.specialty)
      ? parsed.specialty
      : "General Practitioner";
    const confidence =
      typeof parsed.confidence === "number" &&
      parsed.confidence >= 0 &&
      parsed.confidence <= 1
        ? parsed.confidence
        : 0.5;
    const reasoning =
      typeof parsed.reasoning === "string" && parsed.reasoning.trim().length > 0
        ? parsed.reasoning.trim()
        : "Based on the symptoms you described.";

    return res.status(200).json({ specialty, confidence, reasoning });
  } catch (err) {
    console.error("Triage controller error:", err);
    return res.status(500).json({
      message: "Server error while contacting the AI service.",
    });
  }
};

module.exports = { triage, SPECIALTIES };
