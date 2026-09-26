import { BARRON_WORDS } from "../data/barronWords";

const PROVIDERS = {
  groq: {
    name: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
  openai: {
    name: "OpenAI",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  together: {
    name: "Together AI",
    url: "https://api.together.xyz/v1/chat/completions",
    model: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  },
};

function getProvider(providerKey) {
  return PROVIDERS[providerKey] || PROVIDERS.groq;
}

function detectProvider(apiKey) {
  if (!apiKey) return "groq";
  if (apiKey.startsWith("gsk_")) return "groq";
  if (apiKey.startsWith("sk-")) return "openai";
  return "groq";
}

async function callLLM(apiKey, systemPrompt, userPrompt, providerKey) {
  const resolved = providerKey || detectProvider(apiKey);
  const provider = getProvider(resolved);

  const response = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));

    if (response.status === 401) {
      throw new Error(
        `Invalid API key. Please check your ${provider.name} API key in Profile settings.`
      );
    }

    if (response.status === 429) {
      throw new Error("API rate limit reached. Please try again in a moment.");
    }

    throw new Error(
      err.error?.message || "Failed to generate response. Please try again."
    );
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("No response from AI.");
  }

  const cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
}

export { PROVIDERS };

export async function generateDailyWords(
  apiKey,
  userProfile,
  targetWords,
  providerKey
) {
  const profile = {
    name: userProfile?.name || "the user",
    interests: userProfile?.interests?.join(", ") || "general topics",
    hobbies: userProfile?.hobbies?.join(", ") || "reading",
    profession: userProfile?.profession || "professional",
  };

  // pick 3 Barron words
  const wordCount = 3;
  const selectedWords = [];

  while (selectedWords.length < wordCount) {
    const word =
      BARRON_WORDS[Math.floor(Math.random() * BARRON_WORDS.length)];

    if (!selectedWords.includes(word)) {
      selectedWords.push(word);
    }
  }

  console.log("Today's words:", selectedWords);

  const prompt = `Generate vocabulary information for EXACTLY these words:

${selectedWords.join(", ")}

IMPORTANT RULES:
- You MUST use these exact words.
- Do NOT replace them with synonyms.
- Do NOT generate different words.
- Return information only for these words.

For each word provide:

- word
- phonetic pronunciation
- meanings (partOfSpeech, definitions with examples)
- synonyms (max 5)
- antonyms (max 5)
- 2 personalized example sentences

User profile:
Name: ${profile.name}
Interests: ${profile.interests}
Hobbies: ${profile.hobbies}
Profession: ${profile.profession}

Respond ONLY with JSON in this format:

{
 "words":[
  {
   "word":"example",
   "phonetic":"/ɪɡˈzæmpəl/",
   "meanings":[
    {
     "partOfSpeech":"noun",
     "definitions":[
      {"definition":"...","example":"..."}
     ],
     "synonyms":["..."],
     "antonyms":["..."]
    }
   ],
   "personalizedSentences":["...","..."]
  }
 ]
}`;

  const parsed = await callLLM(
    apiKey,
    "You are a vocabulary tutor. Always respond with valid JSON only.",
    prompt,
    providerKey
  );

  return parsed.words;
}

export async function getWordDetails(apiKey, word, userProfile, providerKey) {
  const profile = {
    name: userProfile?.name || "the user",
    interests: userProfile?.interests?.join(", ") || "general topics",
    hobbies: userProfile?.hobbies?.join(", ") || "reading",
    profession: userProfile?.profession || "professional",
  };

  const prompt = `Give detailed vocabulary information about the word "${word}".

Provide:

- phonetic pronunciation
- meanings
- definitions with examples
- synonyms (max 5)
- antonyms (max 5)
- 2 personalized example sentences

User profile:
Name: ${profile.name}
Interests: ${profile.interests}
Hobbies: ${profile.hobbies}
Profession: ${profile.profession}

Respond ONLY with JSON:

{
  "word":"${word}",
  "phonetic":"...",
  "meanings":[],
  "personalizedSentences":[]
}`;

  return await callLLM(
    apiKey,
    "You are a vocabulary tutor. Respond with JSON only.",
    prompt,
    providerKey
  );
}