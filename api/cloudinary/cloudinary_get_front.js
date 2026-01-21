import {
  configureCloudinary,
  listNotebookFolders,
  listResourcesByAssetFolder
} from './cloudinary_get_shared.js';

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configResult = configureCloudinary();
  if (!configResult.ok) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: configResult.message
    });
  }

  try {
    const maxResultsParam =
      typeof req.query?.max_results === 'string' ? Number(req.query.max_results) : 20;
    const nextCursorParam =
      typeof req.query?.next_cursor === 'string' ? req.query.next_cursor : null;

    const folders = await listNotebookFolders();
    const coverImages = await listResourcesByAssetFolder({
      assetFolder: 'Notebooks/Cover/Front',
      maxResults: maxResultsParam,
      nextCursor: nextCursorParam,
      resourceType: 'image'
    });

    return res.status(200).json({
      folder: 'Notebooks/Cover/Front',
      folders: folders.folders || [],
      resources: coverImages.resources || [],
      next_cursor: coverImages.next_cursor || null
    });
  } catch (error) {
    console.error('Cloudinary API error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
