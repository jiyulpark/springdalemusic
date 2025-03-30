import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import styles from '../../styles/PostDetail.module.css';

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
          file_name: file.name,
          file_size: file.size,
          file_type: file.type
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

  return <div>...작성 폼 생략 (UI 부분 유지)...</div>;
};

export default EditPost;
