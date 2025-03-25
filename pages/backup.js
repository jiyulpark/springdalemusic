import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

const NewPost = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState(null); // 썸네일 상태
  const [files, setFiles] = useState([]); // 파일 상태
  const [categories, setCategories] = useState([]); // 전체 카테고리 목록
  const [selectedCategories, setSelectedCategories] = useState([]); // 선택된 카테고리
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  // 업로드 허용 확장자 목록
  const allowedExtensions = ['wav', 'am2data', 'am3data', 'am2', 'zip'];

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        console.error("❌ 카테고리 불러오기 실패:", error.message);
        return;
      }
      setCategories(data);
    };

    fetchCategories();
  }, []);

  // 카테고리 선택/해제
  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId) // 해제
        : [...prev, categoryId] // 선택
    );
  };

  // 파일 선택 시 확장자 검사 후 상태 업데이트
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const invalidFiles = selectedFiles.filter(file => {
      const fileExt = file.name.split('.').pop().toLowerCase();
      return !allowedExtensions.includes(fileExt);
    });

    if (invalidFiles.length > 0) {
      alert('업로드 가능한 파일 확장자는 WAV, AM2DATA, AM3DATA, AM2, ZIP만 가능합니다.');
      return;
    }

    setFiles(selectedFiles);
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('로그인이 필요합니다.');

      console.log("🚀 로그인한 사용자 ID:", user.id);

      let uploadedThumbnailUrl = null;

      if (thumbnail) {
        const fileName = `thumbnails/${Date.now()}_${thumbnail.name}`;
        const { data, error } = await supabase.storage.from('thumbnails').upload(fileName, thumbnail);
        if (error) throw error;
        uploadedThumbnailUrl = data.path;
      }

      let uploadedFileUrls = [];
      for (const file of files) {
        const filePath = `uploads/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('uploads').upload(filePath, file);
        if (error) throw error;
        uploadedFileUrls.push(data.path);
        await supabase.from('files').insert([{ post_id: null, file_url: data.path, file_name: file.name }]);
      }

      const { data: newPost, error: postError } = await supabase.from('posts').insert([{
        title,
        content,
        user_id: user.id,
        thumbnail_url: uploadedThumbnailUrl,
        file_urls: uploadedFileUrls,
        category_ids: selectedCategories
      }]).select().single();

      if (postError) throw postError;

      if (uploadedFileUrls.length > 0) {
        await supabase.from('files').update({ post_id: newPost.id }).in('file_url', uploadedFileUrls);
      }

      router.push('/');
    } catch (error) {
      console.error('❌ 게시글 작성 중 오류 발생:', error.message);
      setErrorMsg(`게시글 작성 중 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
      <h1>새 게시글 작성</h1>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      <input type="text" placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <textarea placeholder="본문 내용" value={content} onChange={(e) => setContent(e.target.value)} style={{ width: '100%', height: '150px', padding: '10px', marginBottom: '10px' }} />

      <h3>썸네일 업로드</h3>
      <input type="file" onChange={handleThumbnailChange} />

      <h3>파일 업로드</h3>
      <input type="file" multiple onChange={handleFileChange} />

      {/* 🔥 카테고리 선택 UI (스타일 & 타입) */}
      <h3>스타일 선택</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {categories.filter(cat => cat.type === 'style').map(category => (
          <button key={category.id} onClick={() => toggleCategory(category.id)} style={{
            padding: '10px',
            background: selectedCategories.includes(category.id) ? '#007bff' : '#ddd',
            color: selectedCategories.includes(category.id) ? '#fff' : '#000',
            borderRadius: '5px',
            cursor: 'pointer',
            border: 'none'
          }}>
            {category.name}
          </button>
        ))}
      </div>

      <h3>타입 선택</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {categories.filter(cat => cat.type === 'type').map(category => (
          <button key={category.id} onClick={() => toggleCategory(category.id)} style={{
            padding: '10px',
            background: selectedCategories.includes(category.id) ? '#007bff' : '#ddd',
            color: selectedCategories.includes(category.id) ? '#fff' : '#000',
            borderRadius: '5px',
            cursor: 'pointer',
            border: 'none'
          }}>
            {category.name}
          </button>
        ))}
      </div>

      <button onClick={handleCreatePost} disabled={loading} style={{ padding: '10px 20px', background: '#28a745', color: '#fff', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>
        {loading ? '작성 중...' : '게시글 작성'}
      </button>
    </div>
  );
};

export default NewPost;
