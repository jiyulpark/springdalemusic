import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const file = req.body.file;
  const fileName = `uploads/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("uploads")
    .upload(fileName, file, { contentType: file.type });

  if (error) return res.status(500).json({ error: error.message });

  const { publicUrl } = supabase.storage.from("uploads").getPublicUrl(fileName);
  res.status(200).json({ url: publicUrl });
}
