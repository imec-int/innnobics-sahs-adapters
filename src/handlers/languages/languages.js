const { findTextBlockIndex } = require('../pdf');

const ENGLISH = 'english';
const ENGLISH_LABELS = require('./english');

const PORTUGUESE = 'portuguese';
const PORTUGESE_LABELS = require('./portuguese');

const SPANISH = 'spanish';
const SPANISH_LABELS = require('./spanish');

const CATALAN = 'catalan';
const CATALAN_LABELS = require('./catalan');

const LANGUAGES = [
  { name: ENGLISH, labels: ENGLISH_LABELS },
  { name: PORTUGUESE, labels: PORTUGESE_LABELS },
  { name: SPANISH, labels: SPANISH_LABELS },
  { name: CATALAN, labels: CATALAN_LABELS },
];

const determineLanguage = (textBlocks) => {
  const language = LANGUAGES.find((l) => {
    // search recording details. It is one of those unique values
    const index = findTextBlockIndex(l.labels.RECORDING_DETAILS, textBlocks);
    return index >= 0;
  });

  return language?.name || undefined;
};

const getDictionary = (language) => LANGUAGES.find((lang) => lang.name === language) || getDictionary(ENGLISH);

module.exports = { determineLanguage, getDictionary };
