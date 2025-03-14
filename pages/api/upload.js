import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  // ✅ POST 요청만 처리
  if (req.method !== "POST") return res.status(405).end();

  const file = req.body.file;  // 요청에서 파일 받기
  const fileName = `uploads/${Date.now()}-${file.name}`;  // 파일 이름 지정

  // ✅ Supabase에 파일 업로드 (data 제거)
  const { error } = await supabase.storage
    .from("uploads")
    .upload(fileName, file, { contentType: file.type });

  // ✅ 업로드 중 오류가 발생하면 에러 메시지 반환
  if (error) return res.status(500).json({ error: error.message });

  // ✅ 파일의 공개 URL을 반환
  const { publicUrl } = supabase.storage.from("uploads").getPublicUrl(fileName);
  res.status(200).json({ url: publicUrl });
}
