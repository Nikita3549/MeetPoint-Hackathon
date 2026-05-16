import 'reflect-metadata';

process.env.DOTENV_CONFIG_QUIET = 'true';

import { loadE2eEnv } from './helpers/load-env';

loadE2eEnv();
