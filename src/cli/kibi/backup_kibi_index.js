import moment from 'moment';
import Promise from 'bluebird';
import { appendFile, access } from 'fs';
import { join } from 'path';

/**
 * backupKibiIndex writes all the objects saved into the kibi index into a timestamped-file inside the toDir folder.
 *
 * @param server the kibi server
 * @param toDir the path to the folder to write to
 * @returns the name of the backup file
 */
export default async function backupKibiIndex(server, toDir) {
  const kbnIndex = server.config().get('kibana.index');
  const client = server.plugins.elasticsearch.getCluster('admin').getClient();

  let dirExists = false;
  try {
    await Promise.fromNode(cb => access(toDir, cb));
    dirExists = true;
  } catch (err) {
    // ignore
  }
  if (!dirExists) {
    throw new Error(`Folder [${toDir}] does not exist`);
  }

  const toFile = join(toDir, `backup-${moment().format('YYYY-MM-DD')}.json`);
  let fileExists = false;
  try {
    await Promise.fromNode(cb => access(toFile, cb));
    fileExists = true;
  } catch (err) {
    // ignore
  }
  if (fileExists) {
    throw new Error(`Cannot backup to [${toFile}] since that file already exists`);
  }

  const searchTillDone = async function (res) {
    if (!res.hits.hits.length) {
      server.log(['info', 'backup'], `Backed Kibi index to [${toFile}]`);
      return toFile;
    }

    let data = '';
    for (const hit of res.hits.hits) {
      data += JSON.stringify(hit) + '\n';
    }
    await Promise.fromNode(cb => appendFile(toFile, data, cb));
    server.log(['info', 'backup'], `Backed ${res.hits.hits.length} objects`);
    const next = await client.scroll({ scrollId: res._scroll_id, scroll: '1m' });
    return await searchTillDone(next);
  };

  const res = await client.search({
    index: kbnIndex,
    scroll: '1m',
    size: 100
  });

  server.log(['info', 'backup'], `There are ${res.hits.total} objects to backup from index ${kbnIndex}`);
  return await searchTillDone(res);
}
