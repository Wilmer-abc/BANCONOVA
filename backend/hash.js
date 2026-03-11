const bcrypt = require('bcryptjs');

bcrypt.hash('BancoNOVA7.', 10).then(hash => {
  console.log(hash);
});
