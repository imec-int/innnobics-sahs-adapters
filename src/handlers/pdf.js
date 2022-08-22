const R = require('ramda');
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

module.exports = { findTextBlockIndex, findFirstFourNumbers, findNextDuration };
