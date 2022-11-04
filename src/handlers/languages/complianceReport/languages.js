const { findTextBlockIndex } = require('../../pdf');

const ENGLISH = 'english';
const ENGLISH_LABELS = require('./english');

const PORTUGUESE = 'portuguese';
const PORTUGESE_LABELS = require('./portuguese');

const SPANISH = 'spanish';
const SPANISH_LABELS = require('./spanish');

const CATALAN = 'catalan';
const CATALAN_LABELS = require('./catalan');

const genderTranslator = (dict) => (str) => {
  if (str?.toLowerCase().includes(dict.female)) {
    return 'Female';
  } if (str?.toLowerCase().includes(dict.male)) {
    return 'Male';
  }
  return `Unknown (${str})`;
};

const LANGUAGES = [
  {
    name: ENGLISH,
    labels: ENGLISH_LABELS,
    translateGender: genderTranslator({ male: 'male', female: 'female' }),
  },
  {
    name: PORTUGUESE,
    labels: PORTUGESE_LABELS,
    translateGender: genderTranslator({ male: 'masculino', female: 'feminino' }),
  },
  {
    name: SPANISH,
    labels: SPANISH_LABELS,
    translateGender: genderTranslator({ male: 'hombre', female: 'mujer' }),
  },
  {
    name: CATALAN,
    labels: CATALAN_LABELS,
    translateGender: genderTranslator({ male: 'hombre', female: 'mujer' }),
  },
];

const determineLanguage = (textBlocks) => {
  const language = LANGUAGES.find((l) => {
    // search recording details. It is one of those unique values
    const index = findTextBlockIndex(l.labels.REPORT_TITLE, textBlocks);
    return index >= 0;
  });

  return language?.name || undefined;
};

const getDictionary = (language) => LANGUAGES.find((lang) => lang.name === language) || getDictionary(ENGLISH);

module.exports = { determineLanguage, getDictionary };
