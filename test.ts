import * as bcrypt from 'bcrypt';

bcrypt.hash('password123', 10).then((value) => console.log(value));
