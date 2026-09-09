import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (
      (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'ERR_UNSUPPORTED_DIR_IMPORT') &&
      (specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/'))
    ) {
      const parentUrl = context.parentURL ? new URL(context.parentURL) : null;
      if (parentUrl && parentUrl.protocol === 'file:') {
        const parentDir = path.dirname(fileURLToPath(parentUrl));
        const resolvedPath = path.resolve(parentDir, specifier);

        // 1. Check direct .js file
        if (fs.existsSync(`${resolvedPath}.js`)) {
          return nextResolve(pathToFileURL(`${resolvedPath}.js`).href, context);
        }

        // 2. Check directory index.js
        const indexPath = path.join(resolvedPath, 'index.js');
        if (fs.existsSync(indexPath)) {
          return nextResolve(pathToFileURL(indexPath).href, context);
        }

        // 3. Check .json file
        if (fs.existsSync(`${resolvedPath}.json`)) {
          return nextResolve(pathToFileURL(`${resolvedPath}.json`).href, context);
        }
      }
    }
    throw err;
  }
}
