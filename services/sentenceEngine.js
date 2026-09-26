import { templates } from '../data/sentenceTemplates';

export function generateSentences(word, partOfSpeech, userProfile) {
  const pos = partOfSpeech?.toLowerCase() || 'default';
  const templateList = templates[pos] || templates.default;

  const profile = {
    name: userProfile?.name || 'Someone',
    hobby: pickRandom(userProfile?.hobbies) || 'reading',
    interest: pickRandom(userProfile?.interests) || 'technology',
    profession: userProfile?.profession || 'professional',
  };

  const shuffled = [...templateList].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  return selected.map(template => fillTemplate(template, word, profile));
}

function fillTemplate(template, word, profile) {
  return template
    .replace(/\{word\}/g, word)
    .replace(/\{name\}/g, profile.name)
    .replace(/\{hobby\}/g, profile.hobby)
    .replace(/\{interest\}/g, profile.interest)
    .replace(/\{profession\}/g, profile.profession);
}

function pickRandom(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
