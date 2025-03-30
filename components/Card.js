import { useRouter } from 'next/router';
import { useState } from 'react';

export default function Card({ post, userRole }) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (fileUrl, fileName) => {
    if (downloading) return;
    setDownloading(true);

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supabaseAccessToken')}`,
        },
        body: JSON.stringify({ postId: post.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || '다운로드에 실패했습니다.');
        setDownloading(false);
        return;
      }

      // 🔽 파일 다운로드
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      link.click();
    } catch (err) {
      alert('서버 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  // 👁️ 권한 표시용 뱃지
  const getPermissionBadge = () => {
    switch (post.download_permission) {
      case 'admin':
        return <span style={{ color: 'red', fontWeight: 'bold' }}>관리자 전용 🔒</span>;
      case 'verified_user':
        return <span style={{ color: 'orange', fontWeight: 'bold' }}>인증회원 전용 🔒</span>;
      case 'user':
        return <span style={{ color: 'green', fontWeight: 'bold' }}>회원 전용 🔒</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: 16, marginBottom: 16 }}>
      <h3
        onClick={() => router.push(`/post/${post.id}`)}
        style={{ cursor: 'pointer', marginBottom: 8 }}
      >
        {post.title}
      </h3>

      <p>다운로드 수: {post.downloads}</p>
      <p>다운로드 권한: {getPermissionBadge()}</p>

      {post.file_urls && post.file_urls.length > 0 && (
        <div>
          {post.file_urls.map((fileUrl, idx) => (
            <div key={idx} style={{ marginTop: 8 }}>
              <button
                disabled={downloading}
                onClick={() => handleDownload(fileUrl, `file-${idx + 1}`)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#0070f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {downloading ? '다운로드 중...' : `파일 ${idx + 1} 다운로드`}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
