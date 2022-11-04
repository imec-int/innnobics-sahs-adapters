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
  // const viewPort = await pagesContent[0].getViewport({});
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

const isDuration = (s) => /\d:\d\d/.test(s);

const isNumeric = (str) => {
  if (typeof str !== 'string') {
    return false;
  }

  // For some reason node is configured to see hh:mm as valid numbers.
  // That might be the case in certain scenario's, but it is certainly
  // not the case in the pdf's we receive.
  // As a result, we verift explicitely that this is not a duration
  return !Number.isNaN(str) && !Number.isNaN(parseFloat(str)) && !isDuration(str);
};

const findFirstXNumbers = R.curry((n, arr) => R.reduceWhile((acc) => acc.length < n, (acc, x) => {
  if (isNumeric(x.str)) {
    return [...acc, x.str];
  }
  return acc;
}, [], arr));

const findFirstFourNumbers = findFirstXNumbers(4);
const findFirstThreeNumbers = findFirstXNumbers(3);

const findNextDuration = (index, arr) => {
  const duration = R.find((item) => isDuration(item.str), R.drop(index, arr));
  return toDuration(duration?.str);
};

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

const getNthItemStr = (i, items) => R.propOr(undefined, 'str', R.nth(i, items));

const startEndDurationBlock = (blockTitle, items) => {
  const i = findTextBlockIndex(blockTitle, items);

  return {
    start: i < 0 ? undefined : getNthItemStr(i + 2, items),
    end: i < 0 ? undefined : getNthItemStr(i + 4, items),
    duration: i < 0 ? undefined : toDuration(getNthItemStr(i + 6, items)),
  };
};

const takeFirstAfter = (label) => (items) => {
  const index = findTextBlockIndex(label, items);
  return index >= 0 ? R.propOr('', 'str', items[index + 1]).trim() : '';
};

const findNextNNumbers = R.curry((n, index, arr) => {
  if (index < 0) {
    return [undefined] * n;
  }

  return findFirstXNumbers(n)(R.drop(index, arr));
});

const findNext4Numbers = findNextNNumbers(4);
const findNext3Numbers = findNextNNumbers(3);
const findNext2Numbers = findNextNNumbers(2);
const findNextNumber = R.pipe(findNextNNumbers(1), R.nth(0));

const sortByPage = (i1, i2) => i1.page - i2.page;
const sortTopToBottom = (i1, i2) => Math.round(i2.transform[5]) - Math.round(i1.transform[5]);
const sortLeftToRight = (i1, i2) => i1.transform[4] - i2.transform[4];

const sortItemsLeftToRight = R.pipe(
  R.filter((i) => i.height > 0 && i.width > 0),
  R.sortWith([sortByPage, sortTopToBottom, sortLeftToRight]),
);

function findGender(dictionary) {
  const { labels } = dictionary;
  const translateGender = (value) => dictionary.translateGender(value);
  const title = labels.GENDER;

  return function findInItems(items) {
    return R.pipe(takeTitledFieldValue(title), translateGender)(items);
  };
}

module.exports = {
  findTextBlockIndex,
  extractTextBlocks,
  takeSecondPartOfString,
  takeTitledFieldValue,
  extractHorizontalFields,
  horizontalRowField,
  startEndDurationRow: startEndDurationBlock,
  takeFirstAfter,
  concatUntilText,
  take,
  takeStr,
  mapDuration,
  findNextDuration,
  findNext4Numbers,
  findNext3Numbers,
  findNext2Numbers,
  findNextNumber,
  sortItemsLeftToRight,
  findGender,
};
