const R = require('ramda');
const { findTextBlockIndex } = require('../../pdf');

const ENGLISH = 'english';
const ENGLISH_LABELS = require('./english');

const PORTUGUESE = 'portuguese';
const PORTUGESE_LABELS = require('./portuguese');

const SPANISH = 'spanish';
const SPANISH_LABELS = require('./spanish');

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
    translateDaysLabel: function _translate(s) {
      return s;
    },
  },
  {
    name: PORTUGUESE,
    labels: PORTUGESE_LABELS,
    translateGender: genderTranslator({ male: 'masculino', female: 'feminino' }),
    translateDaysLabel: function _translate(s) {
      return R.pipe(
        R.replace(/dias/ig, 'days'),
        R.replace(/dia/ig, 'day'),
        R.replace(/horas/ig, 'hours'),
        R.replace(/hora/ig, 'hour'),
        R.replace(/minutos/ig, 'minutes'),
        R.replace(/minuto/ig, 'minute'),
      )(s);
    },
  },
  {
    name: SPANISH,
    labels: SPANISH_LABELS,
    translateGender: genderTranslator({ male: 'hombre', female: 'mujer' }),
    translateDaysLabel: function _translate(s) {
      return R.pipe(
        R.replace(/días/ig, 'days'),
        R.replace(/día/ig, 'day'),
        R.replace(/horas/ig, 'hours'),
        R.replace(/hora/ig, 'hour'),
        R.replace(/minutos/ig, 'minutes'),
        R.replace(/minuto/ig, 'minute'),
      )(s);
    },
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
