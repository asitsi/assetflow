'use client'
import { useState, useTransition } from 'react';
import { Upload, X } from 'lucide-react';
import { uploadGame } from '../libs/index';

const GameUpload = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    gameSlug: '',
    imageUrl: ''
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isPending, startTransition] = useTransition();
  const [submitStatus, setSubmitStatus] = useState({ type: null, message: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

      if (name === 'title' && !formData.gameSlug) {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setFormData(prev => ({
        ...prev,
        gameSlug: autoSlug
      }));
    }

    if (name === 'imageUrl') {
      const nextPreview = value.trim();
      setImagePreview(nextPreview ? nextPreview : null);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      imageUrl: ''
    }));
    setImagePreview(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.gameSlug.trim()) {
      newErrors.gameSlug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.gameSlug)) {
      newErrors.gameSlug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (!formData.imageUrl.trim()) {
      newErrors.imageUrl = 'Image URL is required';
    } else if (!/^https?:\/\/.+/i.test(formData.imageUrl)) {
      newErrors.imageUrl = 'Enter a valid http(s) URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitStatus({ type: null, message: '' });

    startTransition(() => {
      uploadGame(JSON.stringify({title: formData.title, description: formData.description, gameSlug: formData.gameSlug, imageUrl: formData.imageUrl}))
        .then((response) => {
          if (response.statusCode === 200) {
            setSubmitStatus({ type: 'success', message: 'Game uploaded successfully!' });
            setFormData({
              title: '',  
              description: '',
              gameSlug: '', 
              imageUrl: ''
            });
            setImagePreview(null);
            setErrors({});
          } else {
            setSubmitStatus({ type: 'error', message: response.message });
          }
        })
        .catch((error) => {
          const message = error?.message || 'Upload failed. Please try again.';
          setSubmitStatus({ type: 'error', message });
        });
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4 font-[Stack Sans Notch]">
      <div className="mx-auto w-full max-w-2xl">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Upload New Game</h2>
        
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
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
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Game Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter game title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="gameSlug" className="block text-sm font-medium text-gray-700 mb-2">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="gameSlug"
              name="gameSlug"
              value={formData.gameSlug}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.gameSlug ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="game-slug"
            />
            {errors.gameSlug && (
              <p className="mt-1 text-sm text-red-500">{errors.gameSlug}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              URL-friendly version of the title (lowercase, hyphens only)
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="5"
              className={`w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe your game..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Game Image URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 border rounded-lg text-black focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.imageUrl ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://example.com/your-image.png"
              inputMode="url"
            />
            {errors.imageUrl && (
              <p className="mt-1 text-sm text-red-500">{errors.imageUrl}</p>
            )}

            {imagePreview && (
              <div className="relative mt-4">
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
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className={`w-full text-white font-semibold py-3 px-6 rounded-lg focus:ring-4 focus:ring-blue-200 transition ${
                isPending ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isPending ? 'Uploading…' : 'Upload Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameUpload;