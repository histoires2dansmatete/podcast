import { data, writeDrafts } from './stories.mjs';
await writeDrafts(await data());
