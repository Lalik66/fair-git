const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'houses.json'), 'utf8'));
data.houses.forEach(h => {
  const cat = h.vendor ? h.vendor.productCategory : 'none';
  console.log(h.houseNumber + ' | avail: ' + h.isAvailable + ' | cat: ' + cat);
});
