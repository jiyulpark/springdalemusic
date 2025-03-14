import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import Image from 'next/image';

const EditPost = () => {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (id) {
      const fetchPost = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
        if (error) {
          console.error('게시글 불러오기 실패:', error.message);
        } else {
          setPost(data);
          setTitle(data.title);
          setContent(data.content);
          setSelectedCategories(data.category.split(','));
        }
        setLoading(false);
      };
      fetchPost();
    }
  }, [id]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('categories').select('*');
      if (!error) setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    );
  };

  const handleThumbnailChange = (e) => {
    setThumbnail(e.target.files[0]);
  };

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleUpdate = async () => {
    if (!session || session.user.id !== post.user_id) {
      alert('수정 권한이 없습니다.');
      return;
    }

    let newThumbnailUrl = post.thumbnail_url;
    if (thumbnail) {
      if (post.thumbnail_url) {
        await supabase.storage.from('thumbnails').remove([post.thumbnail_url]);
      }

      const uniqueFileName = `uploads/${Date.now()}_${thumbnail.name}`;
      const { data, error: uploadThumbnailError } = await supabase.storage
        .from('thumbnails')
        .upload(uniqueFileName, thumbnail);

      if (uploadThumbnailError) {
        console.error('썸네일 업로드 실패:', uploadThumbnailError.message);
        alert('썸네일 업로드 실패!');
        return;
      }
      newThumbnailUrl = data.path;
    }

    let newFileUrls = [];
    if (files.length > 0) {
      if (post.file_urls && post.file_urls.length > 0) {
        await supabase.storage.from('files').remove(post.file_urls);
      }

      for (const file of files) {
        const uniqueFileName = `uploads/${Date.now()}_${file.name}`;
        const { data, error: uploadFileError } = await supabase.storage
          .from('files')
          .upload(uniqueFileName, file);

        if (uploadFileError) {
          console.error('파일 업로드 실패:', uploadFileError.message);
          alert('파일 업로드 실패!');
          return;
        }
        newFileUrls.push(data.path);
      }
    } else {
      newFileUrls = post.file_urls;
    }

    const { error } = await supabase.from('posts').update({
      title,
      content,
      category: selectedCategories.join(','),
      thumbnail_url: newThumbnailUrl,
      file_urls: newFileUrls
    }).eq('id', id);

    if (error) {
      console.error('게시글 수정 실패:', error.message);
      alert('게시글 수정 실패!');
    } else {
      alert('게시글이 수정되었습니다.');
      router.push('/'); // 🔥 수정 후 index.js로 이동!
    }
  };

  if (loading) return <p style={{ textAlign: 'center' }}>로딩 중...</p>;
  if (!post) return <p style={{ textAlign: 'center', color: 'red' }}>게시글을 찾을 수 없습니다.</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
      <h1>게시글 수정</h1>
      
      <label>제목</label>
      <input type='text' value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
      
      <label>썸네일 수정</label>
      {post.thumbnail_url && (
        <div style={{ marginBottom: '10px', position: 'relative', width: '100%', height: '300px' }}>
          <Image 
            src={supabase.storage.from('thumbnails').getPublicUrl(post.thumbnail_url).data.publicUrl} 
            alt="Thumbnail" 
            layout="fill" 
            objectFit="cover" 
            style={{ borderRadius: '10px' }}
          />
        </div>
      )}
      <input type="file" onChange={handleThumbnailChange} style={{ marginBottom: '10px' }} />

      <label>본문 내용</label>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} style={{ width: '100%', height: '200px', padding: '10px', marginBottom: '10px' }} />

      <label>카테고리</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
        {categories.map((cat) => (
          <span key={cat.id} onClick={() => handleCategoryToggle(cat.name)} style={{ background: selectedCategories.includes(cat.name) ? '#0070f3' : '#ddd', color: selectedCategories.includes(cat.name) ? 'white' : 'black', padding: '8px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px' }}>
            {cat.name}
          </span>
        ))}
      </div>

      <label>첨부파일 수정</label>
      {post.file_urls && post.file_urls.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          {post.file_urls.map((file, index) => (
            <p key={index}><a href={supabase.storage.from('files').getPublicUrl(file).data.publicUrl} target="_blank" rel="noopener noreferrer">{file}</a></p>
          ))}
        </div>
      )}
      <input type="file" multiple onChange={handleFileChange} style={{ marginBottom: '10px' }} />

      <button onClick={handleUpdate} style={{ padding: '10px 20px', background: '#28a745', color: '#fff', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>수정 완료</button>
    </div>
  );
};

export default EditPost;
