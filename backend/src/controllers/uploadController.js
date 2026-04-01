import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGES = ['image/jpeg','image/png','image/gif','image/webp'];
const FILES  = ['application/pdf','text/plain','application/zip'];
const MAX    = 10 * 1024 * 1024;

export const uploadMedia = async (req, reply) => {
  const uid  = req.user.userId;
  const data = await req.file();
  if (!data) return reply.code(400).send({ error: 'No file' });

  const { mimetype, filename, file } = data;
  const isImage = IMAGES.includes(mimetype);
  const isGif   = mimetype === 'image/gif';

  if (!isImage && !FILES.includes(mimetype))
    return reply.code(400).send({ error: 'Unsupported file type' });

  const chunks = []; let size = 0;
  for await (const chunk of file) {
    size += chunk.length;
    if (size > MAX) return reply.code(413).send({ error: 'Max 10MB' });
    chunks.push(chunk);
  }

  const uploadOptions = {
    folder: `syncly/${uid}`,
    resource_type: isImage ? 'image' : 'raw',
    use_filename: true,
    unique_filename: true,
   
    ...(isGif && { format: 'gif' }),
  };

  const result = await new Promise((res, rej) => {
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (e, r) => e ? rej(e) : res(r)
    );
    stream.end(Buffer.concat(chunks));
  });

  let url = result.secure_url;
  if (isGif) {
    url = url.replace(/\.[^/.]+$/, '.gif');
  }

  return reply.send({
    url,
    publicId: result.public_id,
    type: isImage ? 'image' : 'file',
    name: filename,
    size,
    mimeType: mimetype,
    isAnimated: isGif,
  });
};