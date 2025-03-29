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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [downloadPermission, setDownloadPermission] = useState('verified_user');
  const router = useRouter();

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

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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
        uploadedFileUrls.push({ path: data.path, name: file.name });
      }

      const { data: newPost, error: postError } = await supabase.from('posts').insert([{
        title,
        content,
        user_id: user.id,
        thumbnail_url: uploadedThumbnailUrl,
        file_urls: uploadedFileUrls.map(f => f.path),
        category_ids: selectedCategories,
        download_permission: downloadPermission
      }]).select().single();

      if (postError) throw postError;

      if (uploadedFileUrls.length > 0) {
        const filesToInsert = uploadedFileUrls.map(file => ({
          post_id: newPost.id,
          file_url: file.path,
          file_name: file.name
        }));
        await supabase.from('files').insert(filesToInsert);
      }

      router.push('/');
    } catch (error) {
      console.error('❌ 게시글 작성 중 오류 발생:', error.message);
      setErrorMsg(`게시글 작성 중 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px', marginBottom: '10px' };
  const buttonStyle = {
    padding: '10px 20px', background: '#28a745', color: '#fff', borderRadius: '5px', border: 'none', cursor: 'pointer'
  };
  const categoryButtonStyle = {
    padding: '10px', background: '#ddd', color: '#000', borderRadius: '5px', cursor: 'pointer', border: 'none'
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
      <h1>새 게시글 작성</h1>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}

      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="본문 내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={{ ...inputStyle, height: '150px' }}
      />

      <h3>썸네일 업로드</h3>
      <input type="file" onChange={handleThumbnailChange} />

      <h3>파일 업로드</h3>
      <input type="file" multiple onChange={handleFileChange} />

      <h3>스타일 선택</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {categories.filter(cat => cat.type === 'style').map(category => (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            style={{ ...categoryButtonStyle, background: selectedCategories.includes(category.id) ? '#007bff' : '#ddd', color: selectedCategories.includes(category.id) ? '#fff' : '#000' }}
          >
            {category.name}
          </button>
        ))}
      </div>

      <h3>타입 선택</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {categories.filter(cat => cat.type === 'type').map(category => (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            style={{ ...categoryButtonStyle, background: selectedCategories.includes(category.id) ? '#007bff' : '#ddd', color: selectedCategories.includes(category.id) ? '#fff' : '#000' }}
          >
            {category.name}
          </button>
        ))}
      </div>

      <h3>다운로드 권한 설정</h3>
      <div style={{ marginBottom: '10px' }}>
        <label>
          <input
            type="radio"
            name="downloadPermission"
            value="verified_user"
            checked={downloadPermission === 'verified_user'}
            onChange={() => setDownloadPermission('verified_user')}
          />
          인증 유저만 다운로드 가능
        </label>
        <label>
          <input
            type="radio"
            name="downloadPermission"
            value="user"
            checked={downloadPermission === 'user'}
            onChange={() => setDownloadPermission('user')}
          />
          일반 유저 이상만 다운로드 가능
        </label>
        <label>
          <input
            type="radio"
            name="downloadPermission"
            value="guest"
            checked={downloadPermission === 'guest'}
            onChange={() => setDownloadPermission('guest')}
          />
          비회원도 다운로드 가능
        </label>
      </div>

      <button onClick={handleCreatePost} disabled={loading} style={buttonStyle}>
        {loading ? '작성 중...' : '게시글 작성'}
      </button>
    </div>
  );
};

export default NewPost;
