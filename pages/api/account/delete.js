export const config = { api: { bodyParser: true } };
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  return res.status(204).end();
} 