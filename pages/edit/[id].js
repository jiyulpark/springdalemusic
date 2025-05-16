import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import React from 'react';

const EditPost = () => {
  const router = useRouter();
  const { id } = router.query;
  const [post, setPost] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailPath, setThumbnailPath] = useState('');
  const [files, setFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [downloadPermission, setDownloadPermission] = useState('verified_user');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [session, setSession] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const allowedExtensions = ['wav', 'am2data', 'am3data', 'am2', 'zip'];

  const thumbnailInputRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    fetchSession();
  }, []);

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchCategories();
    }
  }, [id]);

  const fetchPost = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('posts').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      if (session && data.user_id !== session.user.id) throw new Error('이 게시글을 수정할 권한이 없습니다.');

      setPost(data);
      setTitle(data.title);
      setContent(data.content);
      setExistingFiles(data.file_urls || []);
      setDownloadPermission(data.download_permission || 'verified_user');
      setSelectedCategories(data.category_ids || []);
      if (data.thumbnail_url) {
        setThumbnailPath(data.thumbnail_url);
        setThumbnailUrl(supabase.storage.from('thumbnails').getPublicUrl(data.thumbnail_url).data.publicUrl);
      }
    } catch (error) {
      console.error('게시글 불러오기 실패:', error.message);
      setErrorMsg(`게시글을 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) throw new Error(error.message);
      setCategories(data);
    } catch (error) {
      console.error("❌ 카테고리 불러오기 실패:", error.message);
      setErrorMsg(`카테고리를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const invalidFiles = selectedFiles.filter(file => {
      const fileExt = file.name.split('.').pop().toLowerCase();
      return !allowedExtensions.includes(fileExt);
    });
    if (invalidFiles.length > 0) {
      setErrorMsg(`업로드 가능한 파일 확장자는 ${allowedExtensions.join(', ')}만 가능합니다.`);
      return;
    }
    setFiles(selectedFiles);
    setErrorMsg('');
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      setThumbnailUrl(URL.createObjectURL(file));
    }
  };

  const handleDeleteFile = async (fileUrl) => {
    if (!window.confirm('정말로 이 파일을 삭제하시겠습니까?')) return;
    try {
      setIsSubmitting(true);
      const { error: storageError } = await supabase.storage.from('uploads').remove([fileUrl]);
      if (storageError) throw new Error(storageError.message);
      await supabase.from('files').delete().eq('file_url', fileUrl);
      const updatedFiles = existingFiles.filter((file) => file !== fileUrl);
      setExistingFiles(updatedFiles);
      await supabase.from('posts').update({ file_urls: updatedFiles }).eq('id', id);
      alert('파일이 삭제되었습니다.');
    } catch (error) {
      console.error('파일 삭제 실패:', error.message);
      setErrorMsg(`파일 삭제 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadThumbnail = async () => {
    if (!thumbnail) return thumbnailPath;
    try {
      if (thumbnailPath) await supabase.storage.from('thumbnails').remove([thumbnailPath]);
      const fileName = `thumbnails/${Date.now()}_${thumbnail.name}`;
      const { data, error } = await supabase.storage.from('thumbnails').upload(fileName, thumbnail);
      if (error) throw new Error(error.message);
      return data.path;
    } catch (error) {
      throw new Error(`썸네일 업로드 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return [...existingFiles];
    try {
      const uploadPromises = files.map(async (file, index) => {
        const filePath = `uploads/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage.from('uploads').upload(filePath, file);
        if (error) throw new Error(error.message);
        await supabase.from('files').insert([{ 
          post_id: id, 
          file_url: data.path, 
          file_name: file.name
        }]);
        return data.path;
      });
      const uploadedPaths = await Promise.all(uploadPromises);
      return [...existingFiles, ...uploadedPaths];
    } catch (error) {
      throw new Error(`파일 업로드 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  const handleUpdate = async () => {
    if (!title || !content) {
      setErrorMsg('제목과 내용을 입력하세요!');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setUploadProgress(0);
      const uploadedThumbnailPath = await uploadThumbnail();
      const uploadedFileUrls = await uploadFiles();
      const { error } = await supabase.from('posts').update({
        title,
        content,
        file_urls: uploadedFileUrls,
        thumbnail_url: uploadedThumbnailPath,
        category_ids: selectedCategories,
        download_permission: downloadPermission
      }).eq('id', id);
      if (error) throw new Error(error.message);
      alert('게시글이 성공적으로 수정되었습니다.');
      router.push(`/post/${id}`);
    } catch (error) {
      console.error('게시글 수정 실패:', error.message);
      setErrorMsg(`게시글 수정 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="loading-container">
      <p style={{ textAlign: 'center' }}>게시글을 불러오는 중...</p>
    </div>
  );

  if (!post) return (
    <div className="error-container">
      <p style={{ textAlign: 'center', color: 'red' }}>
        게시글을 찾을 수 없습니다. 삭제되었거나 접근 권한이 없습니다.
      </p>
      <button 
        onClick={() => router.push('/posts')}
        style={{ 
          display: 'block', 
          margin: '20px auto', 
          padding: '10px 20px', 
          background: '#0070f3', 
          color: '#fff', 
          borderRadius: '5px', 
          border: 'none', 
          cursor: 'pointer' 
        }}
      >
        목록으로 돌아가기
      </button>
    </div>
  );

  const styles = {
    container: {
      maxWidth: '600px',
      margin: '40px auto',
      padding: '20px',
      background: '#fff',
      borderRadius: '10px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    },
    input: {
      width: '100%',
      padding: '10px',
      marginBottom: '15px',
      borderRadius: '5px',
      border: '1px solid #ccc'
    },
    textarea: {
      width: '100%',
      height: '150px',
      padding: '10px',
      marginBottom: '15px',
      borderRadius: '5px',
      border: '1px solid #ccc'
    },
    heading: {
      borderBottom: '1px solid #eee',
      paddingBottom: '10px',
      marginBottom: '20px'
    },
    subheading: {
      marginTop: '20px',
      marginBottom: '10px'
    },
    button: {
      padding: '10px 20px',
      background: '#28a745',
      color: '#fff',
      borderRadius: '5px',
      border: 'none',
      cursor: 'pointer',
      transition: 'background 0.3s'
    },
    buttonDisabled: {
      padding: '10px 20px',
      background: '#cccccc',
      color: '#666',
      borderRadius: '5px',
      border: 'none',
      cursor: 'not-allowed'
    },
    deleteButton: {
      marginLeft: '10px',
      color: 'red',
      cursor: 'pointer',
      background: 'none',
      border: 'none'
    },
    categoryButton: (selected) => ({
      padding: '10px',
      background: selected ? '#007bff' : '#ddd',
      color: selected ? '#fff' : '#000',
      borderRadius: '5px',
      cursor: 'pointer',
      margin: '0 5px 5px 0',
      border: 'none'
    }),
    error: {
      color: 'red',
      padding: '10px',
      backgroundColor: '#ffeeee',
      borderRadius: '5px',
      marginBottom: '15px'
    },
    fileList: {
      listStyle: 'none',
      padding: '0',
      margin: '10px 0'
    },
    fileItem: {
      padding: '8px',
      borderBottom: '1px solid #eee',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    progressBar: {
      width: '100%',
      height: '10px',
      backgroundColor: '#e0e0e0',
      borderRadius: '5px',
      margin: '10px 0'
    },
    progressFill: (progress) => ({
      width: `${progress}%`,
      height: '100%',
      backgroundColor: '#4caf50',
      borderRadius: '5px',
      transition: 'width 0.3s'
    }),
    radioGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      marginBottom: '15px'
    },
    radioLabel: {
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>게시글 수정</h1>
      
      {errorMsg && <div style={styles.error}>{errorMsg}</div>}

      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={styles.input}
        disabled={isSubmitting}
      />
      
      <textarea
        placeholder="본문 내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        style={styles.textarea}
        disabled={isSubmitting}
      />

      <h3 style={styles.subheading}>썸네일 수정</h3>
      {thumbnailUrl && (
        <div style={{ marginBottom: '10px' }}>
          <p>썸네일 미리보기:</p>
          <img 
            src={thumbnailUrl} 
            alt="썸네일" 
            style={{ width: '100%', maxWidth: '200px', borderRadius: '5px' }} 
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => thumbnailInputRef.current.click()}
        style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 500, marginBottom: 8 }}
      >
        썸네일 선택
      </button>
      <input 
        type="file" 
        onChange={handleThumbnailChange} 
        disabled={isSubmitting}
        accept="image/*"
        ref={thumbnailInputRef}
        style={{ display: 'none' }}
      />
      {thumbnail && (
        <button
          type="button"
          onClick={() => { setThumbnail(null); setThumbnailUrl(null); }}
          style={{ marginLeft: 8, padding: '8px 16px', background: '#fff', color: '#f44336', border: '1px solid #f44336', borderRadius: '5px', cursor: 'pointer', fontWeight: 500 }}
        >
          삭제
        </button>
      )}

      <h3 style={styles.subheading}>파일 관리</h3>
      <div style={{ marginBottom: '15px' }}>
        <button
          type="button"
          onClick={() => fileInputRef.current.click()}
          style={{ padding: '8px 16px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 500, marginBottom: 8 }}
        >
          파일 선택
        </button>
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          disabled={isSubmitting}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        {files.length > 0 && (
          <ul style={{ marginTop: 10 }}>
            {files.map((file, idx) => (
              <li key={idx} style={{ marginBottom: 4 }}>
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  style={{ marginLeft: 8, color: '#f44336', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h3 style={styles.subheading}>스타일 선택</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' }}>
        {categories.filter(cat => cat.type === 'style').map(category => (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            style={styles.categoryButton(selectedCategories.includes(category.id))}
            disabled={isSubmitting}
            data-type="style"
          >
            {category.name}
          </button>
        ))}
      </div>

      <h3 style={styles.subheading}>타입 선택</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '15px' }}>
        {categories.filter(cat => cat.type === 'type').map(category => (
          <button
            key={category.id}
            onClick={() => toggleCategory(category.id)}
            style={styles.categoryButton(selectedCategories.includes(category.id))}
            disabled={isSubmitting}
            data-type="type"
          >
            {category.name}
          </button>
        ))}
      </div>

      <h3 style={styles.subheading}>다운로드 권한 설정</h3>
      <div style={styles.radioGroup}>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="downloadPermission"
            value="verified_user"
            checked={downloadPermission === 'verified_user'}
            onChange={() => setDownloadPermission('verified_user')}
            disabled={isSubmitting}
            style={{ marginRight: '8px' }}
          />
          인증 유저만 다운로드 가능
        </label>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="downloadPermission"
            value="user"
            checked={downloadPermission === 'user'}
            onChange={() => setDownloadPermission('user')}
            disabled={isSubmitting}
            style={{ marginRight: '8px' }}
          />
          일반 유저 이상만 다운로드 가능
        </label>
        <label style={styles.radioLabel}>
          <input
            type="radio"
            name="downloadPermission"
            value="guest"
            checked={downloadPermission === 'guest'}
            onChange={() => setDownloadPermission('guest')}
            disabled={isSubmitting}
            style={{ marginRight: '8px' }}
          />
          비회원도 다운로드 가능
        </label>
      </div>

      <button 
        onClick={handleUpdate} 
        style={isSubmitting ? styles.buttonDisabled : styles.button}
        disabled={isSubmitting}
      >
        {isSubmitting ? '저장 중...' : '게시글 수정'}
      </button>
    </div>
  );
};

export default EditPost;
