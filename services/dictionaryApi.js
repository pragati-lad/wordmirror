const BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export async function lookupWord(word) {
  const response = await fetch(`${BASE_URL}/${encodeURIComponent(word.trim().toLowerCase())}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Word not found. Check spelling and try again.');
    }
    throw new Error('Failed to fetch word. Please try again.');
  }

  const data = await response.json();
  return parseWordData(data[0]);
}

function parseWordData(entry) {
  const word = entry.word;
  const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || '';
  const audioUrl = entry.phonetics?.find(p => p.audio)?.audio || '';

  const meanings = entry.meanings.map(meaning => ({
    partOfSpeech: meaning.partOfSpeech,
    definitions: meaning.definitions.slice(0, 3).map(def => ({
      definition: def.definition,
      example: def.example || null,
      synonyms: def.synonyms?.slice(0, 5) || [],
    })),
    synonyms: meaning.synonyms?.slice(0, 5) || [],
    antonyms: meaning.antonyms?.slice(0, 5) || [],
  }));

  return { word, phonetic, audioUrl, meanings };
}
