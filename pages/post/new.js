import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

const NewPost = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [hashtags, setHashtags] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const allowedExtensions = ['am2data', 'am2', 'am3data', 'zip'];

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleThumbnailChange = (e) => {
    setThumbnail(e.target.files[0]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = [...e.target.files];
    const invalidFiles = selectedFiles.filter((file) => {
      const fileExtension = file.name.split('.').pop().toLowerCase();
      return !allowedExtensions.includes(fileExtension);
    });

    if (invalidFiles.length > 0) {
      setErrorMsg('AM2DATA, AM2, AM3DATA, ZIP 확장자만 첨부할 수 있습니다.');
    } else {
      setErrorMsg('');
    }

    setFiles(selectedFiles);
  };

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleCreatePost = async () => {
    setLoading(true);
    setErrorMsg('');

    if (!title || !content) {
      setErrorMsg('제목과 내용은 필수 입력 항목입니다.');
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인이 필요합니다.');

      let thumbnailUrl = '';
      if (thumbnail) {
        const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${thumbnail.name}`;
        const { data, error: uploadThumbnailError } = await supabase.storage
          .from('thumbnails')
          .upload(`uploads/${uniqueFileName}`, thumbnail);
        if (uploadThumbnailError) throw uploadThumbnailError;
        thumbnailUrl = data.path;
      }

      let fileUrls = [];
      if (files.length > 0) {
        for (const file of files) {
          const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${file.name}`;
          const { data, error: uploadFileError } = await supabase.storage
            .from('files')
            .upload(`uploads/${uniqueFileName}`, file);
          if (uploadFileError) throw uploadFileError;
          fileUrls.push(data.path);
        }
      }

      const { error: insertPostError } = await supabase.from('posts').insert([
        {
          title,
          content,
          category: selectedCategories.join(','),
          hashtags: hashtags.split(',').map((tag) => tag.trim()).filter(Boolean),
          thumbnail_url: thumbnailUrl,
          file_urls: fileUrls,
          user_id: user.id,
        },
      ]);

      if (insertPostError) throw insertPostError;
      router.push('/');
    } catch (error) {
      setErrorMsg('게시글 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
      <h1>새 게시글 작성</h1>
      {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
      <input type="text" placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <label>이미지 첨부</label>
      <input type="file" onChange={handleThumbnailChange} style={{ marginBottom: '10px' }} />
      <textarea placeholder="본문 내용" value={content} onChange={(e) => setContent(e.target.value)} style={{ width: '100%', height: '150px', padding: '10px', marginBottom: '10px' }} />
      <h4>카테고리 선택</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {categories.map((cat) => (
          <span key={cat.id} onClick={() => handleCategoryToggle(cat.name)} style={{ background: selectedCategories.includes(cat.name) ? '#0070f3' : '#ddd', color: selectedCategories.includes(cat.name) ? 'white' : 'black', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px' }}>
            {cat.name}
          </span>
        ))}
      </div>
      <label>첨부파일</label>
      <input type="file" multiple onChange={handleFileChange} style={{ marginBottom: '10px' }} />
      {errorMsg && <p style={{ color: 'red', marginTop: '10px' }}>{errorMsg}</p>}
      <input type="text" placeholder="해시태그 (쉼표로 구분)" value={hashtags} onChange={(e) => setHashtags(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button onClick={handleCreatePost} disabled={loading} style={{ padding: '10px', background: '#28a745', color: '#fff', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>
          {loading ? '로딩 중...' : '게시글 작성'}
        </button>
        <button onClick={handleCancel} style={{ padding: '10px', background: '#dc3545', color: '#fff', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>
          목록으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default NewPost;
