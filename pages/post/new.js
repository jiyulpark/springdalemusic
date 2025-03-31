import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

const NewPost = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [files, setFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [downloadPermission, setDownloadPermission] = useState('verified_user');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const allowedExtensions = ['wav', 'am2data', 'am3data', 'am2', 'zip'];

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error) setCategories(data);
    };
    fetchCategories();
  }, []);

  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((catId) => catId !== id) : [...prev, id]
    );
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    const invalid = selected.filter(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      return !allowedExtensions.includes(ext);
    });
    if (invalid.length > 0) {
      alert('허용된 확장자: WAV, AM2DATA, AM3DATA, AM2, ZIP');
      return;
    }
    setFiles(selected);
  };

  const handleThumbnailChange = (e) => {
    setThumbnail(e.target.files[0]);
  };

  const handleCreatePost = async () => {
    setLoading(true);
    setErrorMsg('');

    if (!title || !content) {
      setErrorMsg('제목과 내용을 입력해주세요!');
      setLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('로그인이 필요합니다.');
      }

      console.log('👤 현재 사용자:', session.user.id);

      // 썸네일 업로드
      let thumbnailUrl = null;
      if (thumbnail) {
        const thumbPath = `thumbnails/${Date.now()}_${thumbnail.name}`;
        const { data, error } = await supabase.storage.from('thumbnails').upload(thumbPath, thumbnail);
        if (error) throw error;
        thumbnailUrl = data.path;
      }

      // 게시글 생성
      const { data: newPost, error: postError } = await supabase
        .from('posts')
        .insert([{
          title,
          content,
          user_id: session.user.id,
          thumbnail_url: thumbnailUrl,
          file_urls: [], // 나중에 업데이트
          category_ids: selectedCategories,
          download_permission: downloadPermission,
          downloads: 0,
          likes: 0
        }])
        .select()
        .single();

      if (postError) {
        console.error('❌ 게시글 생성 실패:', postError);
        throw postError;
      }

      console.log('✅ 게시글 생성 성공:', newPost.id);

      const uploadedFileUrls = [];

      // 파일 업로드 + files 테이블 저장
      for (const file of files) {
        const path = `uploads/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('uploads').upload(path, file);
        if (error) throw error;

        uploadedFileUrls.push({ file_url: path, file_name: file.name });

        await supabase.from('files').insert([{
          post_id: newPost.id,
          file_url: path,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        }]);
      }

      // 게시글에 파일 URL 업데이트
      if (uploadedFileUrls.length > 0) {
        await supabase.from('posts')
          .update({ file_urls: uploadedFileUrls })
          .eq('id', newPost.id);
      }

      router.push(`/post/${newPost.id}`);
    } catch (err) {
      console.error('❌ 게시글 작성 오류:', err.message);
      setErrorMsg(`게시글 작성 중 오류: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const radioOptions = [
    { value: 'verified_user', label: '인증 유저만 다운로드 가능' },
    { value: 'user', label: '일반 유저 이상만 다운로드 가능' },
    { value: 'guest', label: '비회원도 다운로드 가능' },
  ];

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px' }}>
      <h1>새 게시글 작성</h1>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      <input placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: 10, marginBottom: 10 }} />
      <textarea placeholder="내용" value={content} onChange={(e) => setContent(e.target.value)} style={{ width: '100%', height: 120, padding: 10, marginBottom: 10 }} />

      <h4>썸네일 업로드</h4>
      <input type="file" accept="image/*" onChange={handleThumbnailChange} />

      <h4>파일 업로드</h4>
      <input type="file" multiple onChange={handleFileChange} />

      <h4>스타일 선택</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 10 }}>
        {categories.filter(c => c.type === 'style').map(c => (
          <button key={c.id} onClick={() => toggleCategory(c.id)} style={{
            padding: 8,
            background: selectedCategories.includes(c.id) ? '#007bff' : '#ddd',
            color: selectedCategories.includes(c.id) ? '#fff' : '#000',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}>{c.name}</button>
        ))}
      </div>

      <h4>타입 선택</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 10 }}>
        {categories.filter(c => c.type === 'type').map(c => (
          <button key={c.id} onClick={() => toggleCategory(c.id)} style={{
            padding: 8,
            background: selectedCategories.includes(c.id) ? '#007bff' : '#ddd',
            color: selectedCategories.includes(c.id) ? '#fff' : '#000',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
          }}>{c.name}</button>
        ))}
      </div>

      <h4>다운로드 권한</h4>
      {radioOptions.map((opt) => (
        <label key={opt.value} style={{ display: 'block', marginBottom: '5px' }}>
          <input
            type="radio"
            name="downloadPermission"
            value={opt.value}
            checked={downloadPermission === opt.value}
            onChange={() => setDownloadPermission(opt.value)}
          /> {opt.label}
        </label>
      ))}

      <button onClick={handleCreatePost} disabled={loading} style={{
        padding: '10px 20px',
        background: '#28a745',
        color: '#fff',
        border: 'none',
        borderRadius: '5px',
        marginTop: 20,
        cursor: 'pointer'
      }}>
        {loading ? '작성 중...' : '게시글 작성'}
      </button>
    </div>
  );
};

export default NewPost;
