// ==========================================
// useAppImageWorkflow.js
// Purpose: own image upload modal state and image file handlers.
// Imported by: App.jsx.
// Notes: keeps drag-drop, picker flows, and markdown insertion out of the main shell.
// ==========================================

import { useCallback, useState } from 'react';
import { saveBrowserImage } from './lib/browserLibraryStore.js';
import { handleToolbarClick } from './MasterUtils.jsx';
import {
  buildScopedImageFileName,
  listDirectoryFileNames,
} from './lib/imageFilename.js';

const DEFAULT_IMAGE_FORM = { url: '', alt: '', editorId: 'standard-editor' };

async function pickImageFile(browserMode) {
  if (browserMode) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    return new Promise(resolve => {
      input.onchange = () => resolve(input.files?.[0] || null);
      input.oncancel = () => resolve(null);
      input.click();
    });
  }
  const [handle] = await window.showOpenFilePicker({
    types: [{ description: 'Images', accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp'] } }],
    multiple: false,
  });
  return handle.getFile();
}

async function saveImageToImagesDir(baseHandle, file, fileName) {
  const imagesDir = await baseHandle.getDirectoryHandle('images', { create: true });
  const imageFileHandle = await imagesDir.getFileHandle(fileName, { create: true });
  const writable = await imageFileHandle.createWritable();
  await writable.write(file);
  await writable.close();
}

async function buildImageFileName(baseHandle, file, options = {}) {
  const fileStemParts = Array.isArray(options.fileStemParts) ? options.fileStemParts : [];
  if (fileStemParts.some((part) => String(part || '').trim())) {
    const imagesDir = await baseHandle.getDirectoryHandle('images', { create: true });
    const existingFileNames = await listDirectoryFileNames(imagesDir);
    const scopedFileName = buildScopedImageFileName({
      stemParts: fileStemParts,
      originalFileName: file.name,
      existingFileNames,
    });
    if (scopedFileName) return scopedFileName;
  }

  const filePrefix = String(options.filePrefix || 'img').trim() || 'img';
  const ext = file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
  return `${filePrefix}-${Date.now()}.${ext}`;
}

function insertImageMarkdown({ handleToolbarClick, editorId, altText, imageUrl }) {
  handleToolbarClick(`\n\n![${altText}](${imageUrl})\n\n`, '', editorId);
}

export function useAppImageWorkflow({
  dirHandle,
  currentContextDirHandle,
  isEditingMode,
  isEntityEditing,
  showToast,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isInsertImageModalOpen, setIsInsertImageModalOpen] = useState(false);
  const [imageForm, setImageForm] = useState(DEFAULT_IMAGE_FORM);

  const handleImageDrop = useCallback(async (event, editorId = 'standard-editor', fileNameOptions = null) => {
    event.preventDefault();
    if (!isEditingMode && !isEntityEditing) return;
    if (!dirHandle) {
      showToast('Vui long ket noi thu muc truoc de luu anh!', 'warning');
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsUploading(true);
    try {
      if (dirHandle === 'LOCAL_STORAGE') {
        const imageRef = await saveBrowserImage(file);
        insertImageMarkdown({
          handleToolbarClick,
          editorId,
          altText: file.name,
          imageUrl: imageRef,
        });
        showToast('Đã lưu ảnh gốc trong trình duyệt.');
        return;
      }

      const fileName = await buildImageFileName(currentContextDirHandle, file, fileNameOptions || {});
      await saveImageToImagesDir(currentContextDirHandle, file, fileName);
      insertImageMarkdown({
        handleToolbarClick,
        editorId,
        altText: file.name,
        imageUrl: `local_image:${fileName}`,
      });
      showToast('Da luu anh local thanh cong!');
    } catch {
      showToast('That bai khi luu anh!', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [
    currentContextDirHandle,
    dirHandle,
    isEditingMode,
    isEntityEditing,
    showToast,
  ]);

  const handleAvatarDrop = useCallback(async (event, setAvatarCallback) => {
    event.preventDefault();
    if (!dirHandle) {
      showToast('Vui long ket noi thu muc truoc de tai anh local!', 'warning');
      return;
    }

    const file = event.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsUploading(true);
    try {
      if (dirHandle === 'LOCAL_STORAGE') {
        const imageRef = await saveBrowserImage(file);
        setAvatarCallback(imageRef);
        showToast('Đã lưu ảnh đại diện trong trình duyệt.');
        return;
      }

      const fileName = `avatar-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      await saveImageToImagesDir(currentContextDirHandle, file, fileName);
      setAvatarCallback(`local_image:${fileName}`);
      showToast('Da luu avatar local thanh cong!');
    } catch {
      showToast('That bai khi luu anh!', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [currentContextDirHandle, dirHandle, showToast]);

  const handlePickCoverImage = useCallback(async (setAvatarCallback) => {
    try {
      const file = await pickImageFile(!dirHandle || dirHandle === 'LOCAL_STORAGE');
      if (!file) return;

      setIsUploading(true);
      try {
        if (!dirHandle || dirHandle === 'LOCAL_STORAGE') {
          const imageRef = await saveBrowserImage(file);
          setAvatarCallback(imageRef);
          return;
        }

        const ext = file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
        const fileName = `cover-${Date.now()}.${ext}`;
        await saveImageToImagesDir(dirHandle, file, fileName);
        setAvatarCallback(`local_image:${fileName}`);
        showToast('Anh bia da duoc luu!');
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Không thể đọc hoặc lưu ảnh. Kiểm tra quyền lưu và dung lượng còn trống.', 'error');
      setIsUploading(false);
    }
  }, [dirHandle, showToast]);

  const handlePickLocalImage = useCallback(async (setAvatarCallback, editorId = null, filePrefixOrOptions = 'img') => {
    try {
      const file = await pickImageFile(!dirHandle || dirHandle === 'LOCAL_STORAGE');
      if (!file) return;

      setIsUploading(true);
      try {
        if (!dirHandle || dirHandle === 'LOCAL_STORAGE') {
          const imageRef = await saveBrowserImage(file);
          if (editorId) {
            insertImageMarkdown({
              handleToolbarClick,
              editorId,
              altText: file.name,
              imageUrl: imageRef,
            });
          } else if (setAvatarCallback) {
            setAvatarCallback(imageRef);
          }
          showToast('Đã lưu ảnh gốc trong trình duyệt.');
          return;
        }

        const fileNameOptions =
          typeof filePrefixOrOptions === 'string'
            ? { filePrefix: filePrefixOrOptions }
            : (filePrefixOrOptions || {});
        const fileName = await buildImageFileName(currentContextDirHandle, file, fileNameOptions);
        await saveImageToImagesDir(currentContextDirHandle, file, fileName);

        if (editorId) {
          insertImageMarkdown({
            handleToolbarClick,
            editorId,
            altText: file.name,
            imageUrl: `local_image:${fileName}`,
          });
        } else if (setAvatarCallback) {
          setAvatarCallback(`local_image:${fileName}`);
        }
        showToast('Da luu anh vao Tang Thu Cac!');
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('Không thể đọc hoặc lưu ảnh. Kiểm tra quyền lưu và dung lượng còn trống.', 'error');
      setIsUploading(false);
    }
  }, [currentContextDirHandle, dirHandle, showToast]);

  const handleConfirmInsertImage = useCallback(() => {
    if (!imageForm.url.trim()) return;

    let finalUrl = imageForm.url.trim();
    const srcMatch = finalUrl.match(/src=["'](.*?)["']/);
    if (srcMatch && srcMatch[1]) finalUrl = srcMatch[1].replace(/&amp;/g, '&');
    if (/^javascript:/i.test(finalUrl)) {
      showToast('URL khong hop le!', 'error');
      return;
    }

    insertImageMarkdown({
      handleToolbarClick,
      editorId: imageForm.editorId,
      altText: imageForm.alt.trim() || 'Minh hoa',
      imageUrl: finalUrl,
    });
    setIsInsertImageModalOpen(false);
    setImageForm(DEFAULT_IMAGE_FORM);
  }, [imageForm, showToast]);

  return {
    isUploading,
    setIsUploading,
    isInsertImageModalOpen,
    setIsInsertImageModalOpen,
    imageForm,
    setImageForm,
    handleImageDrop,
    handleAvatarDrop,
    handlePickCoverImage,
    handlePickLocalImage,
    handleConfirmInsertImage,
  };
}
