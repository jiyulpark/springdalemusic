import { supabase } from "../../lib/supabase";
import nextConnect from "next-connect";
import formidable from "formidable";

export const config = {
  api: {
    bodyParser: false, // ❌ bodyParser 사용 안 함 (파일 업로드 시 필요)
  },
};

const handler = nextConnect();

handler.post(async (req, res) => {
  // ✅ formidable을 사용하여 파일 파싱
  const form = new formidable.IncomingForm();
  form.uploadDir = "/tmp"; // 임시 저장 경로
  form.keepExtensions = true;

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("파일 파싱 오류:", err);
      return res.status(500).json({ error: "파일 업로드 실패" });
    }

    const file = files.file; // 업로드된 파일
    if (!file) {
      return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
    }

    const fileName = `uploads/${Date.now()}-${file.originalFilename}`;
    
    // ✅ Supabase에 파일 업로드
    const { error } = await supabase.storage
      .from("uploads")
      .upload(fileName, file.filepath, { contentType: file.mimetype });

    if (error) {
      console.error("Supabase 업로드 오류:", error.message);
      return res.status(500).json({ error: "파일 업로드 실패" });
    }

    // ✅ 업로드된 파일의 공개 URL 가져오기
    const { data } = supabase.storage.from("uploads").getPublicUrl(fileName);

    res.status(200).json({ url: data.publicUrl });
  });
});

export default handler;
