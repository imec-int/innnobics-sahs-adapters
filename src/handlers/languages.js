const { findTextBlockIndex } = require('./pdf');

const ENGLISH = 'english';
const PORTUGUESE = 'portuguese';

const ENGLISH_LABELS = {
  PATIENT_ID: 'Patient ID',
  DOB: 'DOB',
  AGE: 'Age',
  GENDER: 'Gender',
  BMI: 'BMI',
  RECORDING_DETAILS: 'Recording details',
  DEVICE: 'Device',
  RECORDING: 'Recording',
  START: 'Start',
  END: 'End',
  DURATION_HR: 'Duration - hr',
  MONITORING_TIME_FLOW: 'Monitoring time (flow)',
  FLOW_EVALUATION: 'Flow evaluation',
  OXYGEN_SATURATION_EVALUATION: 'Oxygen saturation evaluation',
  EVENTS_INDEX: 'Events index',
  REI_AHI: 'REI (AHI)',
  AI: 'AI',
  HI: 'HI',
  SUPINE: 'Supine',
  TIME_HR: 'Time - hr',
  PERCENTAGE: 'Percentage',
  SUPINE_AI: 'Supine AI',
  SUPINE_HI: 'Supine HI',
  NON_SUPINE: 'Non-supine',
  UPRIGHT: 'Upright',
  EVENTS_TOTAL: 'Events totals',
  APNEA_INDEX: 'Apnea Index',
  APNEAS: 'Apneas',
  HYPOPNEAS: 'Hypopneas',
  CHEYNE_STOKES: 'Cheyne-Stokes respiration',
  OBSTRUCTIVE: 'Obstructive',
  CENTRAL: 'Central',
  MIXED: 'Mixed',
  UNCLASSIFIED: 'Unclassified',
  OXYGEN_DESATURATION: 'Oxygen desaturation',
  ODI: 'ODI',
  TOTAL: 'Total',
  AVG_PER_MINUTE: 'Avg/min',
  SNORES: 'Snores',
  MINIMUM: 'Min',
  MAXIMUM: 'Max',
  BASELINE: 'Baseline',
  AVERAGE: 'Avg',
  LOWEST: 'Lowest',
  OXYGEN_SATURATION_PERCENTAGE: 'Oxygen saturation %',
  OXYGEN_SATURATION_EVAL_TIME_PERCENTAGE: 'Oxygen saturation - eval time %',
  BREATHS: 'Breaths',
  PULSE_BPM: 'Pulse - bpm',
  ANALYSIS_GUIDELINES: 'Analysis guidelines:',
  EQ_OR_LESS_THAN_90_SAT: '<=90%sat',
  EQ_OR_LESS_THAN_85_SAT: '<=85%sat',
  EQ_OR_LESS_THAN_80_SAT: '<=80%sat',
  EQ_OR_LESS_THAN_88_SAT: '<=88%sat',
  EQ_OR_LESS_THAN_88_TIME_HR: '<=88%Time - hr',
  INTERPRETATION: 'Interpretation',
  PRINTED_ON: 'Printed on',
};

const PORTUGESE_LABELS = {
  PATIENT_ID: 'ID Paciente',
  DOB: 'Data Nascimento',
  AGE: 'Idade',
  GENDER: 'Sexo',
  BMI: 'IMC',
  RECORDING_DETAILS: 'A gravar detalhes',
  DEVICE: 'Dispositivo',
  RECORDING: 'A gravar',
  START: 'Início',
  END: 'Fim',
  DURATION_HR: 'Duração',
  MONITORING_TIME_FLOW: 'Avaliação do fluxo',
  FLOW_EVALUATION: 'Flow evaluation',
  OXYGEN_SATURATION_EVALUATION: 'Aval. satur. Oxigénio',
  EVENTS_INDEX: 'Índice de eventos',
  REI_AHI: 'IAH',
  AI: 'IA',
  HI: 'IH',
  SUPINE: 'Decúbito dorsal',
  TIME_HR: 'Tempo — h',
  PERCENTAGE: 'Percentagem',
  NON_SUPINE: 'Decúbito ventral',
  UPRIGHT: 'Vertical',
  EVENTS_TOTAL: 'Eventos totais',
  APNEAS: 'Apneias',
  HYPOPNEAS: 'Hipopneias',
  APNEA_INDEX: 'Índice de apneia',
  CHEYNE_STOKES: 'Cheyne-Stokes',
  OBSTRUCTIVE: 'Obstrutiva',
  CENTRAL: 'Central',
  MIXED: 'Mista',
  UNCLASSIFIED: 'Não classificado',
  OXYGEN_DESATURATION: 'Dessaturação de oxigénio',
  ODI: 'IDO',
  TOTAL: 'Total',
  AVERAGE: 'Méd.',
  BASELINE: 'Valor inicial',
  LOWEST: 'Mais baixo',
  OXYGEN_SATURATION_PERCENTAGE: '% saturação de oxigénio',
  OXYGEN_SATURATION_EVAL_TIME_PERCENTAGE: 'Satur. oxigénio — % tempo aval. Sat.',
  BREATHS: 'Respirações',
  PULSE_BPM: 'Pulso — bpm',
  ANALYSIS_GUIDELINES: 'Orient. análise',
  EQ_OR_LESS_THAN_90_SAT: 'Sat. <=90%',
  EQ_OR_LESS_THAN_85_SAT: 'Sat. <=85%',
  EQ_OR_LESS_THAN_80_SAT: 'Sat. <=80%',
  EQ_OR_LESS_THAN_88_SAT: 'Sat. <=88%',
  EQ_OR_LESS_THAN_88_TIME_HR: 'Tempo <=88%-h',
  AVG_PER_MINUTE: 'Méd./min',
  SNORES: 'Ressonar',
  MINIMUM: 'Mín.',
  MAXIMUM: 'Máx.',
  INTERPRETATION: 'Interpretação',
  PRINTED_ON: 'Impresso em',
};

const LANGUAGES = [
  { name: ENGLISH, labels: ENGLISH_LABELS },
  { name: PORTUGUESE, labels: PORTUGESE_LABELS },
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
