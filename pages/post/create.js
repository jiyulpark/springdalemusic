import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase"; // Supabase 클라이언트 import

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [file, setFile] = useState(null);
  const [hashtags, setHashtags] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 썸네일 업로드
      let thumbnailUrl = "";
      if (thumbnail) {
        const { data, error: uploadError } = await supabase.storage
          .from("uploads")
          .upload(`thumbnails/${Date.now()}_${thumbnail.name}`, thumbnail);

        if (uploadError) throw uploadError;
        thumbnailUrl = data?.path;
      }

      // 첨부파일 업로드
      let fileUrl = "";
      if (file) {
        const { data, error: uploadFileError } = await supabase.storage
          .from("uploads")
          .upload(`files/${Date.now()}_${file.name}`, file);

        if (uploadFileError) throw uploadFileError;
        fileUrl = data?.path;
      }

      // 게시글 저장
      const { error } = await supabase
        .from("posts")
        .insert([
          {
            title,
            content,
            thumbnail_url: thumbnailUrl,
            file_url: fileUrl,
            hashtags,
            user_id: supabase.auth.user().id, // 로그인된 사용자의 ID
          },
        ]);

      if (error) throw error;
      router.push("/"); // 게시글 작성 후 메인 화면으로 리디렉션
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>게시글 작성</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">제목</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="thumbnail">썸네일 이미지</label>
          <input
            type="file"
            id="thumbnail"
            onChange={(e) => setThumbnail(e.target.files[0])}
          />
        </div>
        <div>
          <label htmlFor="content">본문 내용</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          ></textarea>
        </div>
        <div>
          <label htmlFor="file">첨부파일</label>
          <input
            type="file"
            id="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        <div>
          <label htmlFor="hashtags">해시태그</label>
          <input
            type="text"
            id="hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="쉼표로 구분하여 입력"
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "게시글 작성"}
        </button>
      </form>
    </div>
  );
}
