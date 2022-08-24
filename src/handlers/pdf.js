const R = require('ramda');
const logger = require('../tools/logger');

const take = (index) => (arr) => (index < 0 || index >= arr.length ? undefined : arr[index]);

const takeStr = (index) => (arr) => R.prop('str', take(index)(arr));

function toDuration(str) {
  return str ? str.padStart(5, '0') : str;
}

const mapDuration = R.curry((extractStringFn, items) => {
  const str = extractStringFn(items);
  return toDuration(str);
});

const trimEnd = R.curry((char, str) => {
  if (str && str.endsWith(char)) {
    return trimEnd(char, R.dropLast(1, str)); // recursively remove multiple char at the end
  }
  return str;
});

const concatUntil = (fn, index) => R.pipe(
  R.drop(index),
  R.takeWhile(R.complement(fn)),
  R.map(R.prop('str')),
  R.join(' '),
);

const concatUntilText = R.curry((limitText, index) => concatUntil((item) => R.trim(item.str).startsWith(limitText), index));

const takeSecondPartOfString = (index) => (arr) => R.pipe(
  take(index),
  R.propOr('', 'str'),
  R.split(':'),
  R.nth(1),
  R.defaultTo(''), // in case nothing is found, use a blank string
  R.trim,
)(arr);

const extractTextBlocks = (includedPages) => async (doc) => {
  const emptySpaceEntry = (item) => item.width === 0 && item.height === 0;

  logger.debug('Extracting text content');

  const validPages = R.intersection(R.range(1, doc.numPages + 1), includedPages);

  const pagesContent = await Promise.all(validPages.map((page) => doc.getPage(page)));
  const textBlocksContent = await Promise.all(pagesContent.map((pc) => pc.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  })));

  const addPageToItems = (promiseResult, index) => {
    const newItems = promiseResult.items.map(R.assoc('page', index + 1));
    return { ...promiseResult, items: newItems };
  };
  return textBlocksContent
    .map(addPageToItems)
    .map(R.prop('items'))
    .flat()
    .filter(R.complement(emptySpaceEntry));
};

/**
 * Searches for a specific text block based on the label in that text block.
 * It scans a list of text blocks and looks for the specified label or that label appended with ':'.
 * This function compares the value of the 'str' property to the label
 *
 * @param label The label
 * @param textBlocks the list of text blocks to look for
 * @returns the index in the list where that label is found, or -1 if none is found
 */
const findTextBlockIndex = (label, textBlocks) => textBlocks.findIndex((i) => {
  const value = i.str.trim();
  return value === label || value === `${label}:`;
});

const isNumeric = (str) => {
  if (typeof str !== 'string') {
    return false;
  }

  return !Number.isNaN(str) && !Number.isNaN(parseFloat(str));
};

const findFirstXNumbers = (n) => R.reduceWhile((acc) => acc.length < n, (acc, x) => {
  if (isNumeric(x.str)) {
    return [...acc, x.str];
  }
  return acc;
}, []);

const findFirstFourNumbers = findFirstXNumbers(4);

const findNextDuration = R.find((item) => /\d:\d\d/.test(item.str));

const takeTitledFieldValue = R.curry((title, items) => {
  const strPropStartsWith = R.pipe(R.prop('str'), R.toLower(), R.startsWith(`${R.toLower(title)}:`));

  const index = R.findIndex(strPropStartsWith, items);
  return takeSecondPartOfString(index)(items);
});

const extractHorizontalFields = (blockLabel, nextBlockLabel) => (items) => {
  const blockLabelItem = items.find((item) => item.str.startsWith(blockLabel));
  const nextBlockLabelItem = items.find((item) => item.str.startsWith(nextBlockLabel));

  if (!blockLabelItem || !nextBlockLabelItem) {
    return {};
  }

  const sortTopToBottom = (i1, i2) => Math.round(i2.transform[5]) - Math.round(i1.transform[5]);
  const sortLeftToRight = (i1, i2) => i1.transform[4] - i2.transform[4];

  const inBetweenY = (lowerY, upperY) => (item) => {
    const y = item.transform[5];
    return lowerY < y && y <= upperY;
  };

  return R.pipe(
    // find items in same horizontal row
    R.filter(inBetweenY(nextBlockLabelItem.transform[5], blockLabelItem.transform[5])),
    R.sortWith([sortTopToBottom, sortLeftToRight]), // sort from top to bottom, left to right
    R.filter((item) => item.str.trim() !== ''), // remove empty items
    (is) => (R.length(is) % 2 === 1 ? R.drop(1, is) : is), // remove block label if odd number of items
    R.map(R.prop('str')), // extract string values from all items
    R.map(trimEnd(':')), // remove the : at the end of the labels
    R.splitEvery(2), // split the array in smaller 2-object arrays
    R.fromPairs, // and create an object out of it
  )(items);
};

const horizontalRowField = (blockTitle, nextBlockTitle) => R.curry((label, items) => {
  const block = extractHorizontalFields(blockTitle, nextBlockTitle)(items);
  return block[label] || block[`${blockTitle} ${label}`];
});

const startEndDurationBlock = (blockTitle) => {
  const getStringAtOffset = R.curry((offset, items) => {
    const i = findTextBlockIndex(blockTitle, items);
    return i >= 0 ? R.propOr(undefined, 'str', R.nth(i + offset, items)) : undefined;
  });

  return {
    start: getStringAtOffset(2),
    end: getStringAtOffset(4),
    duration: mapDuration(getStringAtOffset(6)),
  };
};

const takeFirstAfter = (label) => (items) => {
  const index = findTextBlockIndex(label, items);
  return index >= 0 ? R.propOr('', 'str', items[index + 1]).trim() : '';
};

module.exports = {
  findTextBlockIndex,
  findFirstFourNumbers,
  findNextDuration,
  extractTextBlocks,
  takeSecondPartOfString,
  takeTitledFieldValue,
  extractHorizontalFields,
  horizontalRowField,
  startEndDurationBlock,
  toDuration,
  takeFirstAfter,
  concatUntilText,
  takeStr,
  mapDuration,
};
