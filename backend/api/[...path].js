import {toNodeHandler} from 'better-auth/node';
import {runtimeHandler} from '../src/runtime.js';
export default toNodeHandler(runtimeHandler);
export const config = { api: { bodyParser: false } };
