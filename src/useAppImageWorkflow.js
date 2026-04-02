// ==========================================
// useAppImageWorkflow.js
// Purpose: own image upload modal state and image file handlers.
// Imported by: App.jsx.
// Notes: keeps drag-drop, picker flows, and markdown insertion out of the main shell.
// ==========================================

import { useCallback, useState } from 'react';
import { handleToolbarClick } from './MasterUtils.jsx';
import {
  buildScopedImageFileName,
  listDirectoryFileNames,
} from './lib/imageFilename.js';

const DEFAULT_IMAGE_FORM = { url: '', alt: '', editorId: 'standard-editor' };

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result || '');
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
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
        const dataUrl = await readFileAsDataUrl(file);
        insertImageMarkdown({
          handleToolbarClick,
          editorId,
          altText: file.name,
          imageUrl: dataUrl,
        });
        showToast('Da luu anh dang Base64.');
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
        const dataUrl = await readFileAsDataUrl(file);
        setAvatarCallback(dataUrl);
        showToast('Da luu avatar dang Base64.');
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
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Images',
            accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp'] },
          },
        ],
        multiple: false,
      });
      const file = await fileHandle.getFile();

      setIsUploading(true);
      try {
        if (!dirHandle || dirHandle === 'LOCAL_STORAGE') {
          const dataUrl = await readFileAsDataUrl(file);
          setAvatarCallback(dataUrl);
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
      if (error.name !== 'AbortError') showToast('Huy chon anh.', 'warning');
      setIsUploading(false);
    }
  }, [dirHandle, showToast]);

  const handlePickLocalImage = useCallback(async (setAvatarCallback, editorId = null, filePrefixOrOptions = 'img') => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Images',
            accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg', '.webp'] },
          },
        ],
        multiple: false,
      });
      const file = await fileHandle.getFile();

      setIsUploading(true);
      try {
        if (!dirHandle || dirHandle === 'LOCAL_STORAGE') {
          const dataUrl = await readFileAsDataUrl(file);
          if (editorId) {
            insertImageMarkdown({
              handleToolbarClick,
              editorId,
              altText: file.name,
              imageUrl: dataUrl,
            });
          } else if (setAvatarCallback) {
            setAvatarCallback(dataUrl);
          }
          showToast('Da luu anh dang Base64.');
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
      if (error.name !== 'AbortError') showToast('Huy chon anh.', 'warning');
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
