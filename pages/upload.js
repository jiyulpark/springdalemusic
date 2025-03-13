import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("파일을 선택하세요!");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      alert(`업로드 성공! 파일 URL: ${data.url}`);
    } else {
      alert("업로드 실패!");
    }
  };

  return (
    <div>
      <h1>파일 업로드</h1>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload}>업로드</button>
    </div>
  );
}
