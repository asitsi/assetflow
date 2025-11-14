'use client'
import { useState, useTransition, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { getLimitlessImages, limitlessImageUpload, deleteLimitlessImage } from '../libs/index';

export default function LimitlessImageUploads() {
  const [formData, setFormData] = useState({
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isPending, startTransition] = useTransition();
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });
  const [webpBlob, setWebpBlob] = useState(null);
  const [webpUrl, setWebpUrl] = useState(null);
  const [webpFileName, setWebpFileName] = useState('');
  const [images, setImages] = useState([]);
  const [imagesVersion, setImagesVersion] = useState(0);
  const [isFetchingImages, startImagesTransition] = useTransition();
  const [imagesError, setImagesError] = useState(null);
  const [showSlowImages, setShowSlowImages] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const convertImageFileToWebp = (file, quality = 0.8) => {
    return new Promise((resolve, reject) => {
      try {
        const objectUrl = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            canvas.toBlob(
              (blob) => {
                URL.revokeObjectURL(objectUrl);
                if (blob) {
                  resolve(blob);
                } else {
                  resolve(null);
                }
              },
              'image/webp',
              quality
            );
          } catch (err) {
            URL.revokeObjectURL(objectUrl);
            reject(err);
          }
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image for conversion'));
        };
        image.src = objectUrl;
      } catch (err) {
        reject(err);
      }
    });
  };

  const toWebpFileName = (originalName) => {
    const dotIndex = originalName.lastIndexOf('.');
    return dotIndex === -1
      ? `${originalName}.webp`
      : `${originalName.substring(0, dotIndex)}.webp`;
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          image: 'Image size should be less than 5MB'
        }));
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      try {
        const blob = await convertImageFileToWebp(file, 0.8);
        // Revoke old URL if any
        if (webpUrl) URL.revokeObjectURL(webpUrl);
        if (blob) {
          setWebpBlob(blob);
          const url = URL.createObjectURL(blob);
          setWebpUrl(url);
          setWebpFileName(toWebpFileName(file.name));
        } else {
          setWebpBlob(null);
          setWebpUrl(null);
          setWebpFileName('');
        }
      } catch (_) {
        setWebpBlob(null);
        if (webpUrl) URL.revokeObjectURL(webpUrl);
        setWebpUrl(null);
        setWebpFileName('');
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    if (webpUrl) URL.revokeObjectURL(webpUrl);
    setWebpBlob(null);
    setWebpUrl(null);
    setWebpFileName('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.image) {
      newErrors.image = 'Image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // To send the image file to the backend, use FormData (multipart/form-data)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setSubmitStatus({ type: null, message: '' });
      startTransition( async () => {
        let fileToSend = formData.image;
        // Prefer existing converted blob; otherwise attempt conversion now
        if (webpBlob && webpBlob.type === 'image/webp') {
          fileToSend = new File([webpBlob], webpFileName || toWebpFileName(formData.image.name), { type: 'image/webp' });
        } else {
          try {
            const blob = await convertImageFileToWebp(formData.image, 0.8);
            if (blob && blob.type === 'image/webp') {
              fileToSend = new File([blob], toWebpFileName(formData.image.name), { type: 'image/webp' });
              setWebpBlob(blob);
              if (webpUrl) URL.revokeObjectURL(webpUrl);
              const url = URL.createObjectURL(blob);
              setWebpUrl(url);
              setWebpFileName(toWebpFileName(formData.image.name));
            }
          } catch (_) {
            // Fallback to original file if conversion fails
          }
        }

        const imageData = new FormData();
        imageData.append('image', fileToSend);

        // or quick array dump

        const response = await limitlessImageUpload(imageData);
        console.log("response", response);
        if (response.message === "Image uploaded and saved successfully") {
          setSubmitStatus({ type: 'success', message: 'Image uploaded successfully!' });
          setFormData({ image: null });
          setImagePreview(null);
          setErrors({});
          // Keep webpUrl/webpBlob so user can still download after upload
          setImagesVersion(prev => prev + 1);
          refetchImages();
        } else {
          setSubmitStatus({ type: 'error', message: response.message || 'Upload failed.' });
        }
      });
    }
  };

  const handleImageDeleteClick = (imageKitId) => {
    if(imageKitId === undefined || imageKitId === null || imageKitId === '') {
      setImagesError('Image Kit ID is required.');
      return;
    }
    startDeleteTransition(async () => {
      try {
        const response = await deleteLimitlessImage(imageKitId);
        console.log("response", response);
        if (response?.message === "Image deleted successfully") {
          refetchImages();
        } else {
          setImagesError(response?.message || 'Failed to delete image.');
        }
      } catch (_) {
        setImagesError('Failed to delete image.');
      } 
    });
  };

  const showDeletePopup = (imageKitId) => {
    setPendingDeleteId(imageKitId);
    setDeleteDialogOpen(true);
  };

  const closeDeletePopup = () => {
    setDeleteDialogOpen(false);
    setPendingDeleteId(null);
  };

  const refetchImages = () => {
    setImagesError(null);
    startImagesTransition(() => {
      getLimitlessImages()
        .then((response) => {
          console.log("response", response);
          setImages(response?.games || []);
        })
        .catch(() => {
          setImagesError('Failed to load images.');
        });
    });
  };

  useEffect(() => {
    refetchImages();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Upload New Image</h2>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {submitStatus.type === 'success' && (
            <div className="rounded-md border border-green-200 bg-green-50 text-green-800 px-4 py-3 text-sm">
              {submitStatus.message}
            </div>
          )}
          {submitStatus.type === 'error' && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
              {submitStatus.message}
            </div>
          )}

          {/* Image Upload Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Image <span className="text-red-500">*</span>
            </label>
            
            {!imagePreview ? (
              <div className="relative">
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="image"
                  className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition hover:bg-gray-50 ${
                    errors.image ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Click to upload image</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {errors.image && (
              <p className="mt-1 text-sm text-red-500">{errors.image}</p>
            )}
            {webpUrl && (
              <div className="pt-3">
                <a
                  href={webpUrl}
                  download={webpFileName || 'image.webp'}
                  className="inline-flex items-center justify-center bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-700 transition"
                >
                  Download WebP
                </a>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className={`w-full text-white font-semibold py-3 px-6 rounded-lg focus:ring-4 focus:ring-blue-200 transition ${
                isPending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isPending ? 'Uploading…' : 'Upload Image'}
            </button>
          </div>
        </form>
      </div>
      <div className="max-w-2xl mx-auto mt-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">All Images</h2>
        {showSlowImages && isFetchingImages && (
          <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 text-yellow-800 px-4 py-3 text-sm">
            Loading images… This is taking longer than usual.
          </div>
        )}
        {imagesError ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span>{imagesError}</span>
              <button
                onClick={refetchImages}
                className="ml-4 inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-white text-xs font-semibold hover:bg-red-700 transition"
              >
                Retry
              </button>
            </div>
          </div>
        ) : isFetchingImages ? (
          <div className="flex flex-col items-center justify-center py-16">
            <svg className="animate-spin h-12 w-12 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4A8 8 0 014 12z"></path>
            </svg>
            <span className="text-blue-600 font-medium text-lg">Fetching your images...</span>
          </div>
        ) : images.length === 0 ? (
          <div className="rounded-md border border-gray-200 bg-white text-gray-700 px-4 py-6 text-sm">
            No images yet. Upload one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image._id}>
                <img
                  src={
                    image.imageUrl && (image.imageUrl.startsWith('http') || image.imageUrl.includes('data:'))
                      ? image.imageUrl
                      : `data:image/webp;base64,${image.image}`
                  }
                  alt={image.name}
                  className="w-full h-64 object-cover rounded-lg cursor-pointer"
                  title={image.title}
                  onClick={() => showDeletePopup(image.imageKitId)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
      {deleteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDeletePopup} />
          <div className="relative z-10 w-full max-w-sm rounded-lg bg-white shadow-lg">
            <div className="px-5 py-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm delete</h3>
              <p className="text-sm text-gray-600">Are you sure you want to delete this image?</p>
            </div>
            <div className="px-5 pb-4 flex items-center justify-end gap-3">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                onClick={closeDeletePopup}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white transition ${
                  isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                }`}
                onClick={() => {
                  if (!pendingDeleteId) return;
                  handleImageDeleteClick(pendingDeleteId);
                  setDeleteDialogOpen(false);
                  setPendingDeleteId(null);
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
