const ejsonStrict = require('mongodb-extended-json/lib/modes/strict.js');

ejsonStrict.serialize.Date = function(v) {
  v = isNaN(Number(v)) ? 'NaN' : v.toISOString();
  return { $date: v };
};
