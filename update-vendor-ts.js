const fs = require('fs');
const path = 'D:/fair-marketplace/backend/src/routes/vendor.ts';
let content = fs.readFileSync(path, 'utf8');

// Add panorama360Url to vendorHouse select
content = content.replace(
  /description: true,\n          },\n        },\n        application: {/,
  `description: true,
            panorama360Url: true,
          },
        },
        application: {`
);

// Add housePanorama360Url to formattedBookings
content = content.replace(
  /houseDescription: booking\.vendorHouse\.description,\n      \/\/ Application info/,
  `houseDescription: booking.vendorHouse.description,
      housePanorama360Url: booking.vendorHouse.panorama360Url,
      // Application info`
);

fs.writeFileSync(path, content);
console.log('File updated successfully');
